"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'
import { useApiClient } from "@/lib/api"
import {
  Mic,
  Bot,
  FileText,
  History,
  Calendar,
  ArrowRight,
  Activity,
  Clock
} from 'lucide-react'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentActivity()
  }, [])

  const loadRecentActivity = async () => {
    try {
      const response = await apiClient('/history/sessions')
      const sessions = response.data.slice(0, 5).map((s: any) => ({
        id: s.id,
        title: s.title || 'Untitled Session',
        type: s.conversation_type || 'voice_consultation',
        created_at: s.created_at
      }))
      setRecentSessions(sessions)
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
      case 'report_analysis': return <FileText className="w-4 h-4 text-green-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const features = [
    {
      title: 'Voice Consultation',
      description: 'Talk to specialized AI doctors for personalized medical advice',
      icon: Mic,
      href: '/dashboard/consultation',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Medical AI Assistant',
      description: 'Chat, upload X-rays, MRI scans, or skin images for AI analysis',
      icon: Bot,
      href: '/dashboard/assistant',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Blood Report Analysis',
      description: 'Upload blood test reports for AI interpretation and insights',
      icon: FileText,
      href: '/dashboard/report_analysis',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Chest X-ray Analysis',
      description: 'AI-powered pneumonia detection from chest X-ray images',
      icon: Activity,
      href: '/dashboard/xray_analysis',
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Book a Doctor',
      description: 'Schedule and join video consultations with real doctors',
      icon: Calendar,
      href: '/dashboard/consultation_booking',
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      title: 'History & Reports',
      description: 'View past consultations and generate summary reports',
      icon: History,
      href: '/dashboard/history',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50'
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Your AI-powered medical assistant is ready to help
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group"
          >
            <div className={`${feature.bgColor} rounded-2xl p-6 h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-transparent hover:border-gray-200`}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {feature.description}
              </p>
              <div className="flex items-center text-sm font-medium text-gray-700 group-hover:text-gray-900">
                Get Started <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Recent Activity
          </h2>
          <Link
            href="/dashboard/history"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="text-gray-400 py-4">Loading...</div>
        ) : recentSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Start a consultation to see your history here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/medical-agent/${session.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    {getTypeIcon(session.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 line-clamp-1">
                      {session.title}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {session.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDate(session.created_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>


    </div>
  )
}
