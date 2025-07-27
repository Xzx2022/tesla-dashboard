import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../../app/globals.css'
import VehicleSelector from '@/components/VehicleSelector'
import TeslaT from '@/components/TeslaT'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tesla',
  description: '基于 TeslaMate 数据的现代化 Tesla 仪表板',
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              My Tesla
            </h1>
            <div className="w-48">
              <VehicleSelector />
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}