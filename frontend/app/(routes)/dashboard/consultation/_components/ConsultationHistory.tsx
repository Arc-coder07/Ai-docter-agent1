"use client"
import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import ReportModal from './ReportModal'
import { Clock, FileText, Stethoscope, ChevronRight, Search, Calendar } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Session = {
    id: string
    title: string
    doctor_name?: string
    summary?: string
    created_at: string
    conversation_type?: string
}

type ReportData = {
    id: string
    doctor: string
    user: string
    consultedOn: string
    agent?: string
    chiefComplaint?: string
    summary?: string
    symptoms?: string[]
    duration?: string
    severity?: string
}

export default function ConsultationHistory() {
    const { getToken } = useAuth()
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedReport, setSelectedReport] = useState<ReportData | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loadingReport, setLoadingReport] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const getAuthHeaders = async () => {
        const token = await getToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    useEffect(() => {
        loadSessions()
    }, [])

    const loadSessions = async () => {
        try {
            const headers = await getAuthHeaders()
            const response = await axios.get(`${API_URL}/api/v1/history/sessions`, { headers })
            setSessions(response.data.slice(0, 10))
        } catch (error) {
            console.error('Failed to load sessions:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffHours < 1) return 'Just now'
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return formatDate(dateString)
    }

    const getTypeColor = (type?: string) => {
        switch (type) {
            case 'medical_assistant': return { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20', dot: 'bg-purple-500' }
            case 'report_analysis': return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', dot: 'bg-emerald-500' }
            default: return { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20', dot: 'bg-blue-500' }
        }
    }

    const getTypeLabel = (type?: string) => {
        switch (type) {
            case 'medical_assistant': return 'AI Assistant'
            case 'report_analysis': return 'Report Analysis'
            default: return 'Voice Consultation'
        }
    }

    const viewReport = async (session: Session) => {
        setLoadingReport(session.id)
        try {
            const headers = await getAuthHeaders()
            const summaryResponse = await axios.get(
                `${API_URL}/api/v1/history/sessions/${session.id}/summary`,
                { headers }
            )
            const data = summaryResponse.data
            const summaryText = data.summary || ''

            const chiefComplaintMatch = summaryText.match(/Chief Complaint[:\s]*([\s\S]*?)(?=\n##|\n\*\*|$)/i)
            const chiefComplaint = chiefComplaintMatch ? chiefComplaintMatch[1].trim().replace(/\*\*/g, '') : ''

            const symptomsMatch = summaryText.match(/Symptoms[:\s]*([\s\S]*?)(?=\n##|\n\*\*|$)/i)
            const symptomsText = symptomsMatch ? symptomsMatch[1] : ''
            const symptoms = symptomsText
                .split(/[-•\n]/)
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0 && !s.startsWith('#'))

            const report: ReportData = {
                id: session.id,
                doctor: session.doctor_name || session.title?.split(' - ')[0] || 'General Physician',
                user: 'You',
                consultedOn: new Date(session.created_at).toLocaleString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit', hour12: true
                }),
                agent: data.agent_used,
                chiefComplaint: chiefComplaint || session.title,
                summary: summaryText,
                symptoms: symptoms.length > 0 ? symptoms : undefined,
                duration: 'Not specified',
                severity: ''
            }

            setSelectedReport(report)
            setIsModalOpen(true)
        } catch (error) {
            console.error('Failed to load report:', error)
        } finally {
            setLoadingReport(null)
        }
    }

    const filteredSessions = sessions.filter(s =>
        (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.doctor_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="mt-8">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold tracking-widest text-gray-500 uppercase">Patient Ledger</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{sessions.length} recorded consultations</p>
                    </div>
                </div>

                {/* Search */}
                {sessions.length > 0 && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search consultations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-64 transition-all"
                        />
                    </div>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="rounded-2xl border border-gray-100 p-5 animate-pulse">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Stethoscope className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-600">No consultations found</p>
                    <p className="text-sm text-gray-400 mt-1">Start a consultation to see your history here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredSessions.map((session, index) => {
                        const colors = getTypeColor(session.conversation_type)
                        return (
                            <div
                                key={session.id}
                                className="group relative rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#111111] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out overflow-hidden flex flex-col"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Subtle gradient accent on top */}
                                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="flex items-start justify-between gap-3 mb-4">
                                    {/* Left: Icon + Info */}
                                    <div className="flex gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0 transition-colors`}>
                                            <Stethoscope className={`w-5 h-5 ${colors.text}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {session.doctor_name || session.title?.split(' - ')[0] || 'General Physician'}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                {session.summary?.substring(0, 60) || session.title || 'Consultation'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Badge */}
                                <div className="mb-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${colors.bg} ${colors.text} flex-shrink-0`}>
                                        {getTypeLabel(session.conversation_type)}
                                    </span>
                                </div>

                                {/* Footer flex-grow pushes it to the bottom */}
                                <div className="mt-auto pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                                    <div className="flex flex-col gap-1 text-xs text-gray-400 font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(session.created_at)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatTime(session.created_at)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => viewReport(session)}
                                        disabled={loadingReport === session.id}
                                        className="flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold text-blue-600 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-all duration-300 disabled:opacity-50"
                                    >
                                        {loadingReport === session.id ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                                                Loading...
                                            </span>
                                        ) : (
                                            <>
                                                Report
                                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <ReportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                report={selectedReport}
            />
        </div>
    )
}
