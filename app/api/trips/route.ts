import { NextResponse } from 'next/server'
import { getTripsPaginated } from '@/lib/database'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  carId: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // 验证查询参数
    const parsed = querySchema.parse(queryParams)
    
    const page = parseInt(parsed.page || '1')
    const limit = parseInt(parsed.limit || '10')
    const carId = parsed.carId ? parseInt(parsed.carId) : undefined
    
    console.log('API请求参数:', { page, limit, carId });
    
    // 获取行程数据
    const tripsData = await getTripsPaginated(page, limit, carId)
    
    return NextResponse.json(tripsData)
  } catch (error: any) {
    console.error('获取行程列表失败:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '获取行程列表失败', message: error.message },
      { status: 500 }
    )
  }
}