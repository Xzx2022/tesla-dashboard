import { NextResponse } from 'next/server'
import { getAllCars } from '@/lib/car-info'

export async function GET() {
  try {
    const cars = await getAllCars()
    console.log('获取到的车辆列表:', cars);
    return NextResponse.json(cars)
  } catch (error: any) {
    console.error('获取车辆列表失败:', error)
    return NextResponse.json(
      { error: '获取车辆列表失败', message: error.message },
      { status: 500 }
    )
  }
}