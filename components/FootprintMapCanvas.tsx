'use client'

import { useEffect, useRef, useState } from 'react'
import { Position } from '@/lib/database'
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { wgs84ToGcj02 } from '@/lib/coordinate-transform'

interface FootprintMapProps {
  positions: Position[]
  // Removed cityMarkers prop as we no longer show city markers
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

export default function FootprintMap({ positions }: FootprintMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const fullscreenMapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const fullscreenMapInstance = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 创建地图的通用函数
  const createMap = (container: HTMLDivElement, isFullscreenMap = false) => {
    if (!container || positions.length === 0) return null

    // 获取所有轨迹点并计算中心点和边界
    let allPoints: [number, number][] = []
    const paths: [number, number][][] = []
    
    // 按drive_id分组轨迹
    const groupedPositions: Record<number, Position[]> = {}
    positions.forEach(pos => {
      if (!groupedPositions[pos.drive_id]) {
        groupedPositions[pos.drive_id] = []
      }
      groupedPositions[pos.drive_id].push(pos)
    })
    
    // 处理每条轨迹
    Object.values(groupedPositions).forEach(tripPositions => {
      if (tripPositions.length > 0) {
        const path = tripPositions.map(pos => {
          const rawLng = typeof pos.longitude === 'number' ? pos.longitude : parseFloat(pos.longitude);
          const rawLat = typeof pos.latitude === 'number' ? pos.latitude : parseFloat(pos.latitude);
          // 转换坐标系：WGS84 -> GCJ-02
          const [gcjLng, gcjLat] = wgs84ToGcj02(rawLat, rawLng);
          allPoints.push([gcjLng, gcjLat]);
          return [gcjLng, gcjLat] as [number, number];
        });
        paths.push(path);
      }
    });

    if (allPoints.length === 0) return null;

    // 计算中心点 - 使用更安全的方法避免栈溢出
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lng, lat] of allPoints) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const map = new window.AMap.Map(container, {
      zoom: 5, // 中国全图级别
      center: [centerLng, centerLat],
      mapStyle: 'amap://styles/normal',
      zoomEnable: isFullscreenMap,
      dragEnable: isFullscreenMap,
    })

    // 绘制所有轨迹线
    paths.forEach((path, index) => {
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
    })

    // 自适应显示所有轨迹
    if (allPoints.length > 0) {
      map.setFitView()
    }

    return map
  }

  useEffect(() => {
    // 设置高德地图安全密钥
    window._AMapSecurityConfig = {
      securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '',
    }

    // 动态加载高德地图API
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${process.env.NEXT_PUBLIC_AMAP_KEY}&callback=initFootprintMap`
    script.async = true
    
    // 初始化小地图
    window.initFootprintMap = () => {
      if (mapRef.current) {
        mapInstance.current = createMap(mapRef.current, false)
      }
    }

    // 初始化全屏地图
    window.initFullscreenFootprintMap = () => {
      if (fullscreenMapRef.current) {
        fullscreenMapInstance.current = createMap(fullscreenMapRef.current, true)
      }
    }

    document.head.appendChild(script)

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
      const scriptToRemove = document.querySelector(`script[src*="webapi.amap.com"]`)
      if (scriptToRemove && document.head.contains(scriptToRemove)) {
        document.head.removeChild(scriptToRemove)
      }
    }
  }, [positions])

  // 打开全屏地图
  const openFullscreen = () => {
    setIsFullscreen(true)
    // 延迟初始化全屏地图，确保DOM已渲染
    setTimeout(() => {
      if (window.AMap && fullscreenMapRef.current) {
        fullscreenMapInstance.current = createMap(fullscreenMapRef.current, true)
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

  if (positions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-muted-foreground">暂无轨迹数据</p>
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
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
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