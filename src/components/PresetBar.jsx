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
        alert('Erro ao carregar arquivo JSON: ' + err.message)
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
    <div className="bg-[#0e2828] p-3 flex flex-wrap items-center justify-between gap-3">
      {/* OLED Display + Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-[#05080a] px-4 py-1.5 min-w-[82px] text-center">
          <span className="font-display text-4xl text-[#dff6ff] leading-none tabular-nums">
            {currentPresetCode}
          </span>
        </div>

        <button
          onClick={handlePrev}
          disabled={disabled || currentPresetId === 0}
          className="bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea] font-display text-2xl w-11 h-11 flex items-center justify-center disabled:opacity-30 transition"
          title="Preset Anterior"
        >
          −
        </button>

        <select
          value={currentPresetId}
          disabled={disabled}
          onChange={(e) => onSelectPreset(Number(e.target.value))}
          className="bg-[#133332] text-[#eaf0ea] font-semibold text-sm px-3 h-11 border-0 focus:outline focus:outline-2 focus:outline-[#e3b862] cursor-pointer disabled:opacity-40"
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
          className="bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea] font-display text-2xl w-11 h-11 flex items-center justify-center disabled:opacity-30 transition"
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
                className="bg-[#050f10] text-[#eaf0ea] font-display text-2xl px-3 h-11 w-48 outline outline-2 outline-[#e3b862] uppercase"
              />
            </div>
          ) : (
            <button
              onClick={handleStartRename}
              className="font-display text-2xl sm:text-3xl text-[#eaf0ea] hover:text-[#e3b862] tracking-wide px-2 py-1 transition text-left"
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
              ? 'bg-[#63e0f5] text-[#04191a]'
              : 'bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea]'
          }`}
          title="Alternar A/B (Atalho: A)"
        >
          {isCompareActive ? 'A/B · ORIGINAL' : 'A / B'}
        </button>

        <button
          onClick={onReload}
          disabled={disabled}
          className="h-11 px-4 bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea] font-semibold text-xs uppercase tracking-wider transition disabled:opacity-35"
        >
          SYNC
        </button>

        <button
          onClick={onExportJson}
          className="h-11 px-3.5 bg-[#133332] hover:bg-[#1b4544] text-[#a9c0bc] hover:text-[#eaf0ea] font-semibold text-xs uppercase tracking-wider transition"
        >
          EXPORTAR
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-11 px-3.5 bg-[#133332] hover:bg-[#1b4544] text-[#a9c0bc] hover:text-[#eaf0ea] font-semibold text-xs uppercase tracking-wider transition"
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
          className="h-11 px-4 bg-[#133332] hover:bg-[#1b4544] text-[#63e0f5] font-semibold text-xs uppercase tracking-wider transition"
        >
          BACKUP 80
        </button>

        <button
          onClick={onSaveToFlash}
          disabled={disabled || isSaving}
          className={`h-11 px-5 font-semibold text-xs uppercase tracking-wider transition disabled:opacity-35 ${
            hasModifications
              ? 'bg-[#e3b862] hover:bg-[#f0c97a] text-[#231a06] font-bold'
              : 'bg-[#e3b862] hover:bg-[#f0c97a] text-[#231a06]'
          }`}
          title="Gravar na Flash (Ctrl+S)"
        >
          {isSaving ? 'GRAVANDO...' : hasModifications ? 'SALVAR*' : 'SALVAR NO PEDAL'}
        </button>
      </div>
    </div>
  )
}
