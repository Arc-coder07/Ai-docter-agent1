"use client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

import React, { useState, useEffect } from 'react'
import { IoArrowForward } from "react-icons/io5"
import { Loader2 } from "lucide-react"
import { useApiClient } from "@/lib/api"
import { Doctor } from "./DoctorsList"
import { AIDoctorAgents } from "@/shared/list"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface AddNewSessionProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  preSelectedDoctor?: Doctor | null
  hideTrigger?: boolean
  children?: React.ReactNode
}

/**
 * AddNewSession — Dialog for starting a new voice consultation.
 *
 * Flow:
 * 1. User enters symptoms (or a doctor was pre-selected from the grid)
 * 2. Click "Next" → calls /chat/suggest-doctors → gets specialist name
 * 3. Matches specialist name to the full Doctor object from AIDoctorAgents
 * 4. User confirms → calls /chat → creates session → navigates to voice agent
 */
function AddNewSession({ isOpen, onOpenChange, preSelectedDoctor, children }: AddNewSessionProps) {
  const [note, setNote] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedDoctor, setSuggestedDoctor] = useState<Doctor | undefined>(undefined)
  const [error, setError] = useState<string>()
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | undefined>(undefined)
  const router = useRouter()
  const apiClient = useApiClient()

  // If a doctor was pre-selected from the grid, skip symptom analysis
  useEffect(() => {
    if (preSelectedDoctor) {
      setSuggestedDoctor(preSelectedDoctor)
      setSelectedDoctor(preSelectedDoctor)
    }
  }, [preSelectedDoctor])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setNote("")
      setError("")
      setIsLoading(false)
      // Only reset doctor if there's no pre-selected doctor
      if (!preSelectedDoctor) {
        setSuggestedDoctor(undefined)
        setSelectedDoctor(undefined)
      }
    }
  }, [isOpen, preSelectedDoctor])

  /**
   * Step 1: Send symptoms to backend → get specialist recommendation
   * Then match the returned specialist name to the full Doctor object
   */
  const handleAnalyzeSymptoms = async () => {
    if (!note || note.trim().length < 3) {
      setError("Please provide more details about your symptoms")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const response = await apiClient("/chat/suggest-doctors", {
        method: "POST",
        data: { notes: note }
      })

      const { specialist } = response.data

      // Find the matching doctor from the full AIDoctorAgents list
      const matchedDoctor = AIDoctorAgents.find(
        (d) => d.specialist.toLowerCase() === specialist.toLowerCase()
      )

      if (matchedDoctor) {
        setSuggestedDoctor(matchedDoctor as Doctor)
        setSelectedDoctor(matchedDoctor as Doctor)
      } else {
        // Fallback: use the first doctor (General Physician)
        const fallback = AIDoctorAgents[0] as Doctor
        setSuggestedDoctor(fallback)
        setSelectedDoctor(fallback)
      }
    } catch (err) {
      console.error("Error fetching doctor suggestion:", err)
      setError("Failed to analyze symptoms. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Step 2: Create a chat session and navigate to the voice agent
   */
  const handleStartConsultation = async () => {
    if (!selectedDoctor) {
      setError("Please select a doctor first")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await apiClient("/chat", {
        method: "POST",
        data: {
          messages: [{ role: "user", content: note || `Consultation with ${selectedDoctor.specialist}` }],
        }
      })

      if (result.data.sessionId) {
        router.push(`/dashboard/medical-agent/${result.data.sessionId}`)
      } else {
        setError("Failed to create session. Please try again.")
      }
    } catch (err) {
      console.error("Error starting consultation:", err)
      setError("Failed to start consultation. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children ? children : (
          !isOpen && (
            <Button variant="outline" className='rounded-full bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white mt-3 hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900 transition-all duration-300 shadow-none'>
              + Start a Consultation
            </Button>
          )
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-gray-100 dark:border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{suggestedDoctor ? 'Recommended Specialist' : 'Start Consultation'}</DialogTitle>
          <DialogDescription asChild>
            {!suggestedDoctor ? (
              <div className="flex flex-col gap-3 pt-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Describe your symptoms below and we'll match you with the right specialist.</p>
                <Textarea
                  placeholder="e.g., I have blackheads on my nose, I feel chest pain when walking..."
                  className="h-[180px] rounded-2xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500/40 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 transition-all"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {error && <p className="text-rose-500 text-sm font-medium">{error}</p>}
              </div>
            ) : (
              <div className="pt-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Based on your symptoms, we recommend:</p>
                <div
                  className={`rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-3
                    ${selectedDoctor?.id === suggestedDoctor.id
                      ? 'bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 shadow-[0_4px_16px_rgba(59,130,246,0.1)]'
                      : 'bg-gray-50 dark:bg-white/5 border-2 border-transparent hover:border-gray-200 dark:hover:border-white/10'}`}
                  onClick={() => setSelectedDoctor(suggestedDoctor)}
                >
                  <Image
                    src={suggestedDoctor.image}
                    alt={suggestedDoctor.specialist || "Doctor"}
                    width={80}
                    height={80}
                    className='rounded-full w-16 h-16 object-cover ring-4 ring-white dark:ring-[#111111] shadow-md'
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.onerror = null
                      target.src = "/medical-assistance.png"
                    }}
                  />
                  <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">{suggestedDoctor.specialist}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">{suggestedDoctor.description}</p>
                </div>
                {error && <p className="text-rose-500 text-sm font-medium mt-3">{error}</p>}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-6 pt-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] gap-3">
          <DialogClose asChild>
            <Button variant="ghost" className="rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
              Cancel
            </Button>
          </DialogClose>
          {!suggestedDoctor ? (
            <Button
              className="rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300"
              disabled={!note || isLoading}
              onClick={handleAnalyzeSymptoms}
            >
              Analyze Symptoms {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <IoArrowForward className="w-4 h-4" />}
            </Button>
          ) : (
            <Button
              disabled={isLoading || !selectedDoctor}
              className="rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300"
              onClick={handleStartConsultation}
            >
              Start Consultation {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <IoArrowForward className="w-4 h-4" />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddNewSession
