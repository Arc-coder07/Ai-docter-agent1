"use client"
import React, { useState } from 'react'
import { X } from 'lucide-react'

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🩺</span>
                        <h2 className="text-lg font-semibold text-blue-600">Medical AI Voice Agent Report</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* Session Info */}
                    <section>
                        <h3 className="text-blue-500 font-semibold mb-2 pb-1 border-b-2 border-blue-200">
                            Session Info
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">Doctor:</span>{' '}
                                <span className="text-gray-600">{report.doctor}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">User:</span>{' '}
                                <span className="text-gray-600">{report.user}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Consulted On:</span>{' '}
                                <span className="text-gray-600">{report.consultedOn}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Agent:</span>{' '}
                                <span className="text-gray-600">{report.agent || 'Voice Agent'}</span>
                            </div>
                        </div>
                    </section>

                    {/* Chief Complaint */}
                    <section>
                        <h3 className="text-blue-500 font-semibold mb-2 pb-1 border-b-2 border-blue-200">
                            Chief Complaint
                        </h3>
                        <p className="text-sm text-gray-600">
                            {report.chiefComplaint || 'Not specified'}
                        </p>
                    </section>

                    {/* Summary */}
                    <section>
                        <h3 className="text-blue-500 font-semibold mb-2 pb-1 border-b-2 border-blue-200">
                            Summary
                        </h3>
                        <p className="text-sm text-gray-600">
                            {report.summary || 'No summary available'}
                        </p>
                    </section>

                    {/* Symptoms */}
                    <section>
                        <h3 className="text-blue-500 font-semibold mb-2 pb-1 border-b-2 border-blue-200">
                            Symptoms
                        </h3>
                        {report.symptoms && report.symptoms.length > 0 ? (
                            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                                {report.symptoms.map((symptom, i) => (
                                    <li key={i}>{symptom}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-600">No symptoms recorded</p>
                        )}
                    </section>

                    {/* Duration & Severity */}
                    <section>
                        <h3 className="text-blue-500 font-semibold mb-2 pb-1 border-b-2 border-blue-200">
                            Duration & Severity
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">Duration:</span>{' '}
                                <span className="text-gray-600">{report.duration || 'Not specified'}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Severity:</span>{' '}
                                <span className="text-gray-600">{report.severity || 'Not specified'}</span>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 text-center">
                    <p className="text-xs text-gray-400">
                        This report was generated by an AI Medical Assistant for informational purposes only.
                    </p>
                </div>
            </div>
        </div>
    )
}
