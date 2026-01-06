"use client"
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import AddNewSession from './AddNewSession'
import axios from 'axios'
import Link from 'next/link'
import { Calendar, Clock, FileText } from 'lucide-react'

// Define the Session type
type Session = {
  id: number;
  sessionId: string;
  createdOn: string;
  conversation: any; // or define specific type
  notes?: string;
}

function HistoryList() {
  const [history, setHistory] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory();
  }, [])

  const getHistory = async () => {
    try {
      setLoading(true);
      const result = await axios.get('/api/history');
      setHistory(result.data);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="mt-10 text-gray-400">Loading history...</div>

  return (
    <div className='mt-10'>
      <h2 className="font-bold text-lg mb-5">Previous Consultations</h2>
      
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-6 mt-5 p-12 border-2 border-dashed border-gray-200 rounded-2xl min-h-[650px]">
          <Image
            src="/medical-assistance.png"
            alt="No consultations"
            width={220}
            height={220}
          />
          <h2 className="font-bold">No Consultations Yet</h2>
          <p className="text-gray-500">You don&apos;t have any consultations yet.</p>
          <AddNewSession />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {history.map((item) => (
            <Link key={item.id} href={`/dashboard/medical-agent/${item.sessionId}`} className="block">
              <div className='border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer bg-white'>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='p-2 bg-blue-100 rounded-full'>
                    <FileText className='text-blue-600 w-5 h-5' />
                  </div>
                  <div>
                    <h3 className='font-bold text-gray-800'>Consultation #{item.id}</h3>
                    <span className='text-xs text-gray-500 flex items-center gap-1'>
  <Calendar className='w-3 h-3' />
  {/* FIX: Handle both String and Date objects safely */}
  {item.createdOn ? new Date(item.createdOn).toLocaleDateString() : 'Unknown Date'}
</span>
                  </div>
                </div>
                
                <p className='text-sm text-gray-500 line-clamp-2'>
                  {/* Show preview of last message or notes */}
                  {Array.isArray(item.conversation) && item.conversation.length > 0 
                    ? (item.conversation[item.conversation.length - 1] as any).content 
                    : "No conversation recorded."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryList