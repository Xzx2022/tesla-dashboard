import { pool } from './database'

// 车辆数据类型定义
export interface Car {
  id: number
  eid: number | null
  vid: number | null
  model: string | null
  efficiency: number | null
  inserted_at: Date
  updated_at: Date
  vin: string | null
  name: string | null
  trim_badging: string | null
  settings_id: number | null
  exterior_color: string | null
  spoiler_type: string | null
  wheel_type: string | null
  display_priority: number | null
  marketing_name: string | null
}

// 获取所有车辆信息
export async function getAllCars(): Promise<Car[]> {
  // 构建时返回空数组
  if (process.env.SKIP_DB_CONNECTION === 'true') {
    return [];
  }
  
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        id,
        eid,
        vid,
        model,
        efficiency,
        inserted_at,
        updated_at,
        vin,
        name,
        trim_badging,
        settings_id,
        exterior_color,
        spoiler_type,
        wheel_type,
        display_priority,
        marketing_name
      FROM cars
      ORDER BY id
    `)
    return result.rows
  } finally {
    client.release()
  }
}

// 根据ID获取车辆信息
export async function getCarById(id: number): Promise<Car | null> {
  // 构建时返回null
  if (process.env.SKIP_DB_CONNECTION === 'true') {
    return null;
  }
  
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        id,
        eid,
        vid,
        model,
        efficiency,
        inserted_at,
        updated_at,
        vin,
        name,
        trim_badging,
        settings_id,
        exterior_color,
        spoiler_type,
        wheel_type,
        display_priority,
        marketing_name
      FROM cars
      WHERE id = $1
    `, [id])
    return result.rows[0] || null
  } finally {
    client.release()
  }
}