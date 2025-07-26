import { testDatabaseConnection } from '@/lib/test-db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, XCircle, Database, Car, Calendar } from 'lucide-react'

export default async function TestDatabasePage() {
  const testResult = await testDatabaseConnection()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">数据库连接测试</h1>
      </div>

      <Card className={testResult.success ? 'border-green-200' : 'border-red-200'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            连接状态
          </CardTitle>
          <CardDescription>
            {testResult.success ? '数据库连接成功' : '数据库连接失败'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testResult.success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  找到的表: {testResult.tables?.join(', ') || '无'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  行程记录数量: {testResult.drivesCount || 0}
                </span>
              </div>
              
              {testResult.latestDrive && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    最新行程: #{testResult.latestDrive.id} ({new Date(testResult.latestDrive.start_date).toLocaleString('zh-CN')})
                  </span>
                </div>
              )}
              
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ 数据库连接正常！您可以返回首页查看行程数据了。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800 font-medium">错误信息:</p>
                <code className="text-xs text-red-700 mt-2 block">
                  {testResult.error}
                </code>
              </div>
              
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">常见解决方案:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>检查 .env.local 文件中的数据库配置是否正确</li>
                  <li>确认TeslaMate数据库正在运行</li>
                  <li>验证网络连接和防火墙设置</li>
                  <li>检查数据库用户权限</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>配置检查</CardTitle>
          <CardDescription>当前环境变量配置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">数据库主机</p>
              <p className="font-medium">{process.env.DB_HOST || '未配置'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">数据库端口</p>
              <p className="font-medium">{process.env.DB_PORT || '5432'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">数据库名称</p>
              <p className="font-medium">{process.env.DB_NAME || 'teslamate'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">数据库用户</p>
              <p className="font-medium">{process.env.DB_USER || 'teslamate'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">高德地图Key</p>
              <p className="font-medium">
                {process.env.NEXT_PUBLIC_AMAP_KEY ? '已配置' : '未配置'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">高德地图安全码</p>
              <p className="font-medium">
                {process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE ? '已配置' : '未配置'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 