"use client"
import React from 'react'
import { X, Stethoscope, User, Calendar, Bot, AlertTriangle, Clock, FileText, Download } from 'lucide-react'

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

interface ReportModalProps {
    isOpen: boolean
    onClose: () => void
    report: ReportData | null
}

export default function ReportModal({ isOpen, onClose, report }: ReportModalProps) {
    if (!isOpen || !report) return null

    const handlePrint = () => {
        window.print()
    }

    const getSeverityColor = (severity?: string) => {
        if (!severity) return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not specified' }
        const s = severity.toLowerCase()
        if (s.includes('high') || s.includes('severe')) return { bg: 'bg-red-50', text: 'text-red-600', label: severity }
        if (s.includes('moderate') || s.includes('medium')) return { bg: 'bg-amber-50', text: 'text-amber-600', label: severity }
        return { bg: 'bg-green-50', text: 'text-green-600', label: severity || 'Not specified' }
    }

    const severityInfo = getSeverityColor(report.severity)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header with Gradient */}
                <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Consultation Report</h2>
                                <p className="text-xs text-blue-100">AI Medical Voice Agent</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className="p-2 hover:bg-white/10 rounded-xl transition text-white/80 hover:text-white"
                                title="Print Report"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-xl transition text-white/80 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Session Info Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100/60">
                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Stethoscope className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">Doctor</p>
                                <p className="text-sm font-semibold text-gray-800">{report.doctor}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-purple-50/60 border border-purple-100/60">
                            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-purple-400">Patient</p>
                                <p className="text-sm font-semibold text-gray-800">{report.user}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100/60">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">Date</p>
                                <p className="text-sm font-semibold text-gray-800">{report.consultedOn}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-100/60">
                            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-400">Agent</p>
                                <p className="text-sm font-semibold text-gray-800">{report.agent || 'Voice Agent'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Chief Complaint */}
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Chief Complaint
                            </h3>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {report.chiefComplaint || 'Not specified'}
                            </p>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                AI Summary
                            </h3>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                {report.summary || 'No summary available'}
                            </p>
                        </div>
                    </div>

                    {/* Symptoms */}
                    {report.symptoms && report.symptoms.length > 0 && (
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                            <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Symptoms Reported
                                </h3>
                            </div>
                            <div className="px-4 py-3 flex flex-wrap gap-2">
                                {report.symptoms.map((symptom, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100/60"
                                    >
                                        {symptom}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Duration & Severity */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Duration</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-700">{report.duration || 'Not specified'}</p>
                        </div>
                        <div className={`rounded-xl border border-gray-100 p-4`}>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Severity</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${severityInfo.bg} ${severityInfo.text}`}>
                                {severityInfo.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/80">
                    <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                        ⚕️ This report was generated by an AI Medical Assistant for informational purposes only.
                        Always consult a qualified healthcare professional for medical advice.
                    </p>
                </div>
            </div>
        </div>
    )
}
