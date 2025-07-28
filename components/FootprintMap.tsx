'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  totalCount: number
  hasNextPage: boolean
}

interface FootprintMapProps {
  selectedCarId: number | null
}

export default function FootprintMap({ selectedCarId }: FootprintMapProps) {
  const [footprintData, setFootprintData] = useState<FootprintData>({ 
    cities: [], 
    positions: [],
    totalCount: 0,
    hasNextPage: true // 初始设置为true以开始加载
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const fetchControllerRef = useRef<AbortController | null>(null)
  const isLoadingRef = useRef(false) // 防止并发请求
  
  // 渐进式加载数据
  const loadFootprintData = useCallback(async () => {
    // 防止并发请求
    if (isLoadingRef.current || !footprintData.hasNextPage) {
      return
    }
    
    isLoadingRef.current = true
    
    try {
      // 取消之前的请求
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
      }

      // 创建新的AbortController
      const controller = new AbortController()
      fetchControllerRef.current = controller
      
      // 构造API URL，包含车辆ID参数
      const url = new URL('/api/footprint', window.location.origin)
      url.searchParams.set('type', 'full') // 获取完整数据包括城市和轨迹
      url.searchParams.set('page', page.toString()) // 页码
      url.searchParams.set('limit', '10000') // 每页数量
      if (selectedCarId !== null) {
        url.searchParams.set('carId', selectedCarId.toString())
      }

      const response = await fetch(url.toString(), {
        signal: controller.signal
      })
      
      if (!response.ok) {
        throw new Error('获取足迹数据失败')
      }

      const data: FootprintData = await response.json()
      
      // 更新数据
      setFootprintData(prevData => ({
        cities: page === 1 ? data.cities : prevData.cities, // 只在第一页设置城市数据
        positions: [...prevData.positions, ...data.positions], // 累积位置数据
        totalCount: data.totalCount,
        hasNextPage: data.hasNextPage
      }))
      
      // 如果还有下一页，递增页码
      if (data.hasNextPage) {
        setPage(prevPage => prevPage + 1)
      }
      
      setError(null)
    } catch (err: any) {
      // 忽略取消的请求错误
      if (err.name !== 'AbortError') {
        console.error('获取足迹数据失败:', err)
        setError('获取足迹数据失败，请重试')
      }
    } finally {
      isLoadingRef.current = false
      // 当没有下一页数据时，表示所有数据加载完成，设置loading为false
      if (!footprintData.hasNextPage) {
        setLoading(false)
      }
    }
  }, [selectedCarId, page, footprintData.hasNextPage])
  
  // 当selectedCarId变化时重置状态
  useEffect(() => {
    // 取消之前的请求
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    
    // 重置状态
    setFootprintData({
      cities: [],
      positions: [],
      totalCount: 0,
      hasNextPage: true
    });
    setPage(1);
    setLoading(true); // 确保每次重新加载都设置loading为true
    setError(null);
  }, [selectedCarId]);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 取消正在进行的请求
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, []);
  
  // 当页码或selectedCarId变化时加载数据
  useEffect(() => {
    loadFootprintData();
  }, [loadFootprintData]);
  
  // 自动加载下一批数据（如果还有数据且未在加载中）
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (footprintData.hasNextPage && !isLoadingRef.current) {
      timer = setTimeout(() => {
        loadFootprintData();
      }, 100); // 短暂延迟以避免过于频繁的请求
    } else if (!footprintData.hasNextPage && isLoadingRef.current === false && loading === true) {
      // 所有数据加载完成，设置loading为false
      setLoading(false);
    }
    
    // 清理函数
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [footprintData.hasNextPage, loadFootprintData, loading]);

  const { cities, positions, totalCount } = footprintData

  // 显示加载进度
  const progress = totalCount > 0 ? Math.round((positions.length / totalCount) * 100) : 0

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  // 在数据加载过程中显示loading状态
  if (loading && cities.length === 0 && positions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>加载足迹数据中...</span>
        </div>
      </div>
    )
  }

  // 数据完全加载后如果没有数据才显示"暂无足迹数据"
  if (!loading && cities.length === 0 && positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">暂无足迹数据</p>
        </div>
      </div>
    )
  }

  // 数据完全加载完成后再显示地图
  const isAllDataLoaded = !loading && !footprintData.hasNextPage

  return (
    <div className="space-y-6">
      {(loading || progress < 100) && (
        <div className="bg-blue-100 rounded-lg p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-blue-700">
              {loading ? "正在加载足迹数据..." : "正在加载轨迹数据..."}
            </span>
            <span className="text-sm font-medium text-blue-700">{progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            已加载 {positions.length} / {totalCount} 个轨迹点
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧城市足迹列表 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="font-medium flex items-center gap-2" style={{ fontFamily: 'AlibabaPuHuiTi, sans-serif' }}>
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
              <h3 className="font-medium flex items-center gap-2" style={{ fontFamily: 'AlibabaPuHuiTi, sans-serif' }}>
                <Route className="h-4 w-4" />
                行驶轨迹
              </h3>
            </div>
            <div className="h-96">
              {positions.length > 0 ? (
                isAllDataLoaded ? (
                  <FootprintMapCanvas positions={positions} loaded={true} />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
                    <p className="text-muted-foreground">正在加载轨迹点...</p>
                  </div>
                )
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
                  <p className="text-muted-foreground">暂无轨迹数据</p>
                </div>
              )}
            </div>
          </div>
          
          {positions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2" style={{ fontFamily: 'AlibabaPuHuiTi, sans-serif' }}>
                  <Route className="h-4 w-4" />
                  轨迹统计
                </h3>
                <div className="space-y-1">
                  <p className="text-sm">总行程数: {new Set(positions.map(p => p.drive_id)).size}</p>
                  <p className="text-sm">轨迹点数: {positions.length} / {totalCount}</p>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2" style={{ fontFamily: 'AlibabaPuHuiTi, sans-serif' }}>
                  <MapPin className="h-4 w-4" />
                  覆盖范围
                </h3>
                <div className="space-y-1">
                  <p className="text-sm">访问国家: {new Set(cities.map(c => c.province)).size}</p>
                  <p className="text-sm">访问城市: {cities.length}</p>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2" style={{ fontFamily: 'AlibabaPuHuiTi, sans-serif' }}>
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
          )}
        </div>
      </div>
    </div>
  )
}