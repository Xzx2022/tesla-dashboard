'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Position } from '@/lib/database'
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { wgs84ToGcj02 } from '@/lib/coordinate-transform'

interface FootprintMapProps {
  positions: Position[]
  loaded?: boolean
}

// 声明全局AMap类型
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: any
    initFootprintMap?: () => void
    initFullscreenFootprintMap?: () => void
  }
}

// 全局变量用于跟踪地图API加载状态
let isMapApiLoaded = false
let mapApiLoadPromise: Promise<void> | null = null

export default function FootprintMap({ positions, loaded = false }: FootprintMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const fullscreenMapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const fullscreenMapInstance = useRef<any>(null)
  const polylinesRef = useRef<any[]>([]) // 保存轨迹线的引用
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // 保存已绘制的轨迹ID，避免重复绘制
  const drawnDriveIdsRef = useRef<Set<number>>(new Set())
  
  // 加载高德地图API的函数
  const loadMapApi = () => {
    // 如果已经加载过，直接返回resolved的Promise
    if (isMapApiLoaded) {
      return Promise.resolve()
    }

    // 如果正在加载中，返回正在加载的Promise
    if (mapApiLoadPromise) {
      return mapApiLoadPromise
    }

    // 创建新的加载Promise
    mapApiLoadPromise = new Promise<void>((resolve, reject) => {
      // 设置高德地图安全密钥
      window._AMapSecurityConfig = {
        securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '',
      }

      // 检查是否已经存在AMap对象
      if (typeof window.AMap !== 'undefined') {
        isMapApiLoaded = true
        resolve()
        return
      }

      // 动态加载高德地图API
      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${process.env.NEXT_PUBLIC_AMAP_KEY}&callback=initFootprintMap`
      script.async = true
      script.onload = () => {
        isMapApiLoaded = true
        resolve()
      }
      script.onerror = () => {
        mapApiLoadPromise = null
        reject(new Error('Failed to load AMap API'))
      }

      document.head.appendChild(script)
    })

    return mapApiLoadPromise
  }
  
  // 绘制轨迹线的函数
  const drawPolylines = useCallback((map: any, newPositions: Position[]) => {
    if (!map || newPositions.length === 0) return
    
    // 按drive_id分组轨迹
    const groupedPositions: Record<number, Position[]> = {}
    newPositions.forEach(pos => {
      if (!groupedPositions[pos.drive_id]) {
        groupedPositions[pos.drive_id] = []
      }
      groupedPositions[pos.drive_id].push(pos)
    })
    
    // 处理每条新轨迹
    Object.entries(groupedPositions).forEach(([driveId, tripPositions]) => {
      const driveIdNum = parseInt(driveId)
      
      // 如果已经绘制过这条轨迹，跳过
      if (drawnDriveIdsRef.current.has(driveIdNum)) {
        return
      }
      
      if (tripPositions.length > 0) {
        const path = tripPositions.map(pos => {
          const rawLng = typeof pos.longitude === 'number' ? pos.longitude : parseFloat(pos.longitude)
          const rawLat = typeof pos.latitude === 'number' ? pos.latitude : parseFloat(pos.latitude)
          // 转换坐标系：WGS84 -> GCJ-02
          const [gcjLng, gcjLat] = wgs84ToGcj02(rawLat, rawLng)
          return [gcjLng, gcjLat] as [number, number]
        })
        
        const polyline = new window.AMap.Polyline({
          path: path,
          borderWeight: 2,
          strokeColor: '#1890ff',
          strokeWeight: 3,
          strokeOpacity: 0.6,
          lineJoin: 'round',
          lineCap: 'round',
        })
        
        map.add(polyline)
        polylinesRef.current.push(polyline)
        drawnDriveIdsRef.current.add(driveIdNum)
      }
    })
  }, [])
  
  // 创建地图的通用函数
  const createMap = useCallback((container: HTMLDivElement, isFullscreenMap = false) => {
    if (!container) return null

    // 获取所有轨迹点并计算中心点和边界
    let allPoints: [number, number][] = []
    
    // 处理所有轨迹点用于计算中心点
    positions.forEach(pos => {
      const rawLng = typeof pos.longitude === 'number' ? pos.longitude : parseFloat(pos.longitude)
      const rawLat = typeof pos.latitude === 'number' ? pos.latitude : parseFloat(pos.latitude)
      // 转换坐标系：WGS84 -> GCJ-02
      const [gcjLng, gcjLat] = wgs84ToGcj02(rawLat, rawLng)
      allPoints.push([gcjLng, gcjLat])
    })

    if (allPoints.length === 0) return null

    // 计算中心点 - 使用更安全的方法避免栈溢出
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    for (const [lng, lat] of allPoints) {
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    }
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2

    const map = new window.AMap.Map(container, {
      zoom: 5, // 中国全图级别
      center: [centerLng, centerLat],
      mapStyle: 'amap://styles/normal',
      zoomEnable: isFullscreenMap,
      dragEnable: isFullscreenMap,
    })

    // 绘制所有轨迹线
    drawPolylines(map, positions)

    // 自适应显示所有轨迹
    if (allPoints.length > 0) {
      map.setFitView()
    }

    return map
  }, [positions, drawPolylines])
  
  // 更新地图上的轨迹线（增量更新）
  const updateMapPolylines = useCallback((newPositions: Position[]) => {
    if (mapInstance.current) {
      drawPolylines(mapInstance.current, newPositions)
    }
    
    if (fullscreenMapInstance.current) {
      drawPolylines(fullscreenMapInstance.current, newPositions)
    }
  }, [drawPolylines])

  useEffect(() => {
    // 只有在所有数据加载完成时才初始化地图
    if (!loaded || positions.length === 0) return;

    // 初始化地图API
    const initMap = async () => {
      try {
        await loadMapApi()

        // 初始化小地图
        window.initFootprintMap = () => {
          if (mapRef.current) {
            // 清空已绘制轨迹ID的记录
            drawnDriveIdsRef.current.clear()
            // 清空轨迹线引用
            polylinesRef.current = []
            mapInstance.current = createMap(mapRef.current, false)
          }
        }

        // 初始化全屏地图
        window.initFullscreenFootprintMap = () => {
          if (fullscreenMapRef.current) {
            // 清空已绘制轨迹ID的记录
            drawnDriveIdsRef.current.clear()
            // 清空轨迹线引用
            polylinesRef.current = []
            fullscreenMapInstance.current = createMap(fullscreenMapRef.current, true)
          }
        }

        // 如果API已经加载完成，立即初始化地图
        if (typeof window.AMap !== 'undefined') {
          window.initFootprintMap()
        }
      } catch (error) {
        console.error('加载地图API失败:', error)
      }
    }

    initMap()

    return () => {
      // 清理
      if (mapInstance.current) {
        mapInstance.current.destroy()
      }
      if (fullscreenMapInstance.current) {
        fullscreenMapInstance.current.destroy()
      }
      delete window.initFootprintMap
      delete window.initFullscreenFootprintMap
    }
  }, [createMap, loaded, positions.length])
  
  // 当positions变化时，增量更新地图
  useEffect(() => {
    if (loaded && positions.length > 0) {
      // 只有在地图已经初始化后才更新
      if (mapInstance.current || fullscreenMapInstance.current) {
        updateMapPolylines(positions)
      }
    }
  }, [positions, updateMapPolylines, loaded])

  // 打开全屏地图
  const openFullscreen = () => {
    // 只有在所有数据加载完成时才允许打开全屏地图
    if (!loaded || positions.length === 0) return;
    
    setIsFullscreen(true)
    // 延迟初始化全屏地图，确保DOM已渲染
    setTimeout(() => {
      if (window.AMap && fullscreenMapRef.current) {
        fullscreenMapInstance.current = createMap(fullscreenMapRef.current, true)
      } else if (typeof window.AMap === 'undefined') {
        // 如果AMap尚未加载，加载后再初始化
        loadMapApi().then(() => {
          if (window.AMap && fullscreenMapRef.current) {
            fullscreenMapInstance.current = createMap(fullscreenMapRef.current, true)
          }
        }).catch(error => {
          console.error('加载地图API失败:', error)
        })
      }
    }, 100)
  }

  // 关闭全屏地图
  const closeFullscreen = () => {
    if (fullscreenMapInstance.current) {
      fullscreenMapInstance.current.destroy()
      fullscreenMapInstance.current = null
    }
    setIsFullscreen(false)
  }

  // 缩放控制
  const zoomIn = () => {
    if (fullscreenMapInstance.current) {
      fullscreenMapInstance.current.zoomIn()
    }
  }

  const zoomOut = () => {
    if (fullscreenMapInstance.current) {
      fullscreenMapInstance.current.zoomOut()
    }
  }

  // 如果没有位置数据，则显示占位符
  if (positions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-muted-foreground">暂无轨迹数据</p>
      </div>
    )
  }

  // 如果数据未完全加载，则显示加载中占位符
  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-muted-foreground">正在加载轨迹点...</p>
      </div>
    )
  }

  return (
    <>
      {/* 小地图 */}
      <div className="relative w-full h-full group">
        <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />
        
        {/* 放大按钮 */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={openFullscreen}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        
        {/* 点击遮罩 */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={openFullscreen}
          title="点击放大地图"
        />
      </div>

      {/* 全屏模态 */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="relative w-full h-full max-w-6xl max-h-full bg-white rounded-lg overflow-hidden">
            {/* 控制按钮 */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button variant="secondary" size="sm" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={closeFullscreen}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 全屏地图容器 */}
            <div ref={fullscreenMapRef} className="w-full h-full" />
          </div>
        </div>
      )}
    </>
  )
}