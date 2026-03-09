"use client"
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import AddNewSession from './AddNewSession'
import Link from 'next/link'
import { useApiClient } from "@/lib/api"
import { Calendar, Clock, MessageSquare } from 'lucide-react'

type Session = {
  id: string;
  sessionId: string;
  createdOn: string;
  conversation: any[];
  notes?: string;
}

function HistoryList() {
  const [history, setHistory] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const apiClient = useApiClient()

  useEffect(() => {
    getHistory();
  }, [])

  const getHistory = async () => {
    try {
      setLoading(true);
      const result = await apiClient('/history/sessions');
      const mappedData = result.data.map((item: any) => ({
        id: item.id,
        sessionId: item.id,
        createdOn: item.created_at,
        conversation: [],
        notes: item.title
      }));
      setHistory(mappedData);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className='space-y-3'>
        <h2 className="font-bold text-lg text-gray-900">Recent Sessions</h2>
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-gray-100 p-3 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-bold text-lg text-gray-900 mb-4">Recent Sessions</h2>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <MessageSquare className="w-7 h-7 text-gray-400" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-600 text-sm">No Sessions Yet</h3>
            <p className="text-xs text-gray-400 mt-1">Start a consultation to see history</p>
          </div>
          <AddNewSession />
        </div>
      ) : (
        <div className="space-y-2">
          {history.slice(0, 8).map((item) => (
            <Link key={item.id} href={`/dashboard/medical-agent/${item.sessionId}`} className="block">
              <div className='rounded-xl border border-gray-100 p-3 hover:border-gray-200 hover:shadow-sm transition-all bg-white group'>
                <h3 className='font-medium text-sm text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors'>
                  {item.notes || 'Consultation'}
                </h3>
                <div className='flex items-center gap-2 mt-1.5'>
                  <span className='text-[10px] text-gray-400 flex items-center gap-1'>
                    <Calendar className='w-3 h-3' />
                    {formatDate(item.createdOn)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryList