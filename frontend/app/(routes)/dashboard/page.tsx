"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useApiClient } from "@/lib/api"
import { branding, colors, dashboardFeatures, dashboardStats, gradients, layout } from '@/lib/design.config'
import {
  Mic, Bot, FileText, History, Calendar, ArrowRight,
  Activity, Clock, Sparkles, TrendingUp, Shield, Zap,
  PieChart as PieChartIcon, Pill, Brain
} from 'lucide-react'

// Map icon strings → components (from design config)
const iconMap: Record<string, React.ComponentType<any>> = {
  Mic, Bot, FileText, History, Calendar, Activity, Sparkles, TrendingUp, Shield, Zap, Clock, Pill, Brain
}

const badgeIconMap: Record<string, React.ComponentType<any>> = {
  shield: Shield, zap: Zap,
}

type RecentActivity = {
  id: string
  title: string
  type: string
  created_at: string
}

export default function DashboardPage() {
  const { user } = useUser()
  const apiClient = useApiClient()
  const [recentSessions, setRecentSessions] = useState<RecentActivity[]>([])
  const [allSessions, setAllSessions] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentActivity()
  }, [])

  const loadRecentActivity = async () => {
    try {
      const response = await apiClient('/history/sessions')
      const sessions = response.data.map((s: any) => ({
        id: s.id,
        title: s.title || 'Untitled Session',
        type: s.conversation_type || 'voice_consultation',
        created_at: s.created_at
      }))
      setAllSessions(sessions)
      setRecentSessions(sessions.slice(0, 5))
    } catch (error) {
      console.error('Failed to load recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'voice_consultation': return <Mic className="w-4 h-4 text-blue-500" />
      case 'medical_assistant': return <Bot className="w-4 h-4 text-purple-500" />
      case 'report_analysis': return <FileText className="w-4 h-4 text-rose-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'voice_consultation': return 'bg-blue-50'
      case 'medical_assistant': return 'bg-purple-50'
      case 'report_analysis': return 'bg-rose-50'
      default: return 'bg-gray-50'
    }
  }

  // Generate last 7 days data for chart
  const getWeeklyData = () => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = allSessions.filter(s => s.created_at.startsWith(dateStr)).length
      data.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), count })
    }
    return data
  }
  const weeklyData = getWeeklyData()
  const maxCount = Math.max(...weeklyData.map(d => d.count), 1)

  const typeDistribution = [
    { type: 'AI Assistant', count: allSessions.filter(s => s.type === 'medical_assistant').length, color: 'bg-purple-100 text-purple-700' },
    { type: 'Reports', count: allSessions.filter(s => s.type === 'report_analysis').length, color: 'bg-rose-100 text-rose-700' },
    { type: 'Consultations', count: allSessions.filter(s => s.type === 'voice_consultation').length, color: 'bg-blue-100 text-blue-700' }
  ].filter(t => t.count > 0)

  const thisWeekCount = weeklyData.reduce((acc, curr) => acc + curr.count, 0)

  // Dynamically update report count in stats
  const stats = dashboardStats.map(s => {
    if (s.label === 'Reports') return { ...s, value: String(allSessions.length) }
    if (s.label === 'Consultations') return { ...s, value: String(thisWeekCount), label: 'This Week' }
    return s
  })

  return (
    <div className={layout.content.maxWidth + " mx-auto"}>
      {/* Welcome Banner (Clinical Sanctuary) */}
      <div className={`relative overflow-hidden ${layout.borderRadius.card} bg-white dark:bg-[#111111] border border-gray-200/60 dark:border-white/10 shadow-[0_2px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)] p-8 mb-8`}>
        {/* Subtle Orb Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 dark:bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium tracking-tight text-gray-500 dark:text-gray-400 mb-1">Welcome back,</p>
              <h1 className="text-3xl font-semibold tracking-tighter text-gray-900 dark:text-white mb-2">
                {user?.firstName || 'Doctor'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
                {branding.welcomeMessage}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {branding.badges.map((badge) => {
                const Icon = badgeIconMap[badge.icon] || Shield
                return (
                  <div key={badge.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
                    <Icon className={`w-3.5 h-3.5 ${badge.icon === 'shield' ? 'text-emerald-500' : 'text-blue-500'}`} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{badge.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Stats (Crisp Readouts) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {stats.map((stat) => {
              const Icon = iconMap[stat.icon] || Activity
              return (
                <div key={stat.label} className="flex flex-col gap-2 p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Analytics Widget section */}
      {!loading && allSessions.length > 0 && (
        <div className="mb-10 px-1">
          <h2 className="text-sm font-semibold tracking-widest text-gray-500 uppercase mb-4">Activity Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Weekly Chart */}
            <div className="md:col-span-2 bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Consultations (Last 7 Days)
              </h3>
              
              <div className="h-40 flex items-end justify-between gap-2 mt-4">
                {weeklyData.map((data, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="relative w-full flex justify-center h-full items-end pb-2">
                      <div 
                        className="w-full max-w-[40px] bg-blue-100 dark:bg-blue-500/20 rounded-t-md relative overflow-hidden group-hover:bg-blue-200 dark:group-hover:bg-blue-500/30 transition-colors"
                        style={{ height: `${(data.count / maxCount) * 100}%`, minHeight: data.count > 0 ? '4px' : '0' }}
                      >
                        <div className="absolute bottom-0 w-full h-1 bg-blue-500 rounded-t-md opacity-20" />
                      </div>
                      {/* Tooltip */}
                      {data.count > 0 && (
                        <div className="absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {data.count}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 mt-2 uppercase">{data.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribution Legend */}
            <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-center">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-500" />
                Distribution
              </h3>
              <div className="space-y-4">
                {typeDistribution.length > 0 ? typeDistribution.map(type => (
                  <div key={type.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${type.color.split(' ')[0]}`} />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{type.type}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{type.count}</span>
                  </div>
                )) : (
                  <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Diagnostic Modules */}
      <div className="mb-12">
        <h2 className="text-sm font-semibold tracking-widest text-gray-500 uppercase px-1 mb-5">Diagnostic Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dashboardFeatures.map((feature) => {
            const Icon = iconMap[feature.icon] || Activity
            const featureColors = colors[feature.colorKey] || colors.primary

            return (
              <Link
                key={feature.title}
                href={feature.href}
                className={`group relative overflow-hidden bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out`}
              >
                {/* Subtle top accent line */}
                <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${featureColors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${featureColors.bg} group-hover:scale-110 duration-500`}>
                    <Icon className={`w-6 h-6 ${featureColors.text}`} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-gray-900 dark:group-hover:bg-white transition-colors duration-300">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white dark:group-hover:text-gray-900 transition-colors" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Patient Ledger (Recent Activity) */}
      <div className="mb-8">
        <div className="flex items-center justify-between px-1 mb-5">
          <h2 className="text-sm font-semibold tracking-widest text-gray-500 uppercase flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Patient Ledger
          </h2>
          <Link href="/dashboard/history" className="text-xs font-medium text-blue-600 hover:text-blue-700 tracking-tight flex items-center gap-1 transition-colors">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-1/3" />
                    <div className="h-3 bg-gray-50 dark:bg-white/5 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                <Activity className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium tracking-tight text-gray-900 dark:text-gray-200">No recent activity</p>
              <p className="text-sm text-gray-500 mt-1">Start a consultation to see your activity here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100/80 dark:divide-white/5">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/dashboard/medical-agent/${session.id}`}
                  className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${getTypeColor(session.type)} flex items-center justify-center`}>
                      {getTypeIcon(session.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium tracking-tight text-gray-900 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize tracking-wide">
                        {session.type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-400 tracking-tight flex-shrink-0">
                    {formatDate(session.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
