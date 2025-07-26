'use client'

import { useEffect, useRef, useState } from 'react'
import { Position } from '@/lib/database'
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TripMapProps {
  positions: Position[]
}

// 声明全局AMap类型
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: any
    initMap?: () => void
    initFullscreenMap?: () => void
  }
}

export default function TripMap({ positions }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const fullscreenMapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const fullscreenMapInstance = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 创建地图的通用函数
  const createMap = (container: HTMLDivElement, isFullscreenMap = false) => {
    if (!container || positions.length === 0) return null

    const map = new window.AMap.Map(container, {
      zoom: 13,
      center: [positions[0].longitude, positions[0].latitude],
      mapStyle: 'amap://styles/normal',
      zoomEnable: isFullscreenMap, // 全屏模式启用缩放
      dragEnable: isFullscreenMap, // 全屏模式启用拖拽
    })

    // 创建轨迹点数组
    const path = positions.map(pos => [pos.longitude, pos.latitude])

    // 添加起点标记
    const startMarker = new window.AMap.Marker({
      position: [positions[0].longitude, positions[0].latitude],
      title: '起点',
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(25, 34),
        image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
        imageOffset: new window.AMap.Pixel(-9, -34),
      }),
    })

    // 添加终点标记
    if (positions.length > 1) {
      const endMarker = new window.AMap.Marker({
        position: [positions[positions.length - 1].longitude, positions[positions.length - 1].latitude],
        title: '终点',
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(25, 34),
          image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png',
          imageOffset: new window.AMap.Pixel(-9, -34),
        }),
      })
      map.add(endMarker)
    }

    map.add(startMarker)

    // 绘制轨迹线
    const polyline = new window.AMap.Polyline({
      path: path,
      borderWeight: 5,
      strokeColor: '#1890ff',
      strokeWeight: 4,
      strokeOpacity: 0.8,
      lineJoin: 'round',
      lineCap: 'round',
    })

    map.add(polyline)

    // 自适应显示轨迹
    map.setFitView([startMarker, polyline])

    return map
  }

  useEffect(() => {
    // 设置高德地图安全密钥
    window._AMapSecurityConfig = {
      securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '',
    }

    // 动态加载高德地图API
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${process.env.NEXT_PUBLIC_AMAP_KEY}&callback=initMap`
    script.async = true
    
    // 初始化小地图
    window.initMap = () => {
      if (mapRef.current) {
        mapInstance.current = createMap(mapRef.current, false)
      }
    }

    // 初始化全屏地图
    window.initFullscreenMap = () => {
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
      delete window.initMap
      delete window.initFullscreenMap
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