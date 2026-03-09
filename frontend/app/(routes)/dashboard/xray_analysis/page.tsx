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
    Activity,
    ArrowLeft,
    Stethoscope,
    Shield,
    User,
    Download,
    Eye,
    BarChart3,
    Clock,
    FileText,
    ChevronDown,
    ChevronUp,
    Zap,
    Target,
    TrendingUp,
    Info
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
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
    analysis_time?: number
    heatmap_base64?: string
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

// Loading step messages for the analysis progress
const LOADING_STEPS = [
    { label: 'Uploading image...', icon: UploadCloud },
    { label: 'Preprocessing X-ray...', icon: Zap },
    { label: 'Running AI analysis...', icon: Activity },
    { label: 'Generating AI focus map...', icon: Eye },
    { label: 'Preparing results...', icon: CheckCircle },
]

export default function XrayAnalysis() {
    const { getToken } = useAuth()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [patientName, setPatientName] = useState('')
    const [patientAge, setPatientAge] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingStep, setLoadingStep] = useState(0)
    const [result, setResult] = useState<ScanResult | null>(null)
    const [history, setHistory] = useState<ScanHistoryItem[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [showHeatmap, setShowHeatmap] = useState(false)
    const [showStats, setShowStats] = useState(false)
    const [downloadingPdf, setDownloadingPdf] = useState(false)

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    useEffect(() => {
        fetchHistory()
    }, [])

    // Animate loading steps
    useEffect(() => {
        if (!loading) {
            setLoadingStep(0)
            return
        }
        const interval = setInterval(() => {
            setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev))
        }, 2000)
        return () => clearInterval(interval)
    }, [loading])

    const fetchHistory = async () => {
        try {
            const token = await getToken()
            const res = await fetch(`${API_URL}/api/v1/xray/history`, {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            })
            if (res.ok) {
                const data = await res.json()
                setHistory(data)
            }
        } catch (err) {
            console.error('Failed to load history:', err)
        }
    }

    const handleFileSelect = (selectedFile: File) => {
        const isDicom = selectedFile.name.toLowerCase().endsWith('.dcm')
        if (!isDicom && !selectedFile.type.startsWith('image/')) {
            alert('Please select an image file (JPEG, PNG) or DICOM (.dcm) file')
            return
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            alert('File size must be under 10MB')
            return
        }
        setFile(selectedFile)
        setResult(null)
        setShowHeatmap(false)

        if (isDicom) {
            // For DICOM files, show a placeholder
            setPreview('dicom')
        } else {
            const reader = new FileReader()
            reader.onload = (e) => setPreview(e.target?.result as string)
            reader.readAsDataURL(selectedFile)
        }
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
        setShowHeatmap(false)

        try {
            const formData = new FormData()
            formData.append('file', file)
            if (patientName) formData.append('patient_name', patientName)
            if (patientAge) formData.append('patient_age', patientAge)

            const token = await getToken()

            const fetchResponse = await fetch(`${API_URL}/api/v1/xray/predict`, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: formData,
            })

            if (!fetchResponse.ok) {
                const errorBody = await fetchResponse.json().catch(() => ({}))
                throw new Error(errorBody.detail || `Server error: ${fetchResponse.status} ${fetchResponse.statusText}`)
            }

            const data = await fetchResponse.json()
            setResult(data)
            fetchHistory()
        } catch (err: any) {
            console.error('Analysis failed:', err)
            alert(err.message || 'Analysis failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadPdf = async () => {
        if (!result?.id) return
        setDownloadingPdf(true)

        try {
            const token = await getToken()
            const res = await fetch(`${API_URL}/api/v1/xray/report/${result.id}`, {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            })

            if (!res.ok) throw new Error('Failed to generate report')

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `MedSage_Xray_Report_${result.id.slice(0, 8)}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err: any) {
            console.error('PDF download failed:', err)
            alert('Failed to download report. Please try again.')
        } finally {
            setDownloadingPdf(false)
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
        setShowHeatmap(false)
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
        return diagnosis === 'PNEUMONIA' ? 'text-red-600' : 'text-green-600'
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
        setShowHeatmap(false)
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
                                accept="image/*,.dcm"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {preview ? (
                                <div className="space-y-4">
                                    {preview === 'dicom' ? (
                                        <div className="w-48 h-48 mx-auto rounded-xl bg-gray-800 flex items-center justify-center shadow-md">
                                            <div className="text-center">
                                                <FileText className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                                                <p className="text-blue-300 text-sm font-medium">DICOM File</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <img
                                            src={preview}
                                            alt="X-ray preview"
                                            className="max-h-80 mx-auto rounded-xl shadow-md"
                                        />
                                    )}
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
                                            or click to browse (JPEG, PNG, DICOM — max 10MB)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Analyze Button with Loading Steps */}
                        <div className="mt-6 flex flex-col items-center gap-3">
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

                            {/* Loading Steps */}
                            {loading && (
                                <div className="w-full max-w-md mx-auto">
                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                        <div className="space-y-2">
                                            {LOADING_STEPS.map((step, idx) => {
                                                const StepIcon = step.icon
                                                const isActive = idx === loadingStep
                                                const isDone = idx < loadingStep

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center gap-3 text-sm transition-all duration-300 ${isActive ? 'text-indigo-700 font-medium' :
                                                            isDone ? 'text-green-600' : 'text-gray-400'
                                                            }`}
                                                    >
                                                        {isDone ? (
                                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        ) : isActive ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
                                                        ) : (
                                                            <StepIcon className="w-4 h-4 flex-shrink-0" />
                                                        )}
                                                        <span>{step.label}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results Section */}
                    {result && (
                        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                Analysis Results
                                {result.analysis_time && (
                                    <span className="ml-auto text-sm font-normal text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {result.analysis_time}s
                                    </span>
                                )}
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

                                {/* Animated Confidence Bar */}
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
                                <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                                    <Info className="w-4 h-4" /> Recommendation
                                </h3>
                                <p className="text-gray-700">{result.recommendation}</p>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                {/* AI Focus Heatmap Button */}
                                {result.heatmap_base64 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowHeatmap(!showHeatmap)}
                                        className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {showHeatmap ? 'Hide' : 'Show'} AI Focus
                                    </Button>
                                )}

                                {/* Download PDF Report */}
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadPdf}
                                    disabled={downloadingPdf}
                                    className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                >
                                    {downloadingPdf ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    {downloadingPdf ? 'Generating...' : 'Download PDF Report'}
                                </Button>

                                {/* Toggle Model Stats */}
                                <Button
                                    variant="outline"
                                    onClick={() => setShowStats(!showStats)}
                                    className="flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    Model Performance
                                    {showStats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </Button>
                            </div>

                            {/* AI Focus Heatmap Display */}
                            {showHeatmap && result.heatmap_base64 && (
                                <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
                                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                            <Eye className="w-5 h-5 text-blue-400" />
                                            AI Focus Analysis
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Original X-ray */}
                                            {preview && preview !== 'dicom' && (
                                                <div>
                                                    <p className="text-gray-400 text-sm mb-2 text-center">Original X-ray</p>
                                                    <img
                                                        src={preview}
                                                        alt="Original X-ray"
                                                        className="w-full rounded-xl shadow-lg"
                                                    />
                                                </div>
                                            )}
                                            {/* Heatmap */}
                                            <div>
                                                <p className="text-gray-400 text-sm mb-2 text-center">AI Attention Map</p>
                                                <img
                                                    src={`data:image/png;base64,${result.heatmap_base64}`}
                                                    alt="AI Focus Heatmap"
                                                    className="w-full rounded-xl shadow-lg"
                                                />
                                            </div>
                                        </div>

                                        {/* Color Legend */}
                                        <div className="mt-4 flex items-center justify-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-blue-600" />
                                                <span className="text-gray-400 text-xs">Low Attention</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-green-500" />
                                                <span className="text-gray-400 text-xs">Medium</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-yellow-400" />
                                                <span className="text-gray-400 text-xs">High</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-red-500" />
                                                <span className="text-gray-400 text-xs">Critical Focus</span>
                                            </div>
                                        </div>

                                        <p className="text-gray-500 text-xs mt-3 text-center italic">
                                            This visualization shows where the AI model focused during analysis.
                                            Red/yellow areas indicate regions of high attention.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Model Performance Stats */}
                            {showStats && (
                                <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                                        <h3 className="text-sm font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4" />
                                            Model Validation Performance
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                                                </div>
                                                <p className="text-2xl font-bold text-indigo-700">86%</p>
                                                <p className="text-xs text-gray-500">Accuracy</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                                                </div>
                                                <p className="text-2xl font-bold text-green-700">96.4%</p>
                                                <p className="text-xs text-gray-500">Sensitivity</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                                                </div>
                                                <p className="text-2xl font-bold text-blue-700">74.8%</p>
                                                <p className="text-xs text-gray-500">Specificity</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                    <Activity className="w-3.5 h-3.5 text-purple-500" />
                                                </div>
                                                <p className="text-2xl font-bold text-purple-700">0.964</p>
                                                <p className="text-xs text-gray-500">ROC AUC</p>
                                            </div>
                                        </div>

                                        {/* Confusion Matrix Summary */}
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <h4 className="text-xs font-semibold text-gray-600 mb-2">Cross-Operator Validation (485 samples)</h4>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex justify-between bg-green-50 rounded p-2">
                                                    <span className="text-gray-600">True Positives</span>
                                                    <span className="font-bold text-green-700">242</span>
                                                </div>
                                                <div className="flex justify-between bg-green-50 rounded p-2">
                                                    <span className="text-gray-600">True Negatives</span>
                                                    <span className="font-bold text-green-700">175</span>
                                                </div>
                                                <div className="flex justify-between bg-red-50 rounded p-2">
                                                    <span className="text-gray-600">False Positives</span>
                                                    <span className="font-bold text-red-600">59</span>
                                                </div>
                                                <div className="flex justify-between bg-red-50 rounded p-2">
                                                    <span className="text-gray-600">False Negatives</span>
                                                    <span className="font-bold text-red-600">9</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-500 mt-3 text-center">
                                            MobileNetV2 architecture · Validated on 485 independent samples · Good generalization
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Additional Info Grid */}
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
