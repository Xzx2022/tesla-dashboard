 'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Position } from '@/lib/database'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { formatDateWithTimezone } from '@/lib/utils'

interface TripChartsProps {
  positions: Position[]
}

export default function TripCharts({ positions }: TripChartsProps) {
  if (positions.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        暂无数据
      </div>
    )
  }

  // 处理数据，每隔几个点取样以避免图表过于密集
  const sampleRate = Math.max(1, Math.floor(positions.length / 100))
  const chartData = positions
    .filter((_, index) => index % sampleRate === 0)
    .map((position, index) => ({
      time: format(formatDateWithTimezone(position.date), 'HH:mm', { locale: zhCN }),
      originalTime: position.date,
      speed: position.speed || 0,
      batteryLevel: position.battery_level || 0,
      power: position.power || null,
      index: index
    }))

  // 自定义Tooltip组件
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
              {entry.dataKey === 'speed' && ' km/h'}
              {entry.dataKey === 'batteryLevel' && '%'}
              {entry.dataKey === 'power' && ' kW'}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* 速度图表 */}
      <div>
        <h4 className="text-base md:text-lg font-semibold mb-4">行驶速度</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: '速度 (km/h)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="speed" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={false}
              name="速度"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 电量图表 */}
      <div>
        <h4 className="text-base md:text-lg font-semibold mb-4">电量变化</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: '电量 (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="batteryLevel" 
              stroke="#16a34a" 
              strokeWidth={2}
              dot={false}
              name="电量"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 功率图表 */}
      {chartData.some(d => d.power !== null) && (
        <div>
          <h4 className="text-base md:text-lg font-semibold mb-4">功率变化</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: '功率 (kW)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="power" 
                stroke="#7c3aed" 
                strokeWidth={2}
                dot={false}
                name="功率"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}