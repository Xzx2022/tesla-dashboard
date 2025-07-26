import { NextRequest, NextResponse } from 'next/server'
import { getTripsPaginated } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // 验证参数
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: '无效的分页参数' },
        { status: 400 }
      )
    }

    const result = await getTripsPaginated(page, limit)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('获取行程数据失败:', error)
    return NextResponse.json(
      { error: '获取行程数据失败' },
      { status: 500 }
    )
  }
} 