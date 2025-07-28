import { NextResponse } from 'next/server'
import { pool } from '@/lib/database'
import { Position } from '@/lib/database'

// 城市足迹数据接口
interface CityFootprint {
  city: string
  province: string
  latitude: number
  longitude: number
  visit_count: number
  first_visit: Date
  last_visit: Date
}

// 足迹数据响应接口
interface FootprintResponse {
  cities: CityFootprint[]
  positions: Position[]
  totalCount: number // 添加总数量字段用于分页
  hasNextPage: boolean // 是否还有下一页
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carId = searchParams.get('carId')
    const type = searchParams.get('type') || 'cities' // 默认返回城市数据
    const page = parseInt(searchParams.get('page') || '1') // 页码，默认第1页
    const limit = parseInt(searchParams.get('limit') || '10000') // 每页数量，默认2000条
    const offset = (page - 1) * limit // 偏移量
    
    // 只在运行时执行数据库查询，构建时跳过
    if (process.env.SKIP_DB_CONNECTION === 'true') {
      return NextResponse.json(type === 'cities' ? [] : { cities: [], positions: [], totalCount: 0, hasNextPage: false })
    }
    
    const client = await pool.connect()
    
    try {
      if (type === 'cities') {
        // 查询所有行程中的城市足迹数据
        let cityQuery = `
          WITH city_visits AS (
            SELECT 
              CASE 
                -- 优先从 display_name 中提取城市名（包含"市"字的部分）
                WHEN a.display_name IS NOT NULL AND a.display_name != '' THEN 
                  COALESCE(
                    -- 尝试从 display_name 中提取包含"市"的部分
                    (SELECT part FROM unnest(string_to_array(a.display_name, ',')) AS part 
                     WHERE part LIKE '%市' 
                     ORDER BY array_position(string_to_array(a.display_name, ','), part) DESC 
                     LIMIT 1),
                    -- 备选方案：使用倒数第三个部分（通常是城市）
                    split_part(a.display_name, ',', GREATEST(1, array_length(string_to_array(a.display_name, ','), 1) - 2)),
                    -- 再备选：使用 state 字段
                    a.state,
                    -- 最后使用 geofence 名称或 city 字段（虽然 city 是区，但作为最后备选）
                    COALESCE(g.name, a.city)
                  )
                -- 如果没有 display_name，则使用其他字段
                ELSE COALESCE(a.state, g.name, a.city)
              END AS city,
              COALESCE(a.country, '') AS province,
              AVG(p.latitude) AS avg_latitude,
              AVG(p.longitude) AS avg_longitude,
              COUNT(DISTINCT d.id) AS visit_count,
              MIN(d.start_date) AS first_visit,
              MAX(d.start_date) AS last_visit
            FROM drives d
            LEFT JOIN addresses a ON d.start_address_id = a.id
            LEFT JOIN geofences g ON d.start_geofence_id = g.id
            LEFT JOIN LATERAL (
              SELECT latitude, longitude 
              FROM positions 
              WHERE drive_id = d.id 
              ORDER BY date ASC 
              LIMIT 1
            ) p ON true
            WHERE d.end_date IS NOT NULL
              AND (
                a.city IS NOT NULL OR 
                a.state IS NOT NULL OR 
                (a.display_name IS NOT NULL AND a.display_name != '') OR
                g.name IS NOT NULL
              )
              AND p.latitude IS NOT NULL 
              AND p.longitude IS NOT NULL
        `
        
        const cityParams: any[] = []
        
        // 如果指定了车辆ID，则添加过滤条件
        if (carId) {
          cityQuery += ` AND d.car_id = $1`
          cityParams.push(parseInt(carId))
        }
        
        cityQuery += `
            GROUP BY 
              CASE 
                WHEN a.display_name IS NOT NULL AND a.display_name != '' THEN 
                  COALESCE(
                    (SELECT part FROM unnest(string_to_array(a.display_name, ',')) AS part 
                     WHERE part LIKE '%市' 
                     ORDER BY array_position(string_to_array(a.display_name, ','), part) DESC 
                     LIMIT 1),
                    split_part(a.display_name, ',', GREATEST(1, array_length(string_to_array(a.display_name, ','), 1) - 2)),
                    a.state,
                    COALESCE(g.name, a.city)
                  )
                ELSE COALESCE(a.state, g.name, a.city)
              END, 
              COALESCE(a.country, '')
          )
          SELECT 
            city,
            province,
            avg_latitude AS latitude,
            avg_longitude AS longitude,
            visit_count,
            first_visit,
            last_visit
          FROM city_visits
          WHERE city IS NOT NULL AND city != ''
          ORDER BY visit_count DESC, last_visit DESC
        `
        
        const cityResult = await client.query(cityQuery, cityParams)
        
        // 处理返回数据，确保类型正确
        const footprints: CityFootprint[] = cityResult.rows.map(row => ({
          city: row.city,
          province: row.province,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          visit_count: parseInt(row.visit_count),
          first_visit: new Date(row.first_visit),
          last_visit: new Date(row.last_visit)
        }))
        
        return NextResponse.json(footprints)
      } else {
        // 查询所有位置数据用于轨迹显示（支持分页）
        let countQuery = `
          SELECT COUNT(*) as total
          FROM positions p
          JOIN drives d ON p.drive_id = d.id
          WHERE d.end_date IS NOT NULL
        `
        
        let positionsQuery = `
          SELECT 
            p.id,
            p.date,
            p.latitude,
            p.longitude,
            p.speed,
            p.power,
            p.odometer,
            p.ideal_battery_range_km,
            p.battery_level,
            p.outside_temp,
            p.inside_temp,
            p.drive_id
          FROM positions p
          JOIN drives d ON p.drive_id = d.id
          WHERE d.end_date IS NOT NULL
        `
        
        const positionsParams: any[] = []
        const countParams: any[] = []
        
        // 如果指定了车辆ID，则添加过滤条件
        if (carId) {
          positionsQuery += ` AND d.car_id = $1`
          countQuery += ` AND d.car_id = $1`
          positionsParams.push(parseInt(carId))
          countParams.push(parseInt(carId))
        }
        
        positionsQuery += ` ORDER BY d.start_date ASC, p.date ASC LIMIT $${positionsParams.length + 1} OFFSET $${positionsParams.length + 2}`
        positionsParams.push(limit, offset)
        
        // 获取总数量
        const countResult = await client.query(countQuery, countParams)
        const totalCount = parseInt(countResult.rows[0].total)
        
        const positionsResult = await client.query(positionsQuery, positionsParams)
        
        // 处理位置数据
        const positions: Position[] = positionsResult.rows.map(row => ({
          id: parseInt(row.id),
          date: new Date(row.date),
          latitude: row.latitude,
          longitude: row.longitude,
          speed: row.speed ? parseFloat(row.speed) : null,
          power: row.power ? parseFloat(row.power) : null,
          odometer: row.odometer ? parseFloat(row.odometer) : null,
          ideal_battery_range_km: row.ideal_battery_range_km ? parseFloat(row.ideal_battery_range_km) : null,
          battery_level: row.battery_level ? parseInt(row.battery_level) : null,
          outside_temp: row.outside_temp ? parseFloat(row.outside_temp) : null,
          inside_temp: row.inside_temp ? parseFloat(row.inside_temp) : null,
          drive_id: parseInt(row.drive_id)
        }))
        
        // 同时获取城市数据（仅在第一页时返回）
        let cities: CityFootprint[] = []
        if (page === 1) {
          let cityQuery = `
            WITH city_visits AS (
              SELECT 
                CASE 
                  -- 优先从 display_name 中提取城市名（包含"市"字的部分）
                  WHEN a.display_name IS NOT NULL AND a.display_name != '' THEN 
                    COALESCE(
                      -- 尝试从 display_name 中提取包含"市"的部分
                      (SELECT part FROM unnest(string_to_array(a.display_name, ',')) AS part 
                       WHERE part LIKE '%市' 
                       ORDER BY array_position(string_to_array(a.display_name, ','), part) DESC 
                       LIMIT 1),
                      -- 备选方案：使用倒数第三个部分（通常是城市）
                      split_part(a.display_name, ',', GREATEST(1, array_length(string_to_array(a.display_name, ','), 1) - 2)),
                      -- 再备选：使用 state 字段
                      a.state,
                      -- 最后使用 geofence 名称或 city 字段（虽然 city 是区，但作为最后备选）
                      COALESCE(g.name, a.city)
                    )
                  -- 如果没有 display_name，则使用其他字段
                  ELSE COALESCE(a.state, g.name, a.city)
                END AS city,
                COALESCE(a.country, '') AS province,
                AVG(p.latitude) AS avg_latitude,
                AVG(p.longitude) AS avg_longitude,
                COUNT(DISTINCT d.id) AS visit_count,
                MIN(d.start_date) AS first_visit,
                MAX(d.start_date) AS last_visit
              FROM drives d
              LEFT JOIN addresses a ON d.start_address_id = a.id
              LEFT JOIN geofences g ON d.start_geofence_id = g.id
              LEFT JOIN LATERAL (
                SELECT latitude, longitude 
                FROM positions 
                WHERE drive_id = d.id 
                ORDER BY date ASC 
                LIMIT 1
              ) p ON true
              WHERE d.end_date IS NOT NULL
                AND (
                  a.city IS NOT NULL OR 
                  a.state IS NOT NULL OR 
                  (a.display_name IS NOT NULL AND a.display_name != '') OR
                  g.name IS NOT NULL
                )
                AND p.latitude IS NOT NULL 
                AND p.longitude IS NOT NULL
          `
          
          const cityParams: any[] = []
          
          // 如果指定了车辆ID，则添加过滤条件
          if (carId) {
            cityQuery += ` AND d.car_id = $1`
            cityParams.push(parseInt(carId))
          }
          
          cityQuery += `
              GROUP BY 
                CASE 
                  WHEN a.display_name IS NOT NULL AND a.display_name != '' THEN 
                    COALESCE(
                      (SELECT part FROM unnest(string_to_array(a.display_name, ',')) AS part 
                       WHERE part LIKE '%市' 
                       ORDER BY array_position(string_to_array(a.display_name, ','), part) DESC 
                       LIMIT 1),
                      split_part(a.display_name, ',', GREATEST(1, array_length(string_to_array(a.display_name, ','), 1) - 2)),
                      a.state,
                      COALESCE(g.name, a.city)
                    )
                  ELSE COALESCE(a.state, g.name, a.city)
                END, 
                COALESCE(a.country, '')
            )
            SELECT 
              city,
              province,
              avg_latitude AS latitude,
              avg_longitude AS longitude,
              visit_count,
              first_visit,
              last_visit
            FROM city_visits
            WHERE city IS NOT NULL AND city != ''
            ORDER BY visit_count DESC, last_visit DESC
          `
          
          const cityResult = await client.query(cityQuery, cityParams)
          
          // 处理城市数据
          cities = cityResult.rows.map(row => ({
            city: row.city,
            province: row.province,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            visit_count: parseInt(row.visit_count),
            first_visit: new Date(row.first_visit),
            last_visit: new Date(row.last_visit)
          }))
        }
        
        return NextResponse.json({ 
          cities, 
          positions,
          totalCount,
          hasNextPage: offset + positions.length < totalCount
        })
      }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('获取足迹数据失败:', error)
    
    return NextResponse.json(
      { error: '获取足迹数据失败', message: error.message },
      { status: 500 }
    )
  }
}