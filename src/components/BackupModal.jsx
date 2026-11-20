import React, { useState, useRef } from 'react'

export function BackupModal({
  isOpen,
  onClose,
  isConnected,
  onStartFullBackup,
  onRestoreBackup,
  onShowAlert,
  onShowConfirm,
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFullBackup = async () => {
    if (!isConnected) {
      if (onShowAlert) {
        await onShowAlert({
          title: 'PEDAL DESCONECTADO',
          message: 'Conecte a BlackBox antes de iniciar o backup.',
          variant: 'warning',
        })
      }
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setStatusText('LENDO 80 SLOTS...')

    try {
      await onStartFullBackup((curr, total) => {
        setProgress(Math.round((curr / total) * 100))
        setStatusText(`PRESET ${curr} / ${total}`)
      })
      setStatusText('CONCLUÍDO')
    } catch (err) {
      if (onShowAlert) {
        await onShowAlert({
          title: 'FALHA NO BACKUP',
          message: err.message,
          variant: 'error',
        })
      }
      setStatusText('')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result)
        if (!json.presets && !Array.isArray(json)) {
          throw new Error('Arquivo inválido.')
        }

        const confirmed = onShowConfirm
          ? await onShowConfirm({
              title: 'RESTAURAR BACKUP NA FLASH',
              message: `Deseja restaurar ${(json.presets || json).length} presets permanentemente na memória Flash do pedal?`,
              confirmLabel: 'RESTAURAR PRESETS',
              variant: 'warning',
            })
          : false

        if (confirmed) {
          setIsProcessing(true)
          setStatusText('GRAVANDO...')
          await onRestoreBackup(json, (curr, total) => {
            setProgress(Math.round((curr / total) * 100))
            setStatusText(`PRESET ${curr} / ${total}`)
          })
          onClose()
        }
      } catch (err) {
        if (onShowAlert) {
          await onShowAlert({
            title: 'ERRO AO CARREGAR BACKUP',
            message: err.message,
            variant: 'error',
          })
        }
      } finally {
        setIsProcessing(false)
        setProgress(0)
        setStatusText('')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="bg-[#141416] border-t-4 border-[#d9822b] w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-display text-lg transition disabled:opacity-30"
        >
          ✕
        </button>

        <h2 className="font-display text-3xl text-[#f2efe9] mb-5">
          BACKUP & RESTAURAÇÃO · 80 SLOTS
        </h2>

        {isProcessing ? (
          <div className="my-4 p-6 bg-[#060607] flex flex-col items-center gap-3">
            <span className="font-display text-2xl text-[#e5a93c]">{statusText}</span>
            <div className="w-full bg-[#1e1e22] h-3">
              <div
                className="bg-[#d9822b] h-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-display text-xl text-[#f2efe9] tabular-nums">{progress}%</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#1e1e22] p-4 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl text-[#f2efe9] mb-1">
                  EXPORTAR TUDO
                </h3>
                <p className="text-xs text-[#9a968e]">
                  Dump completo P01–P80 em arquivo JSON.
                </p>
              </div>
              <button
                onClick={handleFullBackup}
                disabled={!isConnected}
                className="w-full h-11 bg-[#d9822b] hover:bg-[#e8953f] text-[#120902] font-bold text-xs uppercase tracking-wider transition disabled:opacity-35"
              >
                BAIXAR BACKUP
              </button>
            </div>

            <div className="bg-[#1e1e22] p-4 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl text-[#f2efe9] mb-1">
                  RESTAURAR JSON
                </h3>
                <p className="text-xs text-[#9a968e]">
                  Grava os 80 slots direto na memória Flash.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 bg-[#0b0b0c] hover:bg-[#060607] text-[#e5a93c] font-bold text-xs uppercase tracking-wider transition"
              >
                SELECIONAR ARQUIVO
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
