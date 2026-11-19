import React, { useState, useRef } from 'react'

export function BackupModal({
  isOpen,
  onClose,
  isConnected,
  onStartFullBackup,
  onRestoreBackup,
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFullBackup = async () => {
    if (!isConnected) {
      alert('Conecte a BlackBox antes de iniciar o backup.')
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
      alert('Falha no backup: ' + err.message)
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

        if (confirm(`Restaurar ${(json.presets || json).length} presets na Flash?`)) {
          setIsProcessing(true)
          setStatusText('GRAVANDO...')
          await onRestoreBackup(json, (curr, total) => {
            setProgress(Math.round((curr / total) * 100))
            setStatusText(`PRESET ${curr} / ${total}`)
          })
          onClose()
        }
      } catch (err) {
        alert('Erro ao carregar backup: ' + err.message)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041011]/85 p-4">
      <div className="bg-[#0e2828] border-t-4 border-[#e3b862] w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea] font-display text-lg transition disabled:opacity-30"
        >
          ✕
        </button>

        <h2 className="font-display text-3xl text-[#eaf0ea] mb-5">
          BACKUP & RESTAURAÇÃO · 80 SLOTS
        </h2>

        {isProcessing ? (
          <div className="my-4 p-6 bg-[#05080a] flex flex-col items-center gap-3">
            <span className="font-display text-2xl text-[#63e0f5]">{statusText}</span>
            <div className="w-full bg-[#133332] h-3">
              <div
                className="bg-[#e3b862] h-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-display text-xl text-[#eaf0ea] tabular-nums">{progress}%</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#133332] p-4 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl text-[#eaf0ea] mb-1">
                  EXPORTAR TUDO
                </h3>
                <p className="text-xs text-[#a9c0bc]">
                  Dump completo P01–P80 em arquivo JSON.
                </p>
              </div>
              <button
                onClick={handleFullBackup}
                disabled={!isConnected}
                className="w-full h-11 bg-[#e3b862] hover:bg-[#f0c97a] text-[#231a06] font-bold text-xs uppercase tracking-wider transition disabled:opacity-35"
              >
                BAIXAR BACKUP
              </button>
            </div>

            <div className="bg-[#133332] p-4 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl text-[#eaf0ea] mb-1">
                  RESTAURAR JSON
                </h3>
                <p className="text-xs text-[#a9c0bc]">
                  Grava os 80 slots direto na memória Flash.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 bg-[#071819] hover:bg-[#050f10] text-[#63e0f5] font-bold text-xs uppercase tracking-wider transition"
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
