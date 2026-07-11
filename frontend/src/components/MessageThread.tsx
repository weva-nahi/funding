import { useEffect, useRef, useState } from 'react'
import { Paperclip, Send, X } from 'lucide-react'
import { formatRelativeDate } from '@/utils/formatDate'

export interface ThreadMessage {
  id: number
  sender_email: string
  sender_role: string
  content: string
  attachment: string | null
  attachment_name: string
  created_at: string
}

interface MessageBubbleProps {
  message: ThreadMessage
  isMe: boolean
  otherPartyLabel: string
}

export function MessageBubble({ message, isMe, otherPartyLabel }: MessageBubbleProps) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          isMe
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        }`}
      >
        {!isMe && <p className="text-[10px] font-semibold mb-1 opacity-70">{otherPartyLabel}</p>}
        {message.content && <p>{message.content}</p>}
        {message.attachment_name && (
          <a
            href={message.attachment || '#'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 mt-1 underline text-xs opacity-80 hover:opacity-100"
          >
            <Paperclip className="h-3 w-3" />
            {message.attachment_name}
          </a>
        )}
        <p className={`text-[10px] mt-1 ${isMe ? 'opacity-70 text-right' : 'text-muted-foreground'}`}>
          {formatRelativeDate(message.created_at)}
        </p>
      </div>
    </div>
  )
}

interface MessageThreadProps {
  messages: ThreadMessage[]
  viewerRole: 'admin' | 'client'
  richatTeamLabel: string
  emptyStateText: string
  placeholder: string
  onSend: (content: string, attachment: File | null) => void
  isSending: boolean
  maxHeightClass?: string
}

export function MessageThread({
  messages,
  viewerRole,
  richatTeamLabel,
  emptyStateText,
  placeholder,
  onSend,
  isSending,
  maxHeightClass = 'max-h-80',
}: MessageThreadProps) {
  const [content, setContent] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    if (!content.trim() && !attachment) return
    onSend(content, attachment)
    setContent('')
    setAttachment(null)
  }

  return (
    <div className="flex flex-col">
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${maxHeightClass}`}>
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">{emptyStateText}</p>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_role === viewerRole
            const otherPartyLabel = viewerRole === 'client' ? richatTeamLabel : msg.sender_email
            // Application and consulting messages have independent id sequences (and a
            // synthesized negative id for a consulting request's opening description),
            // so combine with index to guarantee a unique React key in the merged thread.
            return <MessageBubble key={`${index}-${msg.id}`} message={msg} isMe={isMe} otherPartyLabel={otherPartyLabel} />
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4">
        {attachment && (
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span>{attachment.name}</span>
            <button onClick={() => setAttachment(null)}>
              <X className="h-3 w-3 text-red-500" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border p-2.5 hover:bg-muted transition-colors"
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
          />
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && (content.trim() || attachment)) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={placeholder}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={isSending || (!content.trim() && !attachment)}
            className="rounded-lg bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
