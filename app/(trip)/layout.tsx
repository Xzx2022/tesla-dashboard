import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../../app/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tesla 行程详情',
  description: 'Tesla 行程详细信息',
}

export default function TripLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}