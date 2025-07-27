'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { formatDuration, calculateDistance, formatDateWithTimezone, generateTripTitleSync } from '@/lib/utils'
import { Car } from 'lucide-react'
import type { Trip } from '@/lib/database'

// 安全的数字格式化函数
function safeToFixed(value: any, digits: number = 1): string {
  const num = Number(value)
  return !isNaN(num) && isFinite(num) ? num.toFixed(digits) : 'N/A'
}

// 计算电量消耗效率
function calculateEfficiency(energyConsumed: number, distance: number): { diff: number; isEfficient: boolean } {
  // 各自先保留一位小数，再做减法
  const roundedEnergyConsumed = Math.round(energyConsumed * 10) / 10
  const roundedDistance = Math.round(distance * 10) / 10
  const diff = roundedEnergyConsumed - roundedDistance
  
  return {
    diff: Math.abs(diff),
    isEfficient: diff <= 0 // 电量消耗小于等于行驶距离则为高效
  }
}

interface TripCardProps {
  trip: Trip
}

export default function TripCard({ trip }: TripCardProps) {
  // 直接使用API返回的标题，应该是包含POI信息的
  const tripTitle = trip.trip_title || '未知行程'
  
  // 添加调试信息（仅在开发环境中）
  if (process.env.NODE_ENV === 'development') {
    console.log(`Trip ${trip.id} title:`, tripTitle);
    console.log(`Start detailed address:`, trip.start_detailed_address);
    console.log(`End detailed address:`, trip.end_detailed_address);
  }

  const distance = trip.distance || calculateDistance(trip.start_km, trip.end_km)
  
  // 计算电量消耗
  const energyConsumed = trip.start_rated_range_km && trip.end_rated_range_km
    ? trip.start_rated_range_km - trip.end_rated_range_km
    : null
  
  // 计算效率
  const efficiency = distance && energyConsumed 
    ? calculateEfficiency(energyConsumed, distance)
    : null

  // 格式化时间范围
  const formatTimeRange = () => {
    if (!trip.start_date) return 'N/A'
    
    const startDate = formatDateWithTimezone(trip.start_date)
    const startTime = format(startDate, 'MM月dd日 HH:mm', { locale: zhCN })
    
    if (trip.end_date) {
      const endDate = formatDateWithTimezone(trip.end_date)
      const endTime = format(endDate, 'HH:mm', { locale: zhCN })
      
      // 如果是同一天，只显示结束时间
      if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
        return `${startTime} - ${endTime}`
      } else {
        // 跨天的情况
        const endDateStr = format(endDate, 'MM月dd日 HH:mm', { locale: zhCN })
        return `${startTime} - ${endDateStr}`
      }
    }
    
    return startTime
  }

  return (
    <Link href={`/trip/${trip.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="space-y-2">
            <CardTitle className="text-base md:text-lg leading-tight">
              {tripTitle}
            </CardTitle>
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {formatTimeRange()}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* 第一行：行驶时间和最高速度 */}
            <div>
              <p className="text-muted-foreground text-xs">行驶时间</p>
              <p className="font-medium">
                {formatDuration(trip.duration_min)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">最高速度</p>
              <p className="font-medium">
                {trip.speed_max ? `${trip.speed_max} km/h` : 'N/A'}
              </p>
            </div>
            
            {/* 第二行：行驶距离和电量消耗（含效率） */}
            <div>
              <p className="text-muted-foreground text-xs">行驶距离</p>
              <p className="font-medium">
                {distance ? `${safeToFixed(distance, 1)} km` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">电量消耗</p>
              <div className="font-medium">
                {energyConsumed !== null ? (
                  <div className="flex items-center gap-1">
                    <span>{safeToFixed(energyConsumed, 1)} km</span>
                    {efficiency && (
                      <span 
                        className={`text-xs ${
                          efficiency.isEfficient ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        ({efficiency.isEfficient ? '-' : '+'}{safeToFixed(efficiency.diff)}km)
                      </span>
                    )}
                  </div>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
} 