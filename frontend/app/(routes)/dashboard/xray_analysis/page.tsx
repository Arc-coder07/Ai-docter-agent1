"use client"
import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Loader2,
    UploadCloud,
    History,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Activity,
    ArrowLeft,
    Stethoscope,
    Shield,
    User
} from 'lucide-react'
import { useApiClient } from "@/lib/api"
import Link from 'next/link'

type ScanResult = {
    id: string
    diagnosis: string
    confidence: number
    confidence_level: string
    recommendation: string
    raw_score: number
    image_size?: string
    file_name?: string
    patient_name?: string
    patient_age?: number
    validation_metrics?: Record<string, any>
    disclaimer?: string
    created_at: string
}

type ScanHistoryItem = {
    id: string
    file_name: string
    patient_name: string | null
    patient_age: number | null
    diagnosis: string
    confidence: number
    confidence_level: string
    recommendation: string
    created_at: string
}

export default function XrayAnalysis() {
    const apiClient = useApiClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [patientName, setPatientName] = useState('')
    const [patientAge, setPatientAge] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ScanResult | null>(null)
    const [history, setHistory] = useState<ScanHistoryItem[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [dragActive, setDragActive] = useState(false)

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        try {
            const data = await apiClient('/xray/history')
            setHistory(data.data || data)
        } catch (err) {
            console.error('Failed to load history:', err)
        }
    }

    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/')) {
            alert('Please select an image file (JPEG, PNG, etc.)')
            return
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            alert('File size must be under 10MB')
            return
        }
        setFile(selectedFile)
        setResult(null)

        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target?.result as string)
        reader.readAsDataURL(selectedFile)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFileSelect(e.target.files[0])
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files?.[0]) {
            handleFileSelect(e.dataTransfer.files[0])
        }
    }

    const handleAnalyze = async () => {
        if (!file) return
        setLoading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('file', file)
            if (patientName) formData.append('patient_name', patientName)
            if (patientAge) formData.append('patient_age', patientAge)

            const response = await apiClient('/xray/predict', {
                method: 'POST',
                body: formData,
                isFormData: true
            })

            const data = response.data || response
            setResult(data)
            fetchHistory()
        } catch (err: any) {
            console.error('Analysis failed:', err)
            alert(err.message || 'Analysis failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectHistory = (item: ScanHistoryItem) => {
        setResult({
            id: item.id,
            diagnosis: item.diagnosis,
            confidence: item.confidence,
            confidence_level: item.confidence_level,
            recommendation: item.recommendation,
            raw_score: 0,
            file_name: item.file_name,
            patient_name: item.patient_name || undefined,
            patient_age: item.patient_age || undefined,
            created_at: item.created_at
        })
        setShowHistory(false)
        setPreview(null)
        setFile(null)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getDiagnosisColor = (diagnosis: string) => {
        return diagnosis === 'PNEUMONIA'
            ? 'text-red-600'
            : 'text-green-600'
    }

    const getConfidenceBg = (level: string) => {
        switch (level) {
            case 'High': return 'bg-green-100 text-green-800'
            case 'Moderate': return 'bg-yellow-100 text-yellow-800'
            case 'Low': return 'bg-orange-100 text-orange-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const resetForm = () => {
        setFile(null)
        setPreview(null)
        setResult(null)
        setPatientName('')
        setPatientAge('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Stethoscope className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-800">Chest X-ray Analysis</h1>
                                <p className="text-xs text-gray-500">AI-Powered Pneumonia Detection</p>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-1"
                    >
                        <History className="w-4 h-4" />
                        History ({history.length})
                    </Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
                {/* Main Content */}
                <div className={`flex-1 transition-all duration-300 ${showHistory ? 'mr-0' : ''}`}>
                    {/* Upload Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8 mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <UploadCloud className="w-5 h-5 text-blue-600" />
                            Upload Chest X-ray
                        </h2>

                        {/* Patient Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-sm font-medium text-gray-600 mb-1 block">
                                    Patient Name <span className="text-gray-400">(optional)</span>
                                </label>
                                <Input
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                    placeholder="Enter patient name"
                                    className="bg-gray-50 border-gray-200"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600 mb-1 block">
                                    Patient Age <span className="text-gray-400">(optional)</span>
                                </label>
                                <Input
                                    type="number"
                                    value={patientAge}
                                    onChange={(e) => setPatientAge(e.target.value)}
                                    placeholder="Enter age"
                                    className="bg-gray-50 border-gray-200"
                                />
                            </div>
                        </div>

                        {/* Drag & Drop Zone */}
                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer
                ${dragActive
                                    ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                                    : preview
                                        ? 'border-green-300 bg-green-50/50'
                                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
                                }
              `}
                            onClick={() => fileInputRef.current?.click()}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {preview ? (
                                <div className="space-y-4">
                                    <img
                                        src={preview}
                                        alt="X-ray preview"
                                        className="max-h-80 mx-auto rounded-xl shadow-md"
                                    />
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">{file?.name}</span>
                                        <span className="text-gray-400 ml-2">
                                            ({((file?.size || 0) / 1024).toFixed(1)} KB)
                                        </span>
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); resetForm() }}
                                        className="text-sm text-red-500 hover:text-red-600 underline"
                                    >
                                        Remove & Upload Different Image
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 flex items-center justify-center">
                                        <UploadCloud className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-gray-700 font-medium">
                                            Drag & drop your chest X-ray image here
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            or click to browse (JPEG, PNG — max 10MB)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Analyze Button */}
                        <div className="mt-6 flex justify-center">
                            <Button
                                onClick={handleAnalyze}
                                disabled={!file || loading}
                                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl text-base font-semibold shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Analyzing X-ray...
                                    </>
                                ) : (
                                    <>
                                        <Activity className="w-5 h-5 mr-2" />
                                        Analyze X-ray
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Results Section */}
                    {result && (
                        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                Analysis Results
                            </h2>

                            {/* Diagnosis Banner */}
                            <div className={`rounded-2xl p-6 mb-6 ${result.diagnosis === 'PNEUMONIA'
                                    ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200'
                                    : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${result.diagnosis === 'PNEUMONIA'
                                                ? 'bg-red-100'
                                                : 'bg-green-100'
                                            }`}>
                                            {result.diagnosis === 'PNEUMONIA' ? (
                                                <AlertTriangle className="w-7 h-7 text-red-600" />
                                            ) : (
                                                <CheckCircle className="w-7 h-7 text-green-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Diagnosis</p>
                                            <p className={`text-2xl font-bold ${getDiagnosisColor(result.diagnosis)}`}>
                                                {result.diagnosis}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500 font-medium">Confidence</p>
                                        <p className="text-3xl font-bold text-gray-800">{result.confidence}%</p>
                                        <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold ${getConfidenceBg(result.confidence_level)}`}>
                                            {result.confidence_level}
                                        </span>
                                    </div>
                                </div>

                                {/* Confidence Bar */}
                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${result.diagnosis === 'PNEUMONIA'
                                                    ? 'bg-gradient-to-r from-red-400 to-red-600'
                                                    : 'bg-gradient-to-r from-green-400 to-green-600'
                                                }`}
                                            style={{ width: `${result.confidence}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Recommendation */}
                            <div className="bg-blue-50 rounded-xl p-5 mb-6 border border-blue-100">
                                <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 Recommendation</h3>
                                <p className="text-gray-700">{result.recommendation}</p>
                            </div>

                            {/* Additional Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {result.patient_name && (
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-gray-500">Patient</p>
                                        <p className="font-semibold text-gray-700 text-sm">{result.patient_name}</p>
                                    </div>
                                )}
                                {result.patient_age && (
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-gray-500">Age</p>
                                        <p className="font-semibold text-gray-700 text-sm">{result.patient_age}</p>
                                    </div>
                                )}
                                {result.file_name && (
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-gray-500">File</p>
                                        <p className="font-semibold text-gray-700 text-sm truncate">{result.file_name}</p>
                                    </div>
                                )}
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500">Analyzed</p>
                                    <p className="font-semibold text-gray-700 text-sm">{formatDate(result.created_at)}</p>
                                </div>
                            </div>

                            {/* Model Performance */}
                            {result.validation_metrics && (
                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 mb-6 border border-indigo-100">
                                    <h3 className="text-sm font-semibold text-indigo-800 mb-3">📊 Model Validation Metrics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-indigo-700">{result.validation_metrics.accuracy}%</p>
                                            <p className="text-xs text-gray-500">Accuracy</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-indigo-700">{result.validation_metrics.sensitivity}%</p>
                                            <p className="text-xs text-gray-500">Sensitivity</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-indigo-700">{result.validation_metrics.specificity}%</p>
                                            <p className="text-xs text-gray-500">Specificity</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-indigo-700">{result.validation_metrics.precision}%</p>
                                            <p className="text-xs text-gray-500">Precision</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3 text-center">
                                        Validated on {result.validation_metrics.validated_on}
                                    </p>
                                </div>
                            )}

                            {/* Disclaimer */}
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-amber-800">
                                        {result.disclaimer || "This AI system is for preliminary screening only. It is NOT a replacement for professional medical diagnosis. Always consult qualified healthcare professionals for medical decisions."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* History Sidebar */}
                {showHistory && (
                    <div className="w-80 flex-shrink-0 animate-in slide-in-from-right duration-300">
                        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5 sticky top-24">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" />
                                Scan History
                            </h3>

                            {history.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No scans yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                    {history.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelectHistory(item)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-sm ${result?.id === item.id
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-sm font-bold ${getDiagnosisColor(item.diagnosis)}`}>
                                                    {item.diagnosis}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceBg(item.confidence_level)}`}>
                                                    {item.confidence}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 truncate">{item.file_name}</p>
                                            {item.patient_name && (
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <User className="w-3 h-3" /> {item.patient_name}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">{formatDate(item.created_at)}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
