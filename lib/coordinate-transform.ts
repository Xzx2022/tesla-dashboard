/**
 * WGS84转GCJ-02坐标转换
 * 适用于中国地区的地图坐标偏移修正
 */

// 常量定义
const PI = 3.14159265358979324;
const A = 6378245.0;
const EE = 0.00669342162296594323;

/**
 * 判断坐标是否在中国范围内
 * @param wgLat 纬度
 * @param wgLon 经度
 * @returns 是否在中国
 */
function isPointInChina(wgLat: number, wgLon: number): boolean {
  return wgLat >= 0.8293 && wgLat <= 55.8271 && wgLon >= 72.004 && wgLon <= 137.8347;
}

/**
 * 转换纬度
 * @param x 经度
 * @param y 纬度
 * @returns 转换后的纬度偏移
 */
function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

/**
 * 转换经度
 * @param x 经度
 * @param y 纬度
 * @returns 转换后的经度偏移
 */
function transformLon(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

/**
 * WGS84坐标转GCJ-02坐标（火星坐标）
 * @param wgLat WGS84纬度
 * @param wgLon WGS84经度
 * @returns [GCJ-02经度, GCJ-02纬度]
 */
export function wgs84ToGcj02(wgLat: number, wgLon: number): [number, number] {
  // 如果不在中国范围内，不进行转换
  if (!isPointInChina(wgLat, wgLon)) {
    return [wgLon, wgLat];
  }

  let dLat = transformLat(wgLon - 105.0, wgLat - 35.0);
  let dLon = transformLon(wgLon - 105.0, wgLat - 35.0);
  const radLat = wgLat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLon = (dLon * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  const mgLat = wgLat + dLat;
  const mgLon = wgLon + dLon;
  
  return [mgLon, mgLat];
}

/**
 * 批量转换WGS84坐标为GCJ-02坐标
 * @param coordinates WGS84坐标数组 [{latitude, longitude}]
 * @returns GCJ-02坐标数组 [{latitude, longitude}]
 */
export function batchWgs84ToGcj02(
  coordinates: Array<{ latitude: number; longitude: number }>
): Array<{ latitude: number; longitude: number }> {
  return coordinates.map(coord => {
    const [gcjLon, gcjLat] = wgs84ToGcj02(coord.latitude, coord.longitude);
    return {
      latitude: gcjLat,
      longitude: gcjLon
    };
  });
}