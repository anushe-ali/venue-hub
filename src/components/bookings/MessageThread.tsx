'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { formatRelative } from '@/lib/utils'

interface Message {
  id: string
  body: string
  sender_id: string
  created_at: string
  sender?: { full_name: string; avatar_url?: string }
}

interface MessageThreadProps {
  bookingId: string
  messages: Message[]
  currentUserId: string
}

export default function MessageThread({ bookingId, messages: initialMessages, currentUserId }: MessageThreadProps) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`booking-messages-${bookingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [bookingId])

  const sendMessage = async () => {
    if (!body.trim() || sending) return
    setSending(true)
    const supabase = createClient()
    const { error } = await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: currentUserId,
      body: body.trim(),
    })
    if (!error) {
      setBody('')
      router.refresh()
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 p-5 border-b border-slate-100">
        <ChatBubbleLeftRightIcon className="h-5 w-5 text-slate-400" />
        <h2 className="font-semibold text-slate-900">Messages</h2>
        <span className="text-xs text-slate-400">({messages.length})</span>
      </div>

      {/* Messages */}
      <div className="max-h-80 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">No messages yet. Send a message to the venue manager.</p>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {msg.sender?.full_name?.charAt(0) ?? '?'}
                </div>
                <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                    isMine ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-slate-400 px-1">
                    {msg.sender?.full_name} · {formatRelative(msg.created_at)}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 flex gap-3">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          className="input flex-1 resize-none min-h-[40px] max-h-[120px] text-sm"
          placeholder="Type a message… (Enter to send)"
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={!body.trim() || sending}
          className="btn-primary btn px-3 self-end"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
