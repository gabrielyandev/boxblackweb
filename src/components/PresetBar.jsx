import React, { useRef, useState } from 'react'
import { PROTOCOL } from '../protocol/constants'
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  Upload,
  RotateCcw,
  Search,
  Sliders,
  HardDrive,
  Edit2,
  Check,
} from 'lucide-react'

export function PresetBar({
  currentPresetId = 0,
  onSelectPreset,
  onSaveToFlash,
  onReload,
  onExportJson,
  onImportJson,
  onOpenBackupModal,
  disabled = false,
  isSaving = false,
  isCompareActive = false,
  onToggleCompare,
  hasModifications = false,
  presetNames = {},
  onRenamePreset,
}) {
  const fileInputRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  const handlePrev = () => {
    if (currentPresetId > 0) {
      onSelectPreset(currentPresetId - 1)
    }
  }

  const handleNext = () => {
    if (currentPresetId < PROTOCOL.PRESET_COUNT - 1) {
      onSelectPreset(currentPresetId + 1)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result)
        onImportJson(json)
      } catch (err) {
        alert('Erro ao carregar arquivo de preset JSON: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const currentPresetName =
    presetNames[currentPresetId] || `Preset ${String(currentPresetId + 1).padStart(2, '0')}`

  const handleStartRename = () => {
    setNameValue(currentPresetName)
    setIsEditingName(true)
  }

  const handleSaveRename = () => {
    setIsEditingName(false)
    if (onRenamePreset) {
      onRenamePreset(currentPresetId, nameValue.trim() || `Preset ${String(currentPresetId + 1).padStart(2, '0')}`)
    }
  }

  return (
    <div className="bg-[#121418] border border-neutral-800/80 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
      {/* Preset Navigator & Name Editor */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handlePrev}
          disabled={disabled || currentPresetId === 0}
          className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-neutral-300 hover:text-white disabled:opacity-20 transition"
          title="Preset Anterior (Seta Esquerda)"
        >
          <ChevronLeft size={16} />
        </button>

        <select
          value={currentPresetId}
          disabled={disabled}
          onChange={(e) => onSelectPreset(Number(e.target.value))}
          className="bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500 transition cursor-pointer"
        >
          {Array.from({ length: PROTOCOL.PRESET_COUNT }).map((_, idx) => {
            const label = presetNames[idx]
              ? `P${String(idx + 1).padStart(2, '0')} - ${presetNames[idx]}`
              : `P${String(idx + 1).padStart(2, '0')}`
            return (
              <option key={idx} value={idx}>
                {label}
              </option>
            )
          })}
        </select>

        <button
          onClick={handleNext}
          disabled={disabled || currentPresetId === PROTOCOL.PRESET_COUNT - 1}
          className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-neutral-300 hover:text-white disabled:opacity-20 transition"
          title="Próximo Preset (Seta Direita)"
        >
          <ChevronRight size={16} />
        </button>

        {/* Editable Preset Title */}
        <div className="flex items-center gap-1.5 ml-1">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                autoFocus
                className="bg-neutral-950 border border-amber-500 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none w-36"
              />
              <button
                onClick={handleSaveRename}
                className="p-1 rounded bg-amber-500 text-black hover:bg-amber-400"
              >
                <Check size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartRename}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-200 hover:text-amber-400 transition group px-2 py-1 rounded-lg hover:bg-neutral-900"
              title="Clique para renomear este preset"
            >
              <span>{currentPresetName}</span>
              <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-neutral-400" />
            </button>
          )}
        </div>
      </div>

      {/* Center/Right Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* A/B Compare Switch */}
        <button
          onClick={onToggleCompare}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
            isCompareActive
              ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
              : 'bg-neutral-900 border-neutral-700/80 text-neutral-300 hover:text-white hover:bg-neutral-850'
          }`}
          title="Alternar comparação A/B (Atalho: A)"
        >
          <span className="font-mono text-[10px]">A/B</span>
          <span>{isCompareActive ? 'Original (A)' : 'Comparar'}</span>
        </button>

        {/* Sync from RAM */}
        <button
          onClick={onReload}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-850 disabled:opacity-30 transition"
          title="Sincronizar parâmetros atuais do pedal"
        >
          <RotateCcw size={13} />
          <span className="hidden sm:inline">Sincronizar</span>
        </button>

        {/* Export / Import single preset */}
        <button
          onClick={onExportJson}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-850 transition flex items-center gap-1"
          title="Exportar preset atual (.json)"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Exportar</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-850 transition flex items-center gap-1"
          title="Importar preset (.json)"
        >
          <Upload size={13} />
          <span className="hidden sm:inline">Importar</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Full 80-Presets Backup */}
        <button
          onClick={onOpenBackupModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/30 hover:bg-blue-900/50 border border-blue-500/40 text-blue-300 text-xs font-semibold transition"
          title="Backup completo de todos os 80 presets"
        >
          <HardDrive size={13} />
          <span className="hidden md:inline">Backup (80)</span>
        </button>

        {/* Save to Pedal Flash */}
        <button
          onClick={onSaveToFlash}
          disabled={disabled || isSaving}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all ${
            hasModifications
              ? 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-300 shadow-amber-500/20 animate-pulse'
              : 'bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-400/40'
          } disabled:opacity-40`}
          title="Gravar permanentemente na memória Flash do pedal (Ctrl+S)"
        >
          <Save size={13} />
          <span>{isSaving ? 'Gravando...' : 'Salvar no Pedal'}</span>
        </button>
      </div>
    </div>
  )
}
