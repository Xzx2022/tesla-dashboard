import { Pool, PoolClient } from 'pg'
import { getAddressesByCoordinatesBatch } from './amap'
import { simplifyAddress } from './utils'

// 数据库连接配置
let pool: Pool;

// 只在运行时创建数据库连接池，构建时跳过
if (process.env.SKIP_DB_CONNECTION !== 'true') {
  pool = new Pool({
    user: process.env.DB_USER || 'teslamate',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'teslamate',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
  });
} else {
  // 构建时使用空对象
  pool = {} as Pool;
}

export { pool }

// 时区配置
export const TIMEZONE = process.env.TZ || process.env.TIMEZONE || 'Asia/Shanghai'

// 行程数据类型定义 (基于TeslaMate的drives表)
export interface Trip {
  id: number
  start_date: Date
  end_date: Date | null
  start_address_id: number | null
  end_address_id: number | null
  start_geofence_id: number | null
  end_geofence_id: number | null
  start_km: number | null
  end_km: number | null
  start_address: string | null
  end_address: string | null
  distance: number | null
  duration_min: number | null
  outside_temp_avg: number | null
  inside_temp_avg: number | null
  speed_max: number | null
  power_max: number | null
  power_min: number | null
  start_ideal_range_km: number | null
  end_ideal_range_km: number | null
  start_rated_range_km: number | null
  end_rated_range_km: number | null
  car_id: number
  // 新增坐标字段
  start_latitude: number | null
  start_longitude: number | null
  end_latitude: number | null
  end_longitude: number | null
  // 新增详细地址字段（从高德地图API批量获取）
  start_detailed_address?: string | null
  end_detailed_address?: string | null
  trip_title?: string | null
}

// 位置数据类型定义
export interface Position {
  id: number
  date: Date
  latitude: number
  longitude: number
  speed: number | null
  power: number | null
  odometer: number | null
  ideal_battery_range_km: number | null
  battery_level: number | null
  outside_temp: number | null
  inside_temp: number | null
  drive_id: number
}

// 分页查询结果类型
export interface PaginatedTrips {
  trips: Trip[]
  hasMore: boolean
  total: number
}

// 获取行程列表 (使用TeslaMate的drives表) - 保持原有功能
export async function getTrips(): Promise<Trip[]> {
  // 构建时返回空数组
  if (process.env.SKIP_DB_CONNECTION === 'true') {
    return [];
  }
  
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        d.id,
        d.start_date,
        d.end_date,
        d.start_address_id,
        d.end_address_id,
        d.start_geofence_id,
        d.end_geofence_id,
        d.start_km,
        d.end_km,
        d.distance,
        d.duration_min,
        d.outside_temp_avg,
        d.inside_temp_avg,
        d.speed_max,
        d.power_max,
        d.power_min,
        d.start_ideal_range_km,
        d.end_ideal_range_km,
        d.start_rated_range_km,
        d.end_rated_range_km,
        d.car_id,
        COALESCE(start_geofence.name, 
          CONCAT_WS(', ', 
            COALESCE(start_address.name, 
              NULLIF(CONCAT_WS(' ', start_address.road, start_address.house_number), '')
            ), 
            start_address.city
          )
        ) AS start_address,
        COALESCE(end_geofence.name, 
          CONCAT_WS(', ', 
            COALESCE(end_address.name, 
              NULLIF(CONCAT_WS(' ', end_address.road, end_address.house_number), '')
            ), 
            end_address.city
          )
        ) AS end_address,
        -- 获取起始坐标（行程第一个位置点）
        start_pos.latitude AS start_latitude,
        start_pos.longitude AS start_longitude,
        -- 获取结束坐标（行程最后一个位置点）
        end_pos.latitude AS end_latitude,
        end_pos.longitude AS end_longitude
      FROM drives d
      LEFT JOIN addresses start_address ON d.start_address_id = start_address.id
      LEFT JOIN addresses end_address ON d.end_address_id = end_address.id
      LEFT JOIN geofences start_geofence ON d.start_geofence_id = start_geofence.id
      LEFT JOIN geofences end_geofence ON d.end_geofence_id = end_geofence.id
      -- 获取起始位置坐标
      LEFT JOIN LATERAL (
        SELECT latitude, longitude 
        FROM positions 
        WHERE drive_id = d.id 
        ORDER BY date ASC 
        LIMIT 1
      ) start_pos ON true
      -- 获取结束位置坐标
      LEFT JOIN LATERAL (
        SELECT latitude, longitude 
        FROM positions 
        WHERE drive_id = d.id 
        ORDER BY date DESC 
        LIMIT 1
      ) end_pos ON true
      WHERE d.end_date IS NOT NULL
      ORDER BY d.start_date DESC
      LIMIT 50
    `)
    return result.rows
  } finally {
    client.release()
  }
}

// 分页获取行程列表
export async function getTripsPaginated(page: number = 1, limit: number = 10): Promise<PaginatedTrips> {
  // 构建时返回空数据
  if (process.env.SKIP_DB_CONNECTION === 'true') {
    return {
      trips: [],
      hasMore: false,
      total: 0
    };
  }
  
  const client = await pool.connect()
  try {
    const offset = (page - 1) * limit
    
    // 获取总数
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM drives d
      WHERE d.end_date IS NOT NULL
    `)
    const total = parseInt(countResult.rows[0].total)
    
    // 获取分页数据
    const result = await client.query(`
      SELECT 
        d.id,
        d.start_date,
        d.end_date,
        d.start_address_id,
        d.end_address_id,
        d.start_geofence_id,
        d.end_geofence_id,
        d.start_km,
        d.end_km,
        d.distance,
        d.duration_min,
        d.outside_temp_avg,
        d.inside_temp_avg,
        d.speed_max,
        d.power_max,
        d.power_min,
        d.start_ideal_range_km,
        d.end_ideal_range_km,
        d.start_rated_range_km,
        d.end_rated_range_km,
        d.car_id,
        COALESCE(start_geofence.name, 
          CONCAT_WS(', ', 
            COALESCE(start_address.name, 
              NULLIF(CONCAT_WS(' ', start_address.road, start_address.house_number), '')
            ), 
            start_address.city
          )
        ) AS start_address,
        COALESCE(end_geofence.name, 
          CONCAT_WS(', ', 
            COALESCE(end_address.name, 
              NULLIF(CONCAT_WS(' ', end_address.road, end_address.house_number), '')
            ), 
            end_address.city
          )
        ) AS end_address,
        -- 获取起始坐标（行程第一个位置点）
        start_pos.latitude AS start_latitude,
        start_pos.longitude AS start_longitude,
        -- 获取结束坐标（行程最后一个位置点）
        end_pos.latitude AS end_latitude,
        end_pos.longitude AS end_longitude
      FROM drives d
      LEFT JOIN addresses start_address ON d.start_address_id = start_address.id
      LEFT JOIN addresses end_address ON d.end_address_id = end_address.id
      LEFT JOIN geofences start_geofence ON d.start_geofence_id = start_geofence.id
      LEFT JOIN geofences end_geofence ON d.end_geofence_id = end_geofence.id
      -- 获取起始位置坐标
      LEFT JOIN LATERAL (
        SELECT latitude, longitude 
        FROM positions 
        WHERE drive_id = d.id 
        ORDER BY date ASC 
        LIMIT 1
      ) start_pos ON true
      -- 获取结束位置坐标
      LEFT JOIN LATERAL (
        SELECT latitude, longitude 
        FROM positions 
        WHERE drive_id = d.id 
        ORDER BY date DESC 
        LIMIT 1
      ) end_pos ON true
      WHERE d.end_date IS NOT NULL
      ORDER BY d.start_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])
    
    const trips: Trip[] = result.rows
    
    // 批量获取详细地址
    if (trips.length > 0) {
      try {
        // 准备坐标数据（起始和结束坐标）
        const coordinates: Array<{ longitude: number | string; latitude: number | string }> = []
        const coordinateMap: Array<{ tripIndex: number; type: 'start' | 'end' }> = []
        
        trips.forEach((trip, index) => {
          // 添加起始坐标
          if (trip.start_longitude !== null && trip.start_latitude !== null) {
            coordinates.push({
              longitude: trip.start_longitude,
              latitude: trip.start_latitude
            })
            coordinateMap.push({ tripIndex: index, type: 'start' })
          }
          
          // 添加结束坐标
          if (trip.end_longitude !== null && trip.end_latitude !== null) {
            coordinates.push({
              longitude: trip.end_longitude,
              latitude: trip.end_latitude
            })
            coordinateMap.push({ tripIndex: index, type: 'end' })
          }
        })
        
        // 批量获取地址
        if (coordinates.length > 0) {
          const addresses = await getAddressesByCoordinatesBatch(coordinates)
          
          // 将地址分配回对应的行程
          addresses.forEach((address, index) => {
            const mapping = coordinateMap[index]
            if (mapping) {
              const trip = trips[mapping.tripIndex]
              if (mapping.type === 'start') {
                trip.start_detailed_address = address
              } else {
                trip.end_detailed_address = address
              }
            }
          })
        }
        
        // 生成行程标题
        trips.forEach(trip => {
          const startAddr = trip.start_detailed_address || simplifyAddress(trip.start_address)
          const endAddr = trip.end_detailed_address || simplifyAddress(trip.end_address)
          
          if (startAddr === '未知位置' && endAddr === '未知位置') {
            trip.trip_title = '未知行程'
          } else {
            trip.trip_title = `${startAddr} → ${endAddr}`
          }
        })
        
      } catch (error) {
        console.error('批量获取地址失败:', error)
        // 如果获取详细地址失败，使用数据库地址生成标题
        trips.forEach(trip => {
          const startAddr = simplifyAddress(trip.start_address)
          const endAddr = simplifyAddress(trip.end_address)
          trip.trip_title = `${startAddr} → ${endAddr}`
        })
      }
    }
    
    const hasMore = offset + limit < total
    
    return {
      trips,
      hasMore,
      total
    }
  } finally {
    client.release()
  }
}

// 根据ID获取行程详情
export async function getTripById(id: number): Promise<Trip | null> {
  // 构建时返回null
  if (process.env.SKIP_DB_CONNECTION === 'true') {
    return null;
  }
  
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        d.id,
        d.start_date,
        d.end_date,
        d.start_address_id,
        d.end_address_id,
        d.start_geofence_id,
        d.end_geofence_id,
        d.start_km,
        d.end_km,
        d.distance,
        d.duration_min,
        d.outside_temp_avg,
        d.inside_temp_avg,
        d.speed_max,
        d.power_max,
        d.power_min,
        d.start_ideal_range_km,
        d.end_ideal_range_km,
        d.start_rated_range_km,
        d.end_rated_range_km,
        d.car_id,
        COALESCE(start_geofence.name, 
          CONCAT_WS(', ', 
            COALESCE(start_address.name, 
              NULLIF(CONCAT_WS(' ', start_address.road, start_address.house_number), '')
            ), 
            start_address.city
          )
        ) AS start_address,
        COALESCE(end_geofence.name, 
          CONCAT_WS(', ', 
            COALESCE(end_address.name, 
              NULLIF(CONCAT_WS(' ', end_address.road, end_address.house_number), '')
            ), 
            end_address.city
          )
        ) AS end_address,
        -- 获取起始坐标（行程第一个位置点）
        start_pos.latitude AS start_latitude,
        start_pos.longitude AS start_longitude,
        -- 获取结束坐标（行程最后一个位置点）
        end_pos.latitude AS end_latitude,
        end_pos.longitude AS end_longitude
      FROM drives d
      LEFT JOIN addresses start_address ON d.start_address_id = start_address.id
      LEFT JOIN addresses end_address ON d.end_address_id = end_address.id
      LEFT JOIN geofences start_geofence ON d.start_geofence_id = start_geofence.id
      LEFT JOIN geofences end_geofence ON d.end_geofence_id = end_geofence.id
      -- 获取起始位置坐标
      LEFT JOIN LATERAL (
        SELECT latitude, longitude 
        FROM positions 
        WHERE drive_id = d.id 
        ORDER BY date ASC 
        LIMIT 1
      ) start_pos ON true
      -- 获取结束位置坐标
      LEFT JOIN LATERAL (
        SELECT latitude, longitude 
        FROM positions 
        WHERE drive_id = d.id 
        ORDER BY date DESC 
        LIMIT 1
      ) end_pos ON true
      WHERE d.id = $1
    `, [id])
    return result.rows[0] || null
  } finally {
    client.release()
  }
}

// 获取行程的位置数据（用于绘制轨迹）
export async function getTripPositions(tripId: number): Promise<Position[]> {
  // 构建时返回空数组
  if (process.env.SKIP_DB_CONNECTION === 'true') {
    return [];
  }
  
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        id, 
        date, 
        latitude, longitude, speed, power, 
        odometer, ideal_battery_range_km, battery_level,
        outside_temp, inside_temp, drive_id
      FROM positions 
      WHERE drive_id = $1 
      ORDER BY date ASC
    `, [tripId])
    return result.rows
  } finally {
    client.release()
  }
}