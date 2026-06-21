import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  /** If set, the user must type this exact text to enable the confirm button — for the most destructive actions (e.g. deleting a user). */
  requireTypedConfirmation?: string
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Shared confirmation dialog for admin destructive/important actions.
 *
 * Two tiers of friction:
 * - Plain confirm: title + message + Confirm/Cancel buttons.
 * - Typed confirmation: additionally requires the admin to type a specific
 *   word/phrase (e.g. the user's email, or "DELETE") before the confirm
 *   button enables — reserved for irreversible actions where a misclick
 *   would be costly (deleting a user account, permanently deleting an
 *   opportunity).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  requireTypedConfirmation,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('')

  useEffect(() => {
    if (!open) setTypedValue('')
  }, [open])

  if (!open) return null

  const canConfirm = !requireTypedConfirmation || typedValue === requireTypedConfirmation

  const colors = {
    danger: { icon: 'text-red-600 bg-red-100', button: 'bg-red-600 hover:bg-red-700' },
    warning: { icon: 'text-amber-600 bg-amber-100', button: 'bg-amber-600 hover:bg-amber-700' },
    default: { icon: 'text-primary bg-primary/10', button: 'bg-primary hover:bg-primary/90' },
  }[variant]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:bg-muted p-1 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{message}</p>

        {requireTypedConfirmation && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Type <span className="font-mono font-bold text-foreground">{requireTypedConfirmation}</span> to confirm
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} disabled={isLoading}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={isLoading || !canConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${colors.button}`}>
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}