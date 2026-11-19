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
        isEnabled ? 'bg-[#0e2828]' : 'bg-[#0a1e1f] opacity-70'
      }`}
    >
      {/* Flat top color bar */}
      <div
        className="h-1 w-full transition-colors"
        style={{ backgroundColor: isEnabled ? block.color : '#133332' }}
      />

      {/* Module Header */}
      <div className="bg-[#133332] px-4 py-2.5 flex items-center justify-between gap-2">
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
            <span className="font-display text-2xl tracking-wide text-[#eaf0ea] truncate">
              {block.name}
            </span>
          </button>

          {shortcutNumber && (
            <span className="bg-[#071819] text-[#a9c0bc] text-[11px] font-bold px-1.5 py-0.5 shrink-0">
              {shortcutNumber}
            </span>
          )}
        </div>

        {/* Utility Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onCopyBlock && onCopyBlock(block.key, state)}
            className="bg-[#071819] hover:bg-[#1b4544] text-[#a9c0bc] hover:text-[#eaf0ea] px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition"
          >
            COPIAR
          </button>

          {hasClipboard && (
            <button
              type="button"
              onClick={() => onPasteBlock && onPasteBlock(block.key)}
              className="bg-[#e3b862] hover:bg-[#f0c97a] text-[#231a06] px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition"
            >
              COLAR
            </button>
          )}

          <button
            type="button"
            onClick={onMoveLeft}
            disabled={!canMoveLeft}
            className="bg-[#071819] hover:bg-[#1b4544] text-[#a9c0bc] hover:text-[#eaf0ea] px-2 py-1 text-xs font-bold disabled:opacity-25 transition"
            title="Mover para esquerda"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onMoveRight}
            disabled={!canMoveRight}
            className="bg-[#071819] hover:bg-[#1b4544] text-[#a9c0bc] hover:text-[#eaf0ea] px-2 py-1 text-xs font-bold disabled:opacity-25 transition"
            title="Mover para direita"
          >
            →
          </button>
        </div>
      </div>

      {/* Model / Capture Selector */}
      <div className="px-4 pt-3">
        <select
          value={modelIndex}
          onChange={(e) => onModelChange(Number(e.target.value))}
          className="w-full bg-[#050f10] text-[#eaf0ea] font-semibold text-sm px-3 py-2.5 border-0 focus:outline focus:outline-2 focus:outline-[#e3b862] cursor-pointer truncate"
        >
          {modelsList.map((m, idx) => (
            <option key={idx} value={idx}>
              {m}
            </option>
          ))}
        </select>
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
                <div className="w-3 h-0.5 bg-[#133332]" />
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
              disabled={!isEnabled}
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
              ? 'bg-[#133332] text-[#eaf0ea] hover:bg-[#1b4544]'
              : 'bg-[#050f10] text-[#6f8a87] hover:text-[#eaf0ea]'
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
