import { pool } from './database'

// 测试数据库连接
export async function testDatabaseConnection() {
  const client = await pool.connect()
  try {
    // 测试基本连接
    const result = await client.query('SELECT NOW()')
    console.log('✅ 数据库连接成功:', result.rows[0])
    
    // 检查TeslaMate表是否存在
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('drives', 'positions', 'addresses', 'geofences', 'cars')
      ORDER BY table_name
    `)
    
    console.log('📊 找到的TeslaMate表:', tablesResult.rows.map(row => row.table_name))
    
    // 检查drives表中的数据
    const drivesCount = await client.query('SELECT COUNT(*) FROM drives')
    console.log('🚗 行程记录数量:', drivesCount.rows[0].count)
    
    // 检查最新的行程
    const latestDrive = await client.query(`
      SELECT id, start_date, end_date 
      FROM drives 
      ORDER BY start_date DESC 
      LIMIT 1
    `)
    
    if (latestDrive.rows.length > 0) {
      console.log('🕒 最新行程:', latestDrive.rows[0])
    } else {
      console.log('⚠️  没有找到行程数据')
    }
    
    return {
      success: true,
      tables: tablesResult.rows.map(row => row.table_name),
      drivesCount: parseInt(drivesCount.rows[0].count),
      latestDrive: latestDrive.rows[0] || null
    }
    
  } catch (error: any) {
    console.error('❌ 数据库连接失败:', error)
    return {
      success: false,
      error: error.message || '未知错误'
    }
  } finally {
    client.release()
  }
} 