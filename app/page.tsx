'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import TripCard from '@/components/TripCard'
import type { Trip } from '@/lib/database'

interface PaginatedTrips {
  trips: Trip[]
  hasMore: boolean
  total: number
}

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取行程数据
  const fetchTrips = useCallback(async (pageNum: number, isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const response = await fetch(`/api/trips?page=${pageNum}&limit=10`)
      
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
  }, [])

  // 初始加载
  useEffect(() => {
    fetchTrips(1)
  }, [fetchTrips])

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
  }, [loadMore])

  // 刷新数据
  const refreshData = () => {
    setPage(1)
    setHasMore(true)
    fetchTrips(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>加载行程数据中...</span>
        </div>
      </div>
    )
  }

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
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">行程记录</h2>
      </div>
      
      <div className="grid gap-4">
        {trips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
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
    </div>
  )
} 