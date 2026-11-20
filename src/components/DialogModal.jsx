import React, { useEffect } from 'react'

export function DialogModal({ dialog, onConfirm, onCancel }) {
  useEffect(() => {
    if (!dialog) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        onConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [dialog, onConfirm, onCancel])

  if (!dialog) return null

  const {
    mode = 'alert',
    title = 'AVISO',
    message = '',
    variant = 'warning',
    confirmLabel = mode === 'confirm' ? 'CONFIRMAR' : 'ENTENDI',
    cancelLabel = 'CANCELAR',
  } = dialog

  const borderColor =
    variant === 'error'
      ? '#e5484d'
      : variant === 'warning'
        ? '#e5a93c'
        : '#d9822b'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[#141416] border-t-4 w-full max-w-md p-6 relative"
        style={{ borderTopColor: borderColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-display text-lg transition"
          aria-label="Fechar"
        >
          ✕
        </button>

        <h2 className="font-display text-3xl text-[#f2efe9] pr-8 mb-3 tracking-wide">
          {title}
        </h2>

        <p className="text-sm text-[#9a968e] leading-relaxed whitespace-pre-line mb-6">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2">
          {mode === 'confirm' && (
            <button
              type="button"
              onClick={onCancel}
              className="h-11 px-5 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-bold text-xs uppercase tracking-wider transition"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`h-11 px-6 font-bold text-xs uppercase tracking-wider transition ${
              variant === 'error'
                ? 'bg-[#e5484d] hover:bg-[#f05d62] text-[#f2efe9]'
                : 'bg-[#d9822b] hover:bg-[#e8953f] text-[#120902]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
