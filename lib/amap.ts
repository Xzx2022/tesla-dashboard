// 高德地图API服务
const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || ''

// 地理编码响应接口
interface AmapGeoResponse {
  status: string
  info: string
  regeocode?: {
    formatted_address: string
    addressComponent: {
      country: string
      province: string
      city: string
      district: string
      township: string
      street: string
      streetNumber: string
      neighborhood: string
      building: string
    }
    pois?: Array<{
      id: string
      name: string
      type: string
      address: string
      distance: string
    }>
  }
}

// 缓存已查询的地址，避免重复API调用
const addressCache = new Map<string, string>()

/**
 * 通过坐标获取详细地址（逆地理编码）
 * @param longitude 经度（数字或字符串）
 * @param latitude 纬度（数字或字符串）
 * @returns 详细地址字符串
 */
export async function getAddressByCoordinate(longitude: number | string, latitude: number | string): Promise<string> {
  if (!AMAP_KEY) {
    console.warn('NEXT_PUBLIC_AMAP_KEY 未配置，无法使用高德地图地址查询')
    return '未知位置'
  }

  // 转换为数字类型
  const lng = Number(longitude)
  const lat = Number(latitude)
  
  // 验证坐标有效性
  if (isNaN(lng) || isNaN(lat) || !isFinite(lng) || !isFinite(lat)) {
    console.warn('无效的坐标值:', longitude, latitude)
    return '未知位置'
  }

  // 创建缓存键
  const cacheKey = `${lng.toFixed(6)},${lat.toFixed(6)}`
  
  // 检查缓存
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey)!
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}&radius=1000&extensions=base&batch=false&roadlevel=1`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Tesla-Dashboard/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: AmapGeoResponse = await response.json()

    if (data.status === '1' && data.regeocode) {
      const regeocode = data.regeocode
      const addressComponent = regeocode.addressComponent
      
      // 构建简化的地址
      let address = ''
      
      // 优先使用formatted_address，但进行智能简化处理
      if (regeocode.formatted_address) {
        address = simplifyAmapAddress(regeocode.formatted_address, addressComponent)
      } else {
        // 手动构建地址
        const parts = [
          addressComponent.city,
          addressComponent.district,
          addressComponent.township,
          addressComponent.street
        ].filter(part => part && part !== '[]')
        
        address = parts.join('')
      }

      const finalAddress = address || '未知位置'
      
      // 缓存结果
      addressCache.set(cacheKey, finalAddress)
      
      return finalAddress
    } else {
      console.warn('高德地图API返回错误:', data.info)
      return '未知位置'
    }
  } catch (error) {
    console.error('高德地图API调用失败:', error)
    return '未知位置'
  }
}

/**
 * 智能简化高德地图返回的地址
 */
function simplifyAmapAddress(formattedAddress: string, addressComponent?: any): string {
  if (!formattedAddress) return '未知位置'
  
  // 移除省市区等行政区划信息，提取有意义的地址
  let simplified = formattedAddress
    .replace(/^(中华人民共和国|中国)/, '')
    .replace(/^(.*?省)/, '')
    .replace(/^(.*?市)/, '')
    .replace(/^(.*?区)/, '')
    .replace(/^(.*?县)/, '')
    .replace(/^(.*?街道)/, '')
    .replace(/^(.*?镇)/, '')
    .replace(/^(.*?乡)/, '')
    .trim()

  // 如果简化后的地址包含具体的POI名称，优先显示
  if (simplified.length > 0) {
    
    // 1. 优先提取建筑物、商场、公园等POI名称
    // 匹配模式：门牌号 + POI名称，提取POI名称
    const poiPatterns = [
      // 匹配：数字号 + POI名称（如：220号南湖公园 -> 南湖公园）
      /^.*?(\d+号?\s*)(.+)$/,
      // 匹配：道路名 + 数字号 + POI名称（如：某某道784号麦佳汇 -> 麦佳汇）
      /^.*?[路街道大街]\s*\d+号?\s*(.+)$/,
      // 匹配：道路名 + POI名称（如：中山路肯德基 -> 肯德基）
      /^.*?[路街道大街]\s*(.+)$/
    ]
    
    for (const pattern of poiPatterns) {
      const match = simplified.match(pattern)
      if (match) {
        const extractedPOI = match[match.length - 1].trim() // 取最后一个捕获组
        
        // 验证提取的POI是否合理
        if (extractedPOI.length > 0 && 
            extractedPOI.length <= 25 && 
            !extractedPOI.match(/^\d+$/) && // 不是纯数字
            !extractedPOI.match(/^[路街道大街巷弄]$/) && // 不是道路后缀
            !extractedPOI.match(/^[东南西北中]$/) // 不是方向词
        ) {
          simplified = extractedPOI
          break
        }
      }
    }
    
    // 2. 如果没有匹配到合适的POI，尝试其他简化方式
    if (simplified === formattedAddress.replace(/^.*?[乡镇街道]/, '').trim()) {
      // 按照常见的分隔符切分，取最后的有意义部分
      if (simplified.length > 20) {
        const parts = simplified.split(/[,，、]/)
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1].trim()
          if (lastPart.length > 0 && lastPart.length <= 20) {
            simplified = lastPart
          }
        }
      }
      
      // 3. 移除常见的无用后缀和前缀
      simplified = simplified
        .replace(/^(附近|周边|内部|地下|地上|室内|室外)/, '') // 移除位置前缀
        .replace(/(附近|周边|内部|地下|地上|室内|室外)$/, '') // 移除位置后缀
        .replace(/^(\d+号?-?\d*[室房间层楼]?)/, '') // 移除门牌号、房间号
        .replace(/^(\d+号?\s*)/, '') // 移除单独的门牌号
        .replace(/(停车场|停车位|车位)$/, '') // 移除停车相关后缀
        .trim()
    }
    
    // 如果还是太长，截取前面的部分
    if (simplified.length > 25) {
      simplified = simplified.substring(0, 25) + '...'
    }
  }
  
  // 如果简化后为空或者过短，尝试使用addressComponent信息
  if (!simplified || simplified.length < 2) {
    if (addressComponent) {
      const fallbackParts = [
        addressComponent.district,
        addressComponent.township,
        addressComponent.street
      ].filter(part => part && part !== '[]' && part.length > 0)
      
      simplified = fallbackParts.join('') || '未知位置'
    } else {
      simplified = '未知位置'
    }
  }
  
  return simplified || '未知位置'
}

/**
 * 批量获取地址（对于行程列表优化）
 * 使用高德地图API的批量逆地理编码接口
 * @param coordinates 坐标数组 [{longitude, latitude}]
 * @returns 地址数组
 */
export async function getAddressesByCoordinatesBatch(
  coordinates: Array<{ longitude: number | string; latitude: number | string }>
): Promise<string[]> {
  if (!AMAP_KEY) {
    console.warn('NEXT_PUBLIC_AMAP_KEY 未配置，无法使用高德地图地址查询')
    return coordinates.map(() => '未知位置')
  }

  if (coordinates.length === 0) {
    return []
  }

  // 过滤有效坐标并创建缓存键
  const validCoordinates: Array<{ 
    index: number; 
    lng: number; 
    lat: number; 
    cacheKey: string;
    original: { longitude: number | string; latitude: number | string }
  }> = []
  
  const results: string[] = new Array(coordinates.length)
  
  coordinates.forEach((coord, index) => {
    const lng = Number(coord.longitude)
    const lat = Number(coord.latitude)
    
    if (isNaN(lng) || isNaN(lat) || !isFinite(lng) || !isFinite(lat)) {
      results[index] = '未知位置'
      return
    }
    
    const cacheKey = `${lng.toFixed(6)},${lat.toFixed(6)}`
    
    // 检查缓存
    if (addressCache.has(cacheKey)) {
      results[index] = addressCache.get(cacheKey)!
      return
    }
    
    validCoordinates.push({
      index,
      lng,
      lat,
      cacheKey,
      original: coord
    })
  })
  
  // 如果所有坐标都已缓存，直接返回
  if (validCoordinates.length === 0) {
    return results
  }

  // 高德地图API支持批量查询，但建议每次不超过20个点
  const batchSize = 20
  const batches: typeof validCoordinates[] = []
  
  for (let i = 0; i < validCoordinates.length; i += batchSize) {
    batches.push(validCoordinates.slice(i, i + batchSize))
  }
  
  try {
    // 并行处理多个批次
    const batchPromises = batches.map(async (batch) => {
      // 构建批量请求的location参数：lng1,lat1|lng2,lat2|...
      const locations = batch.map(coord => `${coord.lng},${coord.lat}`).join('|')
      
      const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${locations}&radius=1000&extensions=base&batch=true&roadlevel=1`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Tesla-Dashboard/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.status === '1' && data.regeocodes && Array.isArray(data.regeocodes)) {
        // 处理批量返回结果
        data.regeocodes.forEach((regeocode: any, batchIndex: number) => {
          const coord = batch[batchIndex]
          if (!coord) return
          
          let address = '未知位置'
          
          if (regeocode && regeocode.formatted_address) {
            const addressComponent = regeocode.addressComponent || {}
            address = simplifyAmapAddress(regeocode.formatted_address, addressComponent)
          }
          
          // 缓存结果
          addressCache.set(coord.cacheKey, address)
          results[coord.index] = address
        })
      } else {
        console.warn('高德地图批量API返回错误:', data.info)
        // 如果批量请求失败，标记为未知位置
        batch.forEach(coord => {
          results[coord.index] = '未知位置'
        })
      }
    })
    
    await Promise.all(batchPromises)
    
    // 填充任何未处理的结果
    results.forEach((result, index) => {
      if (result === undefined) {
        results[index] = '未知位置'
      }
    })
    
    return results
  } catch (error) {
    console.error('批量地址查询失败:', error)
    
    // 发生错误时，将未缓存的结果设为未知位置
    validCoordinates.forEach(coord => {
      if (results[coord.index] === undefined) {
        results[coord.index] = '未知位置'
      }
    })
    
    return results
  }
} 