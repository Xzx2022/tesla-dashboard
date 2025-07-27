import { NextResponse } from 'next/server'
import { getTripsPaginated } from '@/lib/database'

export async function GET() {
  try {
    console.log('调试API: 正在获取行程数据...');
    
    // 获取一个行程进行调试
    const tripsData = await getTripsPaginated(1, 1);
    
    if (tripsData.trips.length > 0) {
      const trip = tripsData.trips[0];
      console.log('\n=== 行程基本信息 ===');
      console.log('ID:', trip.id);
      console.log('起始地址(数据库):', trip.start_address);
      console.log('结束地址(数据库):', trip.end_address);
      console.log('起始坐标:', trip.start_longitude, ',', trip.start_latitude);
      console.log('结束坐标:', trip.end_longitude, ',', trip.end_latitude);
      
      console.log('\n=== 详细地址信息 ===');
      console.log('起始详细地址:', JSON.stringify(trip.start_detailed_address));
      console.log('结束详细地址:', JSON.stringify(trip.end_detailed_address));
      console.log('行程标题:', trip.trip_title);
      
      return NextResponse.json({
        success: true,
        trip: {
          id: trip.id,
          start_address: trip.start_address,
          end_address: trip.end_address,
          start_longitude: trip.start_longitude,
          start_latitude: trip.start_latitude,
          end_longitude: trip.end_longitude,
          end_latitude: trip.end_latitude,
          start_detailed_address: trip.start_detailed_address,
          end_detailed_address: trip.end_detailed_address,
          trip_title: trip.trip_title
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '没有找到行程数据'
      });
    }
  } catch (error: any) {
    console.error('调试API失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}