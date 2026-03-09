"use client"
import { Button } from '@/components/ui/button'
import { AIDoctorAgents } from '@/shared/list'
import Image from 'next/image'
import React, { useState } from 'react'
import { IoArrowForward } from 'react-icons/io5'
import AddNewSession from './AddNewSession'

export type Doctor = {
  id: number
  specialist: string
  description: string
  image: string
  agentPrompt: string
  voiceId: string
}

function DoctorsList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  const handleDoctorClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setIsDialogOpen(true)
  }

  return (
    <div className='mt-8'>
      <h2 className="text-sm font-semibold tracking-widest text-gray-500 uppercase px-1 mb-5">AI Specialist Directory</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {
          AIDoctorAgents.map((doctor: Doctor) => (
            <div
              key={doctor.id}
              className='group relative flex flex-col bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 rounded-3xl p-5 cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out overflow-hidden'
              onClick={() => handleDoctorClick(doctor)}
            >
              <div className="relative w-full aspect-square mb-4 rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/5">
                <Image src={doctor.image} alt={doctor.specialist} fill className='object-cover group-hover:scale-105 transition-transform duration-500' />
              </div>

              <div className="flex flex-col flex-1">
                <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{doctor.specialist}</h3>
                <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed flex-1">{doctor.description}</p>

                <Button variant="outline" className='w-full rounded-full bg-gray-50 dark:bg-white/5 border-transparent text-gray-900 dark:text-white hover:bg-gray-900 transition-all duration-300 hover:text-white group-hover:border-gray-900 dark:group-hover:border-white shadow-none'>
                  Start Consultation <IoArrowForward className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Render AddNewSession with the selected doctor */}
      <AddNewSession
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        preSelectedDoctor={selectedDoctor}
      />
    </div>
  )
}

export default DoctorsList
