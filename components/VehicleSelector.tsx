'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Car } from '@/lib/car-info'

export default function VehicleSelector() {
  const [cars, setCars] = useState<Car[]>([])
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // 获取车辆列表
  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/vehicles')
        
        if (!response.ok) {
          throw new Error('获取车辆列表失败')
        }

        const data: Car[] = await response.json()
        setCars(data)
        
        // 如果没有选择车辆且有车辆数据，选择第一辆车
        if (selectedCarId === null && data.length > 0) {
          setSelectedCarId(data[0].id)
          // 保存选中的车辆ID到全局状态或localStorage
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('selectedCarId', data[0].id.toString())
          }
        }
      } catch (err) {
        console.error('获取车辆列表失败:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCars()
  }, [selectedCarId])

  // 处理车辆选择变化
  const handleCarChange = (carId: string) => {
    const id = parseInt(carId)
    setSelectedCarId(id)
    // 保存选中的车辆ID到localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selectedCarId', id.toString())
    }
    // 发送自定义事件通知其他组件车辆已更改
    window.dispatchEvent(new CustomEvent('vehicleChanged', { detail: id }))
  }

  if (loading) {
    return (
      <div className="w-[180px]">
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="加载中..." />
          </SelectTrigger>
        </Select>
      </div>
    )
  }

  if (cars.length <= 1 && process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="w-full sm:w-[180px]">
      <Select 
        value={selectedCarId?.toString() || ''} 
        onValueChange={handleCarChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="选择车辆" />
        </SelectTrigger>
        <SelectContent>
          {cars.map((car) => (
            <SelectItem key={car.id} value={car.id.toString()}>
              {car.name || `车辆 ${car.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}