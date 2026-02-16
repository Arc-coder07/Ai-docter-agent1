"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useApiClient } from "@/lib/api"
import {
    ArrowLeft,
    Calendar,
    Search,
    Filter,
    Bot,
    Mic,
    FileText,
    Clock,
    ChevronRight,
    Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type Session = {
    id: string
    title: string
    conversation_type: string
    agent_used?: string
    summary?: string
    created_at: string
}

export default function HistoryPage() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<string>('all')
    const apiClient = useApiClient()

    useEffect(() => {
        loadSessions()
    }, [])

    const loadSessions = async () => {
        try {
            const response = await apiClient('/history/sessions')
            setSessions(response.data)
        } catch (error) {
            console.error('Failed to load sessions:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getTypeInfo = (type: string) => {
        switch (type) {
            case 'voice_consultation':
                return {
                    icon: Mic,
                    label: 'Voice Consultation',
                    color: 'bg-blue-100 text-blue-700',
                    iconColor: 'text-blue-500'
                }
            case 'medical_assistant':
                return {
                    icon: Bot,
                    label: 'Medical Assistant',
                    color: 'bg-purple-100 text-purple-700',
                    iconColor: 'text-purple-500'
                }
            case 'report_analysis':
                return {
                    icon: FileText,
                    label: 'Report Analysis',
                    color: 'bg-green-100 text-green-700',
                    iconColor: 'text-green-500'
                }
            default:
                return {
                    icon: Clock,
                    label: 'Consultation',
                    color: 'bg-gray-100 text-gray-700',
                    iconColor: 'text-gray-500'
                }
        }
    }

    const filteredSessions = sessions.filter(session => {
        const matchesSearch = session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.agent_used?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = filterType === 'all' || session.conversation_type === filterType
        return matchesSearch && matchesFilter
    })

    const filterOptions = [
        { value: 'all', label: 'All Sessions' },
        { value: 'voice_consultation', label: 'Voice Consultations' },
        { value: 'medical_assistant', label: 'Medical Assistant' },
        { value: 'report_analysis', label: 'Report Analysis' }
    ]

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">History & Reports</h1>
                        <p className="text-sm text-gray-500">View past consultations and sessions</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {filterOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Sessions List */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">
                    Loading sessions...
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="text-center py-12">
                    <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700">No sessions found</h3>
                    <p className="text-gray-500 mt-1">
                        {searchQuery || filterType !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Start a consultation to see your history here'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSessions.map((session) => {
                        const typeInfo = getTypeInfo(session.conversation_type)
                        const TypeIcon = typeInfo.icon

                        return (
                            <Link
                                key={session.id}
                                href={`/dashboard/history/${session.id}`}
                            >
                                <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-all hover:border-blue-200 group">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-lg ${typeInfo.color.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                                            <TypeIcon className={`w-5 h-5 ${typeInfo.iconColor}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-medium text-gray-800 line-clamp-1">
                                                        {session.title || 'Untitled Session'}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                                                            {typeInfo.label}
                                                        </span>
                                                        {session.agent_used && (
                                                            <span className="text-xs text-gray-400">
                                                                via {session.agent_used}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                                            </div>
                                            {session.summary && (
                                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                                    {session.summary}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(session.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
