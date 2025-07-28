'use client'

import type { Trip } from '@/lib/database'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { formatDateWithTimezone } from '@/lib/utils'
import { Battery, BatteryMedium, Zap, Minus } from 'lucide-react'

interface EnergyChangeCardProps {
  prevTrip: Trip  // 时间上较早的行程
  nextTrip: Trip  // 时间上较晚的行程
}

// 安全的数字格式化函数
function safeToFixed(value: any, digits: number = 1): string {
  const num = Number(value)
  return !isNaN(num) && isFinite(num) ? num.toFixed(digits) : 'N/A'
}

export default function EnergyChangeCard({ prevTrip, nextTrip }: EnergyChangeCardProps) {
  // 计算两个行程之间的电耗变化
  // prevTrip.end_rated_range_km - nextTrip.start_rated_range_km
  const energyChange = 
    (prevTrip.end_rated_range_km !== null && nextTrip.start_rated_range_km !== null) ?
    prevTrip.end_rated_range_km - nextTrip.start_rated_range_km : null
  
  // 计算时间间隔
  let timeInterval = ''
  
  if (prevTrip.end_date && nextTrip.start_date) {
    // 使用与TripCard相同的时区处理方法
    const prevEndDate = formatDateWithTimezone(prevTrip.end_date);
    const nextStartDate = formatDateWithTimezone(nextTrip.start_date);
    
    const interval = nextStartDate.getTime() - prevEndDate.getTime()
    const hours = Math.floor(interval / (1000 * 60 * 60))
    const minutes = Math.floor((interval % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      timeInterval = `${hours}小时${minutes}分钟`
    } else {
      timeInterval = `${minutes}分钟`
    }
  }
  
  // 确定变化类型 
  // 理解逻辑：
  // 1. prevTrip.end_rated_range_km 是前一个行程结束时的续航
  // 2. nextTrip.start_rated_range_km 是后一个行程开始时的续航
  // 3. energyChange = prev - next
  // 4. 如果energyChange > 0，说明续航减少了，是静息损耗
  // 5. 如果energyChange < 0，说明续航增加了，是充电
  let changeType = ''
  let changeColor = ''
  let IconComponent = Minus
  
  if (energyChange !== null) {
    if (energyChange > 0) {
      changeType = '静息损耗'
      changeColor = 'text-red-500'
      IconComponent = BatteryMedium
    } else if (energyChange < 0) {
      changeType = '充电'
      changeColor = 'text-green-500'
      IconComponent = Zap
    } else {
      changeType = '无变化'
      changeColor = 'text-gray-500'
      IconComponent = Battery
    }
  }

  return (
    <div className="flex justify-center my-1 px-4">
      <div className="flex items-center gap-2 text-xs bg-muted/20 rounded-full py-1 px-2.5 w-fit">
        <div className="flex items-center gap-1">
          <IconComponent className={`h-3.5 w-3.5 ${changeColor}`} />
          <span className="font-medium">{changeType}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {energyChange !== null ? (
            <span className={`font-medium ${changeColor}`}>
              {energyChange > 0 ? '-' : '+'}{safeToFixed(Math.abs(energyChange))} km
            </span>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          )}
          
          <div className="text-[10px] text-muted-foreground flex flex-col items-end">
            <span>{timeInterval}</span>
            {/* 显示下一次行程开始前的剩余续航里程 */}
            {nextTrip.start_rated_range_km !== null && (
              <span>剩余 {safeToFixed(nextTrip.start_rated_range_km)} km</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}