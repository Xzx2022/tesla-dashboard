'use client'

import { useState, useEffect } from 'react'
import { MapPin, Calendar, Route, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import FootprintMapCanvas from '@/components/FootprintMapCanvas'
import { Position } from '@/lib/database'

interface CityFootprint {
  city: string
  province: string
  latitude: number
  longitude: number
  visit_count: number
  first_visit: Date
  last_visit: Date
}

interface FootprintData {
  cities: CityFootprint[]
  positions: Position[]
}

interface FootprintMapProps {
  selectedCarId: number | null
}

export default function FootprintMap({ selectedCarId }: FootprintMapProps) {
  const [footprintData, setFootprintData] = useState<FootprintData>({ cities: [], positions: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFootprints = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 构造API URL，包含车辆ID参数
        const url = new URL('/api/footprint', window.location.origin)
        url.searchParams.set('type', 'full') // 获取完整数据包括城市和轨迹
        if (selectedCarId !== null) {
          url.searchParams.set('carId', selectedCarId.toString())
        }

        const response = await fetch(url.toString())
        
        if (!response.ok) {
          throw new Error('获取足迹数据失败')
        }

        const data: FootprintData = await response.json()
        setFootprintData(data)
      } catch (err) {
        console.error('获取足迹数据失败:', err)
        setError('获取足迹数据失败，请重试')
      } finally {
        setLoading(false)
      }
    }

    fetchFootprints()
  }, [selectedCarId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>加载足迹数据中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  const { cities, positions } = footprintData

  if (cities.length === 0 && positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">暂无足迹数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧城市足迹列表 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                城市足迹 ({cities.length})
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cities.map((footprint) => (
                  <div 
                    key={`${footprint.city}-${footprint.province}`} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{footprint.city}</h4>
                        {footprint.province && (
                          <p className="text-sm text-muted-foreground">{footprint.province}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{footprint.visit_count}次</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(footprint.first_visit), 'yy-MM-dd', { locale: zhCN })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧地图和统计信息 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="font-medium flex items-center gap-2">
                <Route className="h-4 w-4" />
                行驶轨迹
              </h3>
            </div>
            <div className="h-96">
              <FootprintMapCanvas positions={positions} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Route className="h-4 w-4" />
                轨迹统计
              </h3>
              <div className="space-y-1">
                <p className="text-sm">总行程数: {new Set(positions.map(p => p.drive_id)).size}</p>
                <p className="text-sm">轨迹点数: {positions.length}</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                覆盖范围
              </h3>
              <div className="space-y-1">
                <p className="text-sm">访问国家: {new Set(cities.map(c => c.province)).size}</p>
                <p className="text-sm">访问城市: {cities.length}</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                时间跨度
              </h3>
              <div className="space-y-1">
                {cities.length > 0 && (
                  <>
                    <p className="text-sm">
                      首次出行: {format(new Date(cities[cities.length - 1].first_visit), 'yyyy-MM-dd', { locale: zhCN })}
                    </p>
                    <p className="text-sm">
                      最近出行: {format(new Date(cities[0].last_visit), 'yyyy-MM-dd', { locale: zhCN })}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}