"use client"
import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, FileText, UploadCloud, History, Calendar, Send, Bot, User } from 'lucide-react'
import { useApiClient } from "@/lib/api"
import ReactMarkdown from 'react-markdown'

interface Report {
  id: string
  file_name: string
  patient_name: string | null
  analysis: string
  created_at: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function ReportAnalysis() {
  const apiClient = useApiClient()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [savedReports, setSavedReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(false)

  // Patient info (optional)
  const [patientName, setPatientName] = useState("")
  const [patientAge, setPatientAge] = useState("")
  const [patientGender, setPatientGender] = useState("")

  // Track the currently active report
  const [activeReportId, setActiveReportId] = useState<string | null>(null)

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch saved reports on component mount
  useEffect(() => {
    fetchReports()
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const fetchReports = async () => {
    setLoadingReports(true)
    try {
      const response = await apiClient('/report/history')
      setSavedReports(response.data.reports || [])
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setLoadingReports(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setAnalysis(null)
    setChatMessages([])

    const formData = new FormData()
    formData.append("file", file)
    if (patientName) formData.append("patient_name", patientName)
    if (patientAge) formData.append("patient_age", patientAge)
    if (patientGender) formData.append("patient_gender", patientGender)

    try {
      const response = await apiClient('/report/analyze', {
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setAnalysis(response.data.analysis)
      setActiveReportId(response.data.report_id)
      setFile(null)
      setPatientName("")
      setPatientAge("")
      setPatientGender("")
      await fetchReports()
    } catch (error: any) {
      console.error("Error:", error)
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || "Failed to analyze report"
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeReportId) return

    const newMessage: ChatMessage = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, newMessage])
    setChatInput("")
    setChatLoading(true)

    try {
      const response = await apiClient('/report/chat', {
        method: 'POST',
        data: {
          report_id: activeReportId,
          message: newMessage.content
        }
      })

      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.response }])
    } catch (error) {
      console.error("Chat error", error)
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error answering that." }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleSelectReport = async (report: Report) => {
    setActiveReportId(report.id)
    setChatMessages([])

    // Fetch full report details including analysis
    try {
      const response = await apiClient(`/report/${report.id}`)
      setAnalysis(response.data.analysis)

      // Load chat history if any
      const messages = response.data.messages || []
      setChatMessages(messages.map((m: any) => ({
        role: m.role,
        content: m.content
      })))
    } catch (error) {
      console.error("Error loading report:", error)
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <div className='flex items-center gap-3 mb-8'>
        <div className="p-3 bg-blue-100 rounded-full">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <h1 className='text-2xl font-bold'>Blood Report Analyst</h1>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>

        {/* LEFT COLUMN: Upload & Analysis & Chat */}
        <div className='lg:col-span-2 space-y-8'>

          {/* 1. Upload Section */}
          <div className='bg-white rounded-xl p-6 border shadow-sm'>
            <div className='border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors'>
              <UploadCloud className='w-12 h-12 text-blue-500 mb-4' />
              <h2 className='text-lg font-semibold'>Upload Blood Report (PDF)</h2>
              <p className='text-gray-500 text-sm mb-4'>Max size 5MB</p>

              <Input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className='max-w-xs'
              />
            </div>

            {/* Optional Patient Info */}
            {file && (
              <div className='mt-6 p-4 bg-gray-50 rounded-lg'>
                <h3 className='text-sm font-medium text-gray-700 mb-3'>Patient Information (Optional)</h3>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <Input
                    placeholder="Patient Name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                  <Input
                    placeholder="Age"
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                  />
                  <select
                    className='border rounded-md px-3 py-2 text-sm'
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}

            <Button
              className='mt-4 w-full'
              onClick={handleAnalyze}
              disabled={!file || loading}
            >
              {loading ? <><Loader2 className='animate-spin mr-2' /> Analyzing...</> : "Analyze Report"}
            </Button>
          </div>

          {/* 2. Analysis Results */}
          {analysis && (
            <div className='bg-white p-6 rounded-xl border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500'>
              <div className='flex items-center gap-2 mb-4 border-b pb-4'>
                <FileText className='text-green-600' />
                <h2 className='text-xl font-bold'>Analysis Results</h2>
              </div>
              <div className='prose prose-blue max-w-none text-gray-700 leading-relaxed'>
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* 3. Follow-up Chat System */}
          {analysis && activeReportId && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  Ask questions about this report
                </h3>
              </div>

              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-400 mt-10">
                    <p>Ask me anything about the values in your report.</p>
                    <p className="text-sm">Example: "Is my Hemoglobin normal?"</p>
                  </div>
                )}

                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-lg max-w-[80%] ${msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2 items-center text-gray-400 text-sm">
                    <Bot className="w-4 h-4" /> Thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t bg-gray-50 flex gap-2">
                <Input
                  placeholder="Type your question..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={chatLoading}
                />
                <Button onClick={handleSendMessage} disabled={chatLoading || !chatInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar - Previous Reports */}
        <div className='lg:col-span-1'>
          <div className='bg-white p-6 rounded-xl border shadow-sm sticky top-6'>
            <div className='flex items-center gap-2 mb-4'>
              <History className='text-blue-600' />
              <h2 className='text-xl font-bold'>History</h2>
            </div>

            {loadingReports ? (
              <div className='flex justify-center py-8'>
                <Loader2 className='animate-spin text-gray-400' />
              </div>
            ) : savedReports.length === 0 ? (
              <p className='text-gray-500 text-sm text-center py-8'>No previous reports</p>
            ) : (
              <div className='space-y-3 max-h-[600px] overflow-y-auto pr-2'>
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => handleSelectReport(report)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${activeReportId === report.id
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className='flex items-start gap-3'>
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <FileText className='w-5 h-5 text-gray-600' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='font-medium text-sm truncate text-gray-900'>{report.file_name}</p>
                        {report.patient_name && (
                          <p className='text-xs text-gray-500 truncate'>{report.patient_name}</p>
                        )}
                        <div className='flex items-center gap-2 mt-1 text-xs text-gray-500'>
                          <Calendar className='w-3 h-3' />
                          <span>{formatDate(report.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default ReportAnalysis