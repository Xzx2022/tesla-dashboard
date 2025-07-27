import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tesla',
  description: '基于 TeslaMate 数据的现代化 Tesla 仪表板',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  )
} 