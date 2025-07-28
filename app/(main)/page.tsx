'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, Route } from 'lucide-react'
import TripCard from '@/components/TripCard'
import EnergyChangeCard from '@/components/EnergyChangeCard'
import FootprintMap from '@/components/FootprintMap'
import type { Trip } from '@/lib/database'

interface PaginatedTrips {
  trips: Trip[]
  hasMore: boolean
  total: number
}

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'trips' | 'footprint'>('trips')

  // 获取行程数据
  const fetchTrips = useCallback(async (pageNum: number, isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      // 构造API URL，包含车辆ID参数
      const url = new URL('/api/trips', window.location.origin)
      url.searchParams.set('page', pageNum.toString())
      url.searchParams.set('limit', '10')
      if (selectedCarId !== null) {
        url.searchParams.set('carId', selectedCarId.toString())
      }

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error('获取数据失败')
      }

      const data: PaginatedTrips = await response.json()
      
      if (isLoadMore) {
        setTrips(prev => [...prev, ...data.trips])
      } else {
        setTrips(data.trips)
      }
      
      setHasMore(data.hasMore)
      setError(null)
    } catch (err) {
      console.error('获取行程数据失败:', err)
      setError('获取行程数据失败，请重试')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedCarId])

  // 监听车辆变化事件
  useEffect(() => {
    const handleVehicleChange = (event: CustomEvent) => {
      setSelectedCarId(event.detail)
    }

    // 从localStorage获取初始选中的车辆
    if (typeof window !== 'undefined') {
      const savedCarId = window.localStorage.getItem('selectedCarId')
      if (savedCarId) {
        setSelectedCarId(parseInt(savedCarId))
      }
    }

    window.addEventListener('vehicleChanged', handleVehicleChange as EventListener)
    return () => {
      window.removeEventListener('vehicleChanged', handleVehicleChange as EventListener)
    }
  }, [])

  // 当选中的车辆改变时，重新加载行程数据
  useEffect(() => {
    if (selectedCarId !== null) {
      setPage(1)
      setHasMore(true)
      fetchTrips(1)
    }
  }, [selectedCarId, fetchTrips])

  // 加载更多
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchTrips(nextPage, true)
    }
  }, [fetchTrips, hasMore, loadingMore, page])

  // 滚动监听
  useEffect(() => {
    // 只在行程列表标签页激活时才监听滚动事件
    if (activeTab !== 'trips') return;

    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= 
        document.documentElement.offsetHeight - 1000 // 提前1000px开始加载
      ) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore, activeTab])

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">行程记录</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: 'AlibabaPuHuiTi, sans-serif' }}>行程记录</h2>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'trips' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('trips')}
            className="flex items-center gap-2"
          >
            <Route className="h-4 w-4" />
            行程列表
          </Button>
          <Button
            variant={activeTab === 'footprint' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('footprint')}
            className="flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            足迹地图
          </Button>
        </div>
      </div>
      
      {activeTab === 'trips' ? (
        loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>加载行程数据中...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid">
              {trips.map((trip, index) => (
                <div key={trip.id}>
                  <TripCard trip={trip} />
                  {/* 在两个行程之间插入电耗变化卡片 */}
                  {index < trips.length - 1 && (
                    <EnergyChangeCard 
                      prevTrip={trips[index + 1]} 
                      nextTrip={trip} 
                    />
                  )}
                </div>
              ))}
            </div>

            {/* 加载更多指示器 */}
            {loadingMore && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">加载更多行程...</span>
                </div>
              </div>
            )}

            {/* 没有更多数据提示 */}
            {!hasMore && trips.length > 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">已显示全部行程数据</p>
              </div>
            )}

            {/* 空状态 */}
            {trips.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">暂无行程数据</p>
              </div>
            )}
          </>
        )
      ) : (
        <FootprintMap selectedCarId={selectedCarId} />
      )}
    </div>
  )
} 