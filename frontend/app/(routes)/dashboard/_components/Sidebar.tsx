"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { branding, colors, sidebarConfig, layout } from '@/lib/design.config'
import {
    LayoutDashboard,
    Mic,
    Bot,
    FileText,
    Activity,
    Calendar,
    History,
    ChevronLeft,
    ChevronRight,
    Stethoscope,
    Settings,
    HelpCircle,
    HeartPulse,
    UserRound,
    Pill,
    Brain
} from 'lucide-react'

// Map icon name strings to actual icon components
const iconMap: Record<string, React.ComponentType<any>> = {
    LayoutDashboard, Mic, Bot, FileText, Activity, Calendar, History,
    Settings, HelpCircle, Stethoscope, HeartPulse, UserRound, Pill, Brain,
}

export default function Sidebar() {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const { user } = useUser()

    // Get role from Clerk publicMetadata
    const role = (user?.publicMetadata as any)?.role || 'patient'
    const navItems = role === 'doctor' ? sidebarConfig.doctorNavItems : sidebarConfig.patientNavItems

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard'
        return pathname.startsWith(href)
    }

    return (
        <aside className={`fixed left-4 top-4 bottom-4 z-40 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-[72px]' : 'w-[240px]'
            } bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]`}
        >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 px-5 h-20 border-b border-gray-100/50 dark:border-white/5 flex-shrink-0 group cursor-pointer transition-colors">
                <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6 text-gray-900 dark:text-gray-100 group-hover:scale-110 transition-transform duration-300" />
                </div>
                {!collapsed && (
                    <span className="text-xl font-medium tracking-tight text-gray-900 dark:text-gray-100">
                        {branding.appName}
                    </span>
                )}
            </Link>

            {/* Role Badge */}
            {!collapsed && (
                <div className="px-5 py-3 border-b border-gray-100/50 dark:border-white/5">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase ${role === 'doctor'
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20'
                        : 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-500/20'
                        }`}>
                        {role === 'doctor' ? (
                            <><Stethoscope className="w-3 h-3" /> Doctor</>
                        ) : (
                            <><Activity className="w-3 h-3" /> Patient</>
                        )}
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
                {navItems.map((item, index) => {
                    const active = isActive(item.href)
                    const Icon = iconMap[item.icon] || LayoutDashboard

                    return (
                        <Link
                            key={`${item.href}-${index}`}
                            href={item.href}
                            className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 ${active
                                ? 'bg-gray-100/80 dark:bg-white/10 text-gray-900 dark:text-white'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            title={collapsed ? item.label : undefined}
                        >
                            <div className="flex items-center justify-center flex-shrink-0 w-6 h-6">
                                <Icon className={`w-5 h-5 ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                            </div>
                            {!collapsed && (
                                <span className={`text-sm tracking-tight ${active ? 'font-medium' : 'font-normal'}`}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="px-3 py-4 border-t border-gray-100/50 dark:border-white/5 space-y-1">
                {sidebarConfig.bottomItems.map((item) => {
                    const Icon = iconMap[item.icon] || HelpCircle
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                            title={collapsed ? item.label : undefined}
                        >
                            <div className="flex items-center justify-center flex-shrink-0 w-6 h-6">
                                <Icon className="w-[18px] h-[18px]" />
                            </div>
                            {!collapsed && <span className="text-sm tracking-tight">{item.label}</span>}
                        </Link>
                    )
                })}

                {/* User */}
                <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <UserButton afterSignOutUrl="/" appearance={{
                        elements: { avatarBox: "w-7 h-7" }
                    }} />
                    {!collapsed && (
                        <span className="text-sm font-medium tracking-tight text-gray-700 dark:text-gray-300 truncate">Account</span>
                    )}
                </div>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3.5 top-24 w-7 h-7 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 shadow-sm flex items-center justify-center hover:scale-105 transition-transform z-50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
                {collapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                    <ChevronLeft className="w-3.5 h-3.5" />
                )}
            </button>
        </aside>
    )
}
