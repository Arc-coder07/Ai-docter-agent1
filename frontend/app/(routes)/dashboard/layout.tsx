"use client"
import React from 'react'
import Sidebar from './_components/Sidebar'
import { Toaster } from 'sonner'

function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#0a0a0a]">
      {/* 
        Intent: A clean "chart gray" or pure white sanctuary. The background must feel weightless, 
        giving the floating sidebar and cards room to breathe without harsh borders.
      */}
      <Sidebar />
      {/* 
        Main content area - offset by sidebar width + floating margins. 
        Sidebar width: 260px (or 80px collapsed).
      */}
      <main className="ml-[280px] transition-all duration-300">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default DashboardLayout

