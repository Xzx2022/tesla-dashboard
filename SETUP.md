# Tesla Dashboard 设置指南

这是一个用于替代 TeslaMate Grafana 面板的现代化 Web 应用程序，基于 Next.js 构建。

## 功能特性

- 📱 现代化响应式 UI（基于 shadcn/ui）
- 🗺️ 行程轨迹可视化（高德地图）
- 📊 详细数据分析和图表
- 🌏 **智能地址解析**（基于高德地图API）
- 📱 移动端优化
- 🌍 时区支持配置

## 环境要求

- Node.js 18+
- PostgreSQL（TeslaMate 数据库）
- 高德地图开发者账号（用于地址解析）

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd tesla-dashboard
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 文件：

```env
# 数据库连接配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teslamate
DB_USER=teslamate
DB_PASSWORD=your_password

# 高德地图API配置
NEXT_PUBLIC_AMAP_KEY=your_amap_api_key_here

# 时区配置（可选，默认为Asia/Shanghai）
TZ=Asia/Shanghai
```

### 4. 高德地图API配置

为了使用智能地址解析功能，您需要：

1. **注册高德开发者账号**
   - 访问 [高德开放平台](https://lbs.amap.com/)
   - 注册并完成开发者认证

2. **创建应用并获取Key**
   - 在控制台创建新应用
   - 选择 "Web服务" 类型
   - 获取API Key（设置为 `NEXT_PUBLIC_AMAP_KEY`）

3. **配置Key权限**
   - 启用"地理/逆地理编码"服务
   - 启用"地图 JS API"服务
   - 添加您的域名到白名单（开发时添加 `localhost`）

### 5. 验证数据库连接

运行数据库测试：

```bash
npm run dev
```

然后访问 `http://localhost:3000/test-db` 查看数据库连接状态。

### 6. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

## 功能说明

### 智能地址解析

应用现在支持两种地址显示模式：

1. **数据库地址**：来自 TeslaMate 的 addresses 和 geofences 表
2. **详细地址**：通过高德地图API根据GPS坐标获取的详细地址

当配置了高德地图API后，应用会：
- 自动获取每个行程起始和结束位置的详细地址
- 缓存API结果以避免重复调用
- 智能简化地址显示，确保在手机端也能清晰显示
- 失败时自动回退到数据库地址

### 数据库表使用

应用使用以下 TeslaMate 数据库表：

- `drives`：主要行程数据
- `positions`：GPS轨迹点
- `addresses`：地址信息
- `geofences`：地理围栏
- `cars`：车辆信息

确保您的 TeslaMate 实例正常运行并收集数据。

## 生产部署

### 1. 构建项目

```bash
npm run build
```

### 2. 启动生产服务器

```bash
npm start
```

### 3. 使用 PM2（推荐）

```bash
npm install -g pm2
pm2 start npm --name "tesla-dashboard" -- start
pm2 save
pm2 startup
```

## 故障排除

### 数据库连接问题

1. 访问 `/test-db` 页面检查连接状态
2. 确认 TeslaMate 数据库可访问
3. 检查环境变量配置

### 地址显示问题

1. 检查 `NEXT_PUBLIC_AMAP_KEY` 是否正确配置
2. 确认API Key权限包含"地理/逆地理编码"服务
3. 查看浏览器控制台是否有API调用错误
4. 即使API不可用，应用也会使用数据库地址作为备选

### 时区问题

- 确保 `TZ` 环境变量设置正确
- 默认时区为 `Asia/Shanghai`（东八区）
- 支持的时区格式：`Asia/Shanghai`、`Asia/Tokyo` 等

### 地图不显示

1. 检查 `NEXT_PUBLIC_AMAP_KEY` 是否正确设置
2. 确认网络可以访问高德地图服务
3. 检查浏览器控制台错误信息

## API配额注意事项

高德地图API有调用限制：
- 个人开发者：每日免费额度有限
- 应用实现了地址缓存机制以减少API调用
- 建议生产环境申请商业版本以获得更多配额

## 技术栈

- **前端**：Next.js 14, React, TypeScript
- **UI组件**：shadcn/ui, Tailwind CSS
- **图表**：Recharts
- **地图**：高德地图 JavaScript API
- **数据库**：PostgreSQL
- **地址服务**：高德地图Web服务API

## 更新日志

### v1.2.0 - 智能地址解析
- ✅ 添加高德地图API集成
- ✅ 智能地址解析和缓存
- ✅ GPS坐标获取和显示
- ✅ 地址回退机制
- ✅ 移动端地址显示优化

### v1.1.0 - 移动端优化
- ✅ 响应式布局优化
- ✅ 图表移动端适配
- ✅ 时区配置支持

### v1.0.0 - 基础功能
- ✅ 行程列表和详情
- ✅ 轨迹地图显示
- ✅ 数据图表分析 