import React from 'react'
import { Knob } from './Knob'
import { GHOST } from '../protocol/constants'

export function BlockCard({
  block,
  state,
  onToggle,
  onModelChange,
  onKnobChange,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
  ampNames = [],
  cabNames = [],
  onCopyBlock,
  onPasteBlock,
  hasClipboard = false,
  shortcutNumber = null,
  onOpenImporter = null,
}) {
  const isEnabled = state?.enabled ?? false
  const modelIndex = state?.modelIndex ?? 0
  const knobsValues = state?.knobs ?? [50, 50, 50, 50, 50, 50]

  let modelsList = block.models
  if (block.key === 'amp' && ampNames.length > 0) {
    modelsList = ampNames
  } else if (block.key === 'cab' && cabNames.length > 0) {
    modelsList = cabNames
  }

  let knobNames = []
  if (!block.isDynamic) {
    knobNames = block.knobs[0]
  } else {
    knobNames = block.knobs[modelIndex] || block.knobs[0]
  }

  return (
    <article
      className={`flex flex-col transition-colors ${
        isEnabled ? 'bg-[#141416]' : 'bg-[#0f0f11] opacity-70'
      }`}
    >
      {/* Flat top color bar */}
      <div
        className="h-1 w-full transition-colors"
        style={{ backgroundColor: isEnabled ? block.color : '#1e1e22' }}
      />

      {/* Module Header */}
      <div className="bg-[#1e1e22] px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2.5 cursor-pointer focus:outline-none min-w-0"
            title={`Ligar/Desligar (Atalho: ${shortcutNumber})`}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0 transition-colors"
              style={{ backgroundColor: isEnabled ? '#e5484d' : '#3a1414' }}
            />
            <span className="font-display text-2xl tracking-wide text-[#f2efe9] truncate">
              {block.name}
            </span>
          </button>

          {shortcutNumber && (
            <span className="bg-[#0b0b0c] text-[#9a968e] text-[11px] font-bold px-1.5 py-0.5 shrink-0">
              {shortcutNumber}
            </span>
          )}
        </div>

        {/* Utility Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onCopyBlock && onCopyBlock(block.key, state)}
            className="bg-[#0b0b0c] hover:bg-[#2a2a30] text-[#9a968e] hover:text-[#f2efe9] px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition"
          >
            COPIAR
          </button>

          {hasClipboard && (
            <button
              type="button"
              onClick={() => onPasteBlock && onPasteBlock(block.key)}
              className="bg-[#d9822b] hover:bg-[#e8953f] text-[#120902] px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition"
            >
              COLAR
            </button>
          )}

          <button
            type="button"
            onClick={onMoveLeft}
            disabled={!canMoveLeft}
            className="bg-[#0b0b0c] hover:bg-[#2a2a30] text-[#9a968e] hover:text-[#f2efe9] px-2 py-1 text-xs font-bold disabled:opacity-25 transition"
            title="Mover para esquerda"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onMoveRight}
            disabled={!canMoveRight}
            className="bg-[#0b0b0c] hover:bg-[#2a2a30] text-[#9a968e] hover:text-[#f2efe9] px-2 py-1 text-xs font-bold disabled:opacity-25 transition"
            title="Mover para direita"
          >
            →
          </button>
        </div>
      </div>

      {/* Model / Capture Selector */}
      <div className="px-4 pt-3 flex items-center gap-1.5">
        <select
          value={modelIndex}
          onChange={(e) => onModelChange(Number(e.target.value))}
          className="flex-1 min-w-0 bg-[#060607] text-[#f2efe9] font-semibold text-sm px-3 py-2.5 border-0 focus:outline focus:outline-2 focus:outline-[#d9822b] cursor-pointer truncate"
        >
          {modelsList.map((m, idx) => (
            <option key={idx} value={idx}>
              {m}
            </option>
          ))}
        </select>

        {onOpenImporter && (
          <button
            type="button"
            onClick={() => onOpenImporter(block.key, modelIndex)}
            className="bg-[#d9822b] hover:bg-[#e8953f] text-[#120902] font-bold text-[11px] uppercase tracking-wider px-2.5 py-2.5 shrink-0 transition"
            title={`Importar arquivo para ${block.name}`}
          >
            IMPORTAR
          </button>
        )}
      </div>

      {/* 6-Knob Grid */}
      <div className="p-4 grid grid-cols-3 gap-y-4 gap-x-2">
        {knobNames.map((name, slotIdx) => {
          if (name === GHOST) {
            return (
              <div
                key={slotIdx}
                className="flex items-center justify-center min-h-[76px] select-none"
                aria-hidden="true"
              >
                <div className="w-3 h-0.5 bg-[#1e1e22]" />
              </div>
            )
          }

          const val = knobsValues[slotIdx] ?? 50
          return (
            <Knob
              key={slotIdx}
              label={name}
              value={val}
              color={block.color}
              disabled={false}
              onChange={(newVal) => onKnobChange(slotIdx, newVal)}
            />
          )
        })}
      </div>

      {/* Footswitch Footer Bar */}
      <div className="px-4 pb-4 mt-auto">
        <button
          type="button"
          onClick={onToggle}
          className={`w-full h-10 font-display text-lg uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            isEnabled
              ? 'bg-[#1e1e22] text-[#f2efe9] hover:bg-[#2a2a30]'
              : 'bg-[#060607] text-[#9a968e] hover:text-[#f2efe9]'
          }`}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: isEnabled ? '#e5484d' : '#3a1414' }}
          />
          <span>{isEnabled ? 'ATIVO' : 'BYPASS'}</span>
        </button>
      </div>
    </article>
  )
}
