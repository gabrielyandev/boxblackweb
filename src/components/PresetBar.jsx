import React, { useRef, useState } from 'react'
import { PROTOCOL } from '../protocol/constants'

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
  onShowAlert,
}) {
  const fileInputRef = useRef(null)
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
        if (onShowAlert) {
          onShowAlert({
            title: 'ARQUIVO JSON INVÁLIDO',
            message: 'Erro ao carregar arquivo JSON: ' + err.message,
            variant: 'error',
          })
        }
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const currentPresetCode = `P${String(currentPresetId + 1).padStart(2, '0')}`
  const currentPresetName = presetNames[currentPresetId] || `PRESET ${String(currentPresetId + 1).padStart(2, '0')}`

  const handleStartRename = () => {
    setNameValue(currentPresetName)
    setIsEditingName(true)
  }

  const handleSaveRename = () => {
    setIsEditingName(false)
    if (onRenamePreset) {
      onRenamePreset(
        currentPresetId,
        nameValue.trim() || `PRESET ${String(currentPresetId + 1).padStart(2, '0')}`
      )
    }
  }

  return (
    <div className="bg-[#141416] p-3 flex flex-wrap items-center justify-between gap-3">
      {/* OLED Display + Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-[#060607] px-4 py-1.5 min-w-[82px] text-center">
          <span className="font-display text-4xl text-[#f2efe9] leading-none tabular-nums">
            {currentPresetCode}
          </span>
        </div>

        <button
          onClick={handlePrev}
          disabled={disabled || currentPresetId === 0}
          className="bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-display text-2xl w-11 h-11 flex items-center justify-center disabled:opacity-30 transition"
          title="Preset Anterior"
        >
          −
        </button>

        <select
          value={currentPresetId}
          disabled={disabled}
          onChange={(e) => onSelectPreset(Number(e.target.value))}
          className="bg-[#1e1e22] text-[#f2efe9] font-semibold text-sm px-3 h-11 border-0 focus:outline focus:outline-2 focus:outline-[#d9822b] cursor-pointer disabled:opacity-40"
        >
          {Array.from({ length: PROTOCOL.PRESET_COUNT }).map((_, idx) => {
            const code = `P${String(idx + 1).padStart(2, '0')}`
            const label = presetNames[idx] ? `${code} · ${presetNames[idx]}` : code
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
          className="bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-display text-2xl w-11 h-11 flex items-center justify-center disabled:opacity-30 transition"
          title="Próximo Preset"
        >
          +
        </button>

        {/* Editable Preset Name */}
        <div className="ml-1">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                onBlur={handleSaveRename}
                autoFocus
                className="bg-[#060607] text-[#f2efe9] font-display text-2xl px-3 h-11 w-48 outline outline-2 outline-[#d9822b] uppercase"
              />
            </div>
          ) : (
            <button
              onClick={handleStartRename}
              className="font-display text-2xl sm:text-3xl text-[#f2efe9] hover:text-[#e5a93c] tracking-wide px-2 py-1 transition text-left"
              title="Clique para renomear"
            >
              {currentPresetName}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={onToggleCompare}
          className={`h-11 px-4 font-semibold text-xs uppercase tracking-wider transition ${
            isCompareActive
              ? 'bg-[#e5a93c] text-[#120902]'
              : 'bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9]'
          }`}
          title="Alternar A/B (Atalho: A)"
        >
          {isCompareActive ? 'A/B · ORIGINAL' : 'A / B'}
        </button>

        <button
          onClick={onReload}
          disabled={disabled}
          className="h-11 px-4 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-semibold text-xs uppercase tracking-wider transition disabled:opacity-35"
        >
          SYNC
        </button>

        <button
          onClick={onExportJson}
          className="h-11 px-3.5 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#9a968e] hover:text-[#f2efe9] font-semibold text-xs uppercase tracking-wider transition"
        >
          EXPORTAR
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-11 px-3.5 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#9a968e] hover:text-[#f2efe9] font-semibold text-xs uppercase tracking-wider transition"
        >
          IMPORTAR
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={onOpenBackupModal}
          className="h-11 px-4 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#e5a93c] font-semibold text-xs uppercase tracking-wider transition"
        >
          BACKUP 80
        </button>

        <button
          onClick={onSaveToFlash}
          disabled={disabled || isSaving}
          className="h-11 px-5 bg-[#d9822b] hover:bg-[#e8953f] text-[#120902] font-bold text-xs uppercase tracking-wider transition disabled:opacity-35"
          title="Gravar na Flash (Ctrl+S)"
        >
          {isSaving ? 'GRAVANDO...' : hasModifications ? 'SALVAR*' : 'SALVAR NO PEDAL'}
        </button>
      </div>
    </div>
  )
}
