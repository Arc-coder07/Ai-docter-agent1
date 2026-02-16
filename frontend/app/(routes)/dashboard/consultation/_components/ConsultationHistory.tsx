"use client"
import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import ReportModal from './ReportModal'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Session = {
    id: string
    title: string
    doctor_name?: string
    summary?: string
    created_at: string
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
            setSessions(response.data.slice(0, 10)) // Latest 10
        } catch (error) {
            console.error('Failed to load sessions:', error)
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
        if (diffHours < 24) return `${diffHours} hours ago`
        if (diffDays < 7) return `${diffDays} days ago`
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        })
    }

    const viewReport = async (session: Session) => {
        setLoadingReport(session.id)
        try {
            const headers = await getAuthHeaders()
            // Generate summary if not available
            const summaryResponse = await axios.get(
                `${API_URL}/api/v1/history/sessions/${session.id}/summary`,
                { headers }
            )
            const data = summaryResponse.data

            // Parse the summary to extract structured data
            const summaryText = data.summary || ''

            // Extract chief complaint (first section)
            const chiefComplaintMatch = summaryText.match(/Chief Complaint[:\s]*([\s\S]*?)(?=\n##|\n\*\*|$)/i)
            const chiefComplaint = chiefComplaintMatch ? chiefComplaintMatch[1].trim().replace(/\*\*/g, '') : ''

            // Extract symptoms
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
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
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

    return (
        <div className="mt-8 bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                    Previous Consultation Reports
                </h2>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <p>No previous consultations</p>
                    <p className="text-sm mt-1">Start a consultation to see your history here</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-500 border-b">
                                <th className="pb-3 font-medium">AI Medical Specialist</th>
                                <th className="pb-3 font-medium">Description</th>
                                <th className="pb-3 font-medium">Date</th>
                                <th className="pb-3 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session) => (
                                <tr key={session.id} className="border-b last:border-0">
                                    <td className="py-4 text-sm font-medium text-gray-800">
                                        {session.doctor_name || session.title?.split(' - ')[0] || 'General Physician'}
                                    </td>
                                    <td className="py-4 text-sm text-gray-600 max-w-xs truncate">
                                        {session.summary?.substring(0, 50) || session.title || 'Consultation'}
                                    </td>
                                    <td className="py-4 text-sm text-gray-500">
                                        {formatDate(session.created_at)}
                                    </td>
                                    <td className="py-4 text-right">
                                        <button
                                            onClick={() => viewReport(session)}
                                            disabled={loadingReport === session.id}
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                                        >
                                            {loadingReport === session.id ? 'Loading...' : 'View Report'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
