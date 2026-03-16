"use client"
import React from 'react'
import Sidebar from './_components/Sidebar'
import OnboardingGuard from './_components/OnboardingGuard'
import { Toaster } from 'sonner'

function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <OnboardingGuard>
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#0a0a0a]">
        <Sidebar />
        <main className="ml-[280px] transition-all duration-300">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
        <Toaster richColors position="top-right" />
      </div>
    </OnboardingGuard>
  )
}

export default DashboardLayout
