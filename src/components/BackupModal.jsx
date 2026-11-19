import React, { useState, useRef } from 'react'
import { X, Download, Upload, HardDrive, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

export function BackupModal({
  isOpen,
  onClose,
  isConnected,
  onStartFullBackup,
  onRestoreBackup,
  presetNames = {},
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFullBackup = async () => {
    if (!isConnected) {
      alert('Conecte a BlackBox via Bluetooth ou USB para realizar o backup completo.')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setStatusText('Iniciando leitura dos 80 presets da memória Flash...')

    try {
      await onStartFullBackup((curr, total) => {
        setProgress(Math.round((curr / total) * 100))
        setStatusText(`Lendo preset ${curr} de ${total}...`)
      })
      setStatusText('Backup concluído com sucesso!')
    } catch (err) {
      alert('Falha ao realizar backup completo: ' + err.message)
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
          throw new Error('Formato de arquivo de backup inválido.')
        }

        if (confirm(`Deseja restaurar o backup contendo ${(json.presets || json).length} presets?`)) {
          setIsProcessing(true)
          setStatusText('Restaurando presets...')
          await onRestoreBackup(json, (curr, total) => {
            setProgress(Math.round((curr / total) * 100))
            setStatusText(`Gravando preset ${curr} de ${total}...`)
          })
          alert('Backup restaurado com sucesso!')
          onClose()
        }
      } catch (err) {
        alert('Erro ao carregar arquivo de backup: ' + err.message)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#14161a] border border-neutral-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition disabled:opacity-30"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <HardDrive size={18} className="text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
            Backup & Restauração Completa (80 Presets)
          </h2>
        </div>

        <p className="text-xs text-neutral-400 mb-6">
          Exporte uma cópia completa de toda a pedaleira (P01 a P80) em um único arquivo de segurança ou restaure um backup existente.
        </p>

        {isProcessing ? (
          <div className="my-6 p-6 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-amber-500" size={28} />
            <span className="text-xs font-mono font-bold text-neutral-200">{statusText}</span>
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-neutral-400">{progress}%</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Backup Button */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5 mb-1">
                  <Download size={14} className="text-amber-500" />
                  Criar Backup
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Lê todos os 80 slots da Flash e salva em arquivo .json.
                </p>
              </div>
              <button
                onClick={handleFullBackup}
                disabled={!isConnected}
                className="w-full py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition disabled:opacity-30"
              >
                Iniciar Backup Total
              </button>
            </div>

            {/* Restore Button */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5 mb-1">
                  <Upload size={14} className="text-blue-400" />
                  Restaurar Backup
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Carrega um arquivo .json e grava os presets na pedaleira.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold transition"
              >
                Selecionar Arquivo .JSON
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

        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center gap-2 text-[11px] text-neutral-500">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span>Compatível com firmware M-VAVE BlackBox v23 e versões anteriores.</span>
        </div>
      </div>
    </div>
  )
}

