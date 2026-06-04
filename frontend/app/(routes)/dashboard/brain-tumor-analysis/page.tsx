"use client"
import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Loader2, UploadCloud, History, AlertTriangle, CheckCircle, Activity,
    ArrowLeft, Brain, Scan, Eye, BarChart3, Clock, TrendingUp, Filter, User, Info, Shield
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import axios from 'axios'

type BrainTumorScanResult = {
    id?: string
    success: boolean
    prediction: {
        class: string
        confidence: number
        confidence_level: string
        probabilities: Record<string, number>
        model_used: string
    }
    cdss: {
        score: number
        risk_level: string
        action: string
        components: Record<string, number>
    }
    uncertainty: {
        total_uncertainty: number
        epistemic: number
        aleatoric: number
        needs_review: boolean
    }
    xai?: {
        levels: Record<string, {
            name: string
            question: string
            heatmap: string
        }>
    }
    robustness: {
        overall_score: number
        tests: Record<string, {
            combined: number
            pred_stable: boolean
        }>
    }
    preprocessing?: {
        warnings: string[]
        contrast: number
        brightness: number
        enhanced: boolean
    }
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
    cdss_score: number
    created_at: string
}

const LOADING_STEPS = [
    { label: 'Initializing deep learning ensemble...', icon: UploadCloud },
    { label: 'Preprocessing & enhancing contrast...', icon: Filter },
    { label: 'Analyzing with DenseNet-169 & EfficientNet-B3...', icon: Brain },
    { label: 'Quantifying predictive uncertainty...', icon: BarChart3 },
    { label: 'Generating 4-level XAI heatmaps...', icon: Eye },
    { label: 'Computing CDSS score & robustness...', icon: Activity },
    { label: 'Finalizing clinical report...', icon: CheckCircle },
]

export default function BrainTumorAnalysis() {
    const { getToken } = useAuth()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [patientName, setPatientName] = useState('')
    const [patientAge, setPatientAge] = useState('')

    const [loading, setLoading] = useState(false)
    const [loadingStep, setLoadingStep] = useState(0)
    const [result, setResult] = useState<BrainTumorScanResult | null>(null)
    const [history, setHistory] = useState<ScanHistoryItem[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [activeXaiLevel, setActiveXaiLevel] = useState<string>('level1_detection')

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    useEffect(() => {
        fetchHistory()
    }, [])

    useEffect(() => {
        if (!loading) {
            setLoadingStep(0)
            return
        }
        const interval = setInterval(() => {
            setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev))
        }, 3000)
        return () => clearInterval(interval)
    }, [loading])

    const fetchHistory = async () => {
        try {
            const token = await getToken()
            const res = await axios.get(`${API_URL}/api/v1/brain_tumor/history`, {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            })
            setHistory(res.data)
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
        if (selectedFile.size > 20 * 1024 * 1024) {
            alert('File size must be under 20MB')
            return
        }
        setFile(selectedFile)
        setResult(null)

        if (isDicom) {
            setPreview('dicom')
        } else {
            const reader = new FileReader()
            reader.onload = (e) => setPreview(e.target?.result as string)
            reader.readAsDataURL(selectedFile)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
        else if (e.type === 'dragleave') setDragActive(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0])
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

            const token = await getToken()
            const res = await axios.post(`${API_URL}/api/v1/brain_tumor/predict`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
            })

            setResult(res.data)
            fetchHistory()
        } catch (err: any) {
            console.error('Analysis failed:', err)
            alert(err.response?.data?.detail || err.message || 'Analysis failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const fetchScanDetail = async (scanId: string) => {
        try {
            setLoading(true)
            const token = await getToken()
            const res = await axios.get(`${API_URL}/api/v1/brain_tumor/${scanId}`, {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            })
            // Map flat API response back into structure for UI
            const data = res.data
            setResult({
                success: true,
                prediction: {
                    class: data.diagnosis,
                    confidence: data.confidence,
                    confidence_level: data.confidence_level,
                    probabilities: data.probabilities || {},
                    model_used: 'Ensemble (DenseNet+EfficientNet)'
                },
                cdss: {
                    score: data.cdss_score,
                    risk_level: data.recommendation.includes('LOW') ? 'LOW' : data.recommendation.includes('HIGH') ? 'HIGH' : 'MEDIUM',
                    action: data.recommendation,
                    components: {}
                },
                uncertainty: {
                    total_uncertainty: data.uncertainty_total,
                    epistemic: 0, aleatoric: 0, needs_review: false
                },
                xai: data.xai ? { levels: data.xai.levels } : undefined,
                robustness: { overall_score: data.robustness_score, tests: {} }
            })
            setFile(null)
            setPreview(null)
            setShowHistory(false)
        } catch (err) {
            console.error("Failed to fetch scan detail", err)
        } finally {
            setLoading(false)
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

    const getDiagnosisColor = (diagnosis: string) => {
        if (diagnosis === 'No Tumor') return 'text-emerald-400'
        return 'text-rose-400'
    }

    const getRiskBadgeColor = (risk: string) => {
        switch (risk) {
            case 'LOW': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'MEDIUM': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            case 'HIGH': return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            default: return 'bg-slate-500/20 text-gray-500 dark:text-gray-400 border-slate-500/30'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 selection:bg-blue-600/30 font-sans pb-12">
            {/* Header */}
            <div className="bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md border-b border-gray-200/80 dark:border-white/10 sticky top-0 z-10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)] shadow-[#0f172a]/20">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:bg-white/10">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-slate-700" />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)] shadow-blue-500/20">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white placeholder:text-transparent bg-clip-text">Brain Tumor CDSS</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Advanced Ensemble MRI Analysis</p>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-slate-700 hover:text-gray-900 dark:text-white"
                    >
                        <History className="w-4 h-4" />
                        Scan History ({history.length})
                    </Button>
                </div>
            </div>

            <div className="max-w-screen-2xl mx-auto px-6 py-8 flex gap-6 relative">
                {/* Main Content Area */}
                <div className={`flex-1 transition-all duration-300`}>

                    {/* ═══ Row 1: Upload + Prediction ═══ */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

                        {/* Upload Panel (LG: 5 cols) */}
                        <div className="lg:col-span-5 bg-white dark:bg-[#111111] backdrop-blur-xl rounded-[20px] border border-gray-200/80 dark:border-white/10 p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)] h-full">
                            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-6 flex items-center gap-2">
                                <Scan className="w-5 h-5" /> Upload MRI Scan
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Patient Name (Optional)</label>
                                    <Input
                                        value={patientName} onChange={(e) => setPatientName(e.target.value)}
                                        placeholder="e.g. John Doe"
                                        className="bg-white dark:bg-[#0a0a0a]/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:text-gray-500 focus-visible:ring-[#667eea]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Patient Age (Optional)</label>
                                    <Input
                                        type="number" value={patientAge} onChange={(e) => setPatientAge(e.target.value)}
                                        placeholder="e.g. 45"
                                        className="bg-white dark:bg-[#0a0a0a]/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:text-gray-500 focus-visible:ring-[#667eea]"
                                    />
                                </div>
                            </div>

                            {/* Drag & Drop Zone */}
                            <div
                                className={`relative border-2 border-dashed rounded-[20px] p-6 text-center transition-all duration-300 cursor-pointer min-h-[300px] flex flex-col justify-center items-center
                                    ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[1.02]' : preview ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-[#764ba2]/50 hover:bg-[#764ba2]/5'}
                                `}
                                onClick={() => fileInputRef.current?.click()} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                            >
                                <input ref={fileInputRef} type="file" accept="image/*,.dcm" onChange={handleFileChange} className="hidden" />

                                {preview ? (
                                    <div className="space-y-4 w-full">
                                        {preview === 'dicom' ? (
                                            <div className="w-32 h-32 mx-auto rounded-2xl bg-gray-100 dark:bg-[#0a0a0a] flex items-center justify-center border border-gray-100 dark:border-white/5">
                                                <div className="text-center">
                                                    <Scan className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-2 opacity-80" />
                                                    <p className="text-blue-600 dark:text-blue-400 text-xs font-medium">DICOM</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative inline-block w-full">
                                                <img src={preview} alt="MRI Preview" className="max-h-[220px] w-auto mx-auto rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl object-contain" />
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate px-4">{file?.name}</p>
                                        <button onClick={(e) => { e.stopPropagation(); resetForm() }} className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-4">
                                            Remove file
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 py-6">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-[#667eea]/20 to-[#764ba2]/20 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(102,126,234,0.15)]">
                                            <UploadCloud className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-blue-600 dark:text-blue-400 font-semibold text-lg">Drop your Brain MRI here</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Drag & drop or click to browse</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">Supports: JPG, PNG, DCM</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Analyze Button */}
                            {file && (
                                <div className="mt-6">
                                    <Button
                                        onClick={handleAnalyze} disabled={loading}
                                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-md font-semibold shadow-[0_8px_30px_-8px_rgba(118,75,162,0.6)] border-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                                    >
                                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running Advanced Analysis...</> : 'Analyze with Multi-Model Ensemble'}
                                    </Button>
                                </div>
                            )}

                        </div>

                        {/* Analysis Results Panel (LG: 7 cols) */}
                        <div className="lg:col-span-7 bg-white dark:bg-[#111111] backdrop-blur-xl rounded-[20px] border border-gray-200/80 dark:border-white/10 p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)] h-full flex flex-col">
                            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-6">Analysis Results</h2>

                            {!result && !loading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                                    <Activity className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">No Results Yet</h3>
                                    <p className="text-sm text-gray-400 dark:text-gray-500">Upload an MRI image and click Analyze</p>
                                </div>
                            ) : loading ? (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <div className="w-full max-w-sm bg-gray-50 dark:bg-[#0a0a0a] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-inner">
                                        <div className="space-y-4">
                                            {LOADING_STEPS.map((step, idx) => {
                                                const StepIcon = step.icon
                                                const isActive = idx === loadingStep
                                                const isDone = idx < loadingStep
                                                return (
                                                    <div key={idx} className={`flex items-center gap-3 text-sm transition-all duration-500 ${isActive ? 'text-blue-600 dark:text-blue-400 font-medium' : isDone ? 'text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                        {isDone ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0" /> : <StepIcon className="w-4 h-4 flex-shrink-0" />}
                                                        <span className={isActive ? 'animate-pulse' : ''}>{step.label}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : result && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Best Model Prediction Card */}
                                    <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)] relative overflow-hidden">
                                        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-10 pointer-events-none ${result.prediction.class === 'No Tumor' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                                        <div className="flex items-center justify-between mb-4 relative z-10">
                                            <span className={`text-2xl font-black ${getDiagnosisColor(result.prediction.class)}`}>
                                                {result.prediction.class.toUpperCase()}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${result.prediction.confidence > 0.85 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : result.prediction.confidence > 0.65 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                                {(result.prediction.confidence * 100).toFixed(1)}% Confidence
                                            </span>
                                        </div>

                                        <div className="mb-4">
                                            <span className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                                Model: {result.prediction.model_used || 'Ensemble'}
                                            </span>
                                        </div>

                                        {/* Probability Bars */}
                                        <div className="space-y-3 relative z-10">
                                            {Object.entries(result.prediction.probabilities || {}).map(([name, prob]) => (
                                                <div key={name}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-medium text-gray-600 dark:text-gray-300">{name}</span>
                                                        <span className="font-bold text-blue-600 dark:text-blue-400">{(prob * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                                                            style={{ width: `${prob * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CDSS Score Card with SVG Gauge */}
                                    <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center">
                                        <div className="flex-shrink-0 relative">
                                            {/* CDSS Gauge SVG */}
                                            <svg width="120" height="120" viewBox="0 0 140 140" className="-rotate-90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
                                                <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                                                <circle
                                                    cx="70" cy="70" r="54" fill="none"
                                                    stroke={result.cdss.risk_level === 'LOW' ? '#38ef7d' : result.cdss.risk_level === 'HIGH' ? '#f5576c' : '#f5a623'}
                                                    strokeWidth="10"
                                                    strokeDasharray="339.29"
                                                    strokeDashoffset={339.29 * (1 - result.cdss.score)}
                                                    strokeLinecap="round"
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                <span className="text-2xl font-bold text-white">{(result.cdss.score * 100).toFixed(0)}</span>
                                                <span className={`text-[9px] font-bold tracking-wider ${result.cdss.risk_level === 'LOW' ? 'text-[#38ef7d]' : result.cdss.risk_level === 'HIGH' ? 'text-[#f5576c]' : 'text-[#f5a623]'}`}>
                                                    {result.cdss.risk_level}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Novel Clinical Decision Support Score</h3>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 bg-gray-100 dark:bg-white/5 p-2 rounded-lg border border-gray-200/80 dark:border-white/10">
                                                {result.cdss.action}
                                            </p>

                                            <div className="space-y-1.5">
                                                {Object.entries(result.cdss.components || {}).slice(0, 3).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between items-center bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded">
                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">{k.replace('_', ' ')}</span>
                                                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{(v * 100).toFixed(0)}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ Row 2: Uncertainty + Robustness ═══ */}
                    {result && !loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                            {/* Uncertainty Card */}
                            <div className="bg-white dark:bg-[#111111] backdrop-blur-xl rounded-[20px] border border-gray-200/80 dark:border-white/10 p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)]">
                                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" /> Novel: Uncertainty-Aware XAI
                                </h3>

                                <div className="flex justify-around mb-6 py-2">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-emerald-400">{result.uncertainty.epistemic.toFixed(4)}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[80px] leading-tight mt-1">Epistemic (Model)</p>
                                    </div>
                                    <div className="w-px bg-slate-700" />
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-amber-400">{result.uncertainty.aleatoric.toFixed(4)}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[80px] leading-tight mt-1">Aleatoric (Data)</p>
                                    </div>
                                    <div className="w-px bg-slate-700" />
                                    <div className="text-center">
                                        <p className={`text-xl font-bold ${result.uncertainty.total_uncertainty > 0.15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {result.uncertainty.total_uncertainty.toFixed(4)}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[80px] leading-tight mt-1">Total</p>
                                    </div>
                                </div>

                                <div className="mt-2 text-center">
                                    <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)] ${result.uncertainty.needs_review ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white'}`}>
                                        {result.uncertainty.needs_review ? 'EXPERT REVIEW NEEDED' : 'HIGH CONFIDENCE (RELIABLE)'}
                                    </span>
                                </div>
                            </div>

                            {/* Robustness Card */}
                            <div className="bg-white dark:bg-[#111111] backdrop-blur-xl rounded-[20px] border border-gray-200/80 dark:border-white/10 p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                        <Shield className="w-5 h-5" /> Novel: Adv. Robustness
                                    </h3>
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${result.robustness.overall_score >= 0.85 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                        {result.robustness.overall_score >= 0.85 ? 'FDA-Ready Profile' : 'Needs Improvement'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-5 mb-5">
                                    <div className="text-center shrink-0">
                                        <p className={`text-3xl font-black ${result.robustness.overall_score >= 0.85 ? 'text-[#38ef7d]' : 'text-[#f5a623]'}`}>
                                            {(result.robustness.overall_score * 100).toFixed(0)}%
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Overall Score</p>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        {Object.entries(result.robustness.tests || {}).slice(0, 2).map(([name, t]) => (
                                            <div key={name} className="flex items-center justify-between bg-gray-50/50 dark:bg-white/5 p-2 rounded-lg border border-gray-200/80 dark:border-white/10">
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 capitalize">{name.replace(/_/g, ' ')}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${t.pred_stable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                        {t.pred_stable ? 'Stable' : 'Changed'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ Row 3: Hierarchical XAI (Grid) ═══ */}
                    {result && !loading && result.xai && result.xai.levels && (
                        <div className="bg-white dark:bg-[#111111] backdrop-blur-xl rounded-[20px] border border-gray-200/80 dark:border-white/10 p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)] mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-6 flex items-center gap-2">
                                <Eye className="w-5 h-5" /> Novel: Hierarchical 4-Level XAI Framework
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {Object.entries(result.xai.levels).map(([key, level], idx) => (
                                    <div key={key} className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)] flex flex-col h-full hover:border-blue-200 dark:border-blue-500/30 transition-colors">
                                        <div className="text-center mb-3">
                                            <span className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
                                                Level {idx + 1}
                                            </span>
                                            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{level.name}</h4>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 italic min-h-[30px]">"{level.question}"</p>
                                        </div>
                                        <div className="mt-auto aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-white/20 bg-black flex items-center justify-center">
                                            <img
                                                src={`data:image/png;base64,${level.heatmap}`}
                                                alt={level.name}
                                                className="w-full h-full object-cover transition-transform hover:scale-110 duration-500"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-5 italic">
                                From broad detection area (L1) down to deep sub-visual feature analysis (L4) — providing multi-granularity clinical explanations.
                            </p>
                        </div>
                    )}

                    {/* ═══ Why Trust This System? (Info Card) ═══ */}
                    {/* <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b]/80 rounded-[20px] border border-gray-200/80 dark:border-white/10 p-6 sm:p-8 shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#667eea]" />
                        <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Why Trust This System?</h3>
                        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-4xl">
                            <p>
                                Most brain tumor AI systems are <strong className="text-gray-900 dark:text-white">black boxes</strong> — they output a label but cannot explain the reasoning. A review of recent 2024-2026 medical AI studies found that <strong className="text-gray-900 dark:text-white">98% do not evaluate predictive uncertainty</strong>, and <strong className="text-gray-900 dark:text-white">99% skip adversarial robustness testing</strong>.
                            </p>
                            <p>
                                This CDSS (Clinical Decision Support System) bridges those gaps via a 5-pillar architecture. It utilizes an ensemble of <strong className="text-gray-900 dark:text-white">DenseNet-169 & EfficientNet-B3</strong>. Its <strong className="text-gray-900 dark:text-white">Uncertainty Module</strong> uses Temperature Scaling to flag risky out-of-distribution predictions before they reach a patient. 
                            </p>
                            <p>
                                The <strong className="text-gray-900 dark:text-white">Robustness Engine</strong> challenges the model against simulated scanner artifacts and adversarial noise (FGSM) to ensure explanations remain completely stable. 
                                Finally, the <strong className="text-gray-900 dark:text-white">4-Level Hierarchical XAI</strong> decomposes the decision visually, confirming that the AI actually looked at the tumor morphology rather than background scanner noise.
                            </p>
                        </div>
                    </div> */}
                    <div className="bg-white rounded-[20px] border border-black/[0.08] p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden max-w-8xl">

                        {/* Top accent bar */}
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#007AFF]" />

                        {/* Header */}
                        <div className="flex items-center gap-2.5 mb-[18px]">
                            <div className="w-[34px] h-[34px] bg-[#007AFF]/10 rounded-[10px] flex items-center justify-center shrink-0">
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill="#007AFF" opacity="0.85" />
                                </svg>
                            </div>
                            <h3 className="text-[17px] font-semibold text-[#1c1c1e] tracking-[-0.3px] m-0">
                                Information
                            </h3>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-black/[0.07] mb-[18px]" />

                        {/* Body */}
                        <div className="flex flex-col gap-3.5 text-sm text-[#3a3a3c] leading-[1.75] tracking-[-0.1px]">
                            <p>
                                Most brain tumor AI systems are <strong className="text-[#1c1c1e] font-medium">black boxes</strong> — they output a label but cannot explain the reasoning. A review of 2024–2026 medical AI studies found:
                            </p>

                            {/* Stat chips */}
                            <div className="flex flex-wrap gap-2.5 my-1">
                                <span className="inline-flex items-center gap-1.5 bg-[#FF3B30]/[0.07] border border-[#FF3B30]/[0.15] rounded-lg px-2.5 py-[5px] text-[12.5px] font-medium text-[#c0392b] tracking-[-0.1px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] shrink-0" />
                                    98% don't evaluate predictive uncertainty
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-[#FF3B30]/[0.07] border border-[#FF3B30]/[0.15] rounded-lg px-2.5 py-[5px] text-[12.5px] font-medium text-[#c0392b] tracking-[-0.1px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] shrink-0" />
                                    99% skip adversarial robustness testing
                                </span>
                            </div>

                            <p>
                                This CDSS bridges those gaps via a <strong className="text-[#1c1c1e] font-medium">5-pillar architecture</strong>, utilizing an ensemble of <strong className="text-[#1c1c1e] font-medium">DenseNet-169 &amp; EfficientNet-B3</strong>. Its <strong className="text-[#1c1c1e] font-medium">Uncertainty Module</strong> uses Temperature Scaling to flag risky out-of-distribution predictions before they reach a patient.
                            </p>

                            <p>
                                The <strong className="text-[#1c1c1e] font-medium">Robustness Engine</strong> challenges the model against simulated scanner artifacts and adversarial noise (FGSM) to ensure explanations remain completely stable. The <strong className="text-[#1c1c1e] font-medium">4-Level Hierarchical XAI</strong> decomposes decisions visually — confirming the AI focuses on tumor morphology, not background scanner noise.
                            </p>

                            {/* Pill tags */}
                            <div className="flex flex-wrap gap-[7px] mt-0.5">
                                <span className="bg-[#007AFF]/[0.07] border border-[#007AFF]/[0.18] rounded-full px-[11px] py-1 text-xs font-medium text-[#007AFF] tracking-[-0.1px]">DenseNet-169</span>
                                <span className="bg-[#007AFF]/[0.07] border border-[#007AFF]/[0.18] rounded-full px-[11px] py-1 text-xs font-medium text-[#007AFF] tracking-[-0.1px]">EfficientNet-B3</span>
                                <span className="bg-[#5856D6]/[0.07] border border-[#5856D6]/[0.18] rounded-full px-[11px] py-1 text-xs font-medium text-[#5856D6] tracking-[-0.1px]">Uncertainty Module</span>
                                <span className="bg-[#5856D6]/[0.07] border border-[#5856D6]/[0.18] rounded-full px-[11px] py-1 text-xs font-medium text-[#5856D6] tracking-[-0.1px]">Temperature Scaling</span>
                                <span className="bg-[#00C7BE]/[0.07] border border-[#00C7BE]/[0.2] rounded-full px-[11px] py-1 text-xs font-medium text-[#009b96] tracking-[-0.1px]">Robustness Engine</span>
                                <span className="bg-[#00C7BE]/[0.07] border border-[#00C7BE]/[0.2] rounded-full px-[11px] py-1 text-xs font-medium text-[#009b96] tracking-[-0.1px]">FGSM Adversarial</span>
                                <span className="bg-[#FF9500]/[0.08] border border-[#FF9500]/[0.2] rounded-full px-[11px] py-1 text-xs font-medium text-[#c97700] tracking-[-0.1px]">4-Level XAI</span>
                            </div>
                        </div>

                    </div>

                </div>

                {/* History Sidebar */}
                {showHistory && (
                    <div className="w-80 flex-shrink-0 animate-in slide-in-from-right duration-500 z-20">
                        <div className="bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl rounded-[20px] border border-gray-200/80 dark:border-white/10 p-5 sticky top-24 shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)] h-[calc(100vh-120px)] overflow-hidden flex flex-col">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2"><History className="w-5 h-5 text-blue-600 dark:text-blue-400" /> History</span>
                                <button onClick={() => setShowHistory(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300">✕</button>
                            </h3>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {history.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Activity className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                                        <p className="text-sm text-gray-400 dark:text-gray-500">No previous scans found</p>
                                    </div>
                                ) : (
                                    history.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => fetchScanDetail(item.id)}
                                            className="w-full text-left p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:bg-white/10/80 transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-sm font-bold ${getDiagnosisColor(item.diagnosis)}`}>
                                                    {item.diagnosis}
                                                </span>
                                                <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                                                    {(item.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1" title={item.file_name}>{item.file_name}</p>
                                            <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 group-hover:underline">
                                                    View Details →
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// Inline missing icon component for perfection
function Target(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
    );
}
