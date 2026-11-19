import React from 'react'
import { Knob } from './Knob'
import { GHOST } from '../protocol/constants'
import { ArrowLeft, ArrowRight, Power, Copy, ClipboardPaste } from 'lucide-react'

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

  // Available models list (including dynamically read AMP/CAB from Flash)
  let modelsList = block.models
  if (block.key === 'amp' && ampNames.length > 0) {
    modelsList = ampNames
  } else if (block.key === 'cab' && cabNames.length > 0) {
    modelsList = cabNames
  }

  // Active knob labels
  let knobNames = []
  if (!block.isDynamic) {
    knobNames = block.knobs[0]
  } else {
    knobNames = block.knobs[modelIndex] || block.knobs[0]
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden shadow-xl ${
        isEnabled
          ? 'bg-[#15171c] border-neutral-700/80 shadow-black/80'
          : 'bg-[#111316] border-neutral-800/80 opacity-70'
      }`}
      style={{
        borderTop: `3px solid ${isEnabled ? block.color : '#262930'}`,
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#121418] border-b border-neutral-800/90">
        <div className="flex items-center gap-2">
          {/* LED Footswitch Button */}
          <button
            onClick={onToggle}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
            title={`Ligar/Desligar (Atalho: ${shortcutNumber})`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                isEnabled
                  ? 'bg-green-400 shadow-[0_0_10px_#2ecc71]'
                  : 'bg-neutral-800 border border-neutral-700'
              }`}
            />
            <span className="font-black text-xs tracking-wider text-neutral-200 uppercase">
              {block.name}
            </span>
          </button>

          {shortcutNumber && (
            <span className="text-[9px] font-mono font-bold text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
              {shortcutNumber}
            </span>
          )}
        </div>

        {/* Action Controls: Copy, Paste, Reorder */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCopyBlock && onCopyBlock(block.key, state)}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="Copiar configurações deste bloco"
          >
            <Copy size={13} />
          </button>

          {hasClipboard && (
            <button
              onClick={() => onPasteBlock && onPasteBlock(block.key)}
              className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition"
              title="Colar configurações copiadas"
            >
              <ClipboardPaste size={13} />
            </button>
          )}

          <div className="w-[1px] h-3 bg-neutral-800 mx-1" />

          <button
            onClick={onMoveLeft}
            disabled={!canMoveLeft}
            className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-20 hover:bg-neutral-800 transition"
            title="Mover para esquerda na cadeia"
          >
            <ArrowLeft size={13} />
          </button>
          <button
            onClick={onMoveRight}
            disabled={!canMoveRight}
            className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-20 hover:bg-neutral-800 transition"
            title="Mover para direita na cadeia"
          >
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Model Selector */}
      <div className="px-3.5 pt-3 pb-1">
        <select
          value={modelIndex}
          onChange={(e) => onModelChange(Number(e.target.value))}
          className="w-full bg-[#0d0f12] border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-200 focus:outline-none focus:border-amber-500 transition cursor-pointer truncate"
        >
          {modelsList.map((m, idx) => (
            <option key={idx} value={idx}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Knobs Grid (Fixed 6 slots per hardware spec) */}
      <div className="p-3.5 grid grid-cols-3 gap-y-3 gap-x-2">
        {knobNames.map((name, slotIdx) => {
          if (name === GHOST) {
            return (
              <div
                key={slotIdx}
                className="flex flex-col items-center justify-center opacity-10 select-none py-2"
              >
                <div className="w-11 h-11 rounded-full border border-dashed border-neutral-600" />
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

      {/* Subtle Bypass Footswitch bar */}
      <div className="mt-auto px-3.5 pb-3">
        <button
          onClick={onToggle}
          className={`w-full py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm ${
            isEnabled
              ? 'bg-neutral-800/80 border-neutral-700 text-neutral-200 hover:bg-neutral-750'
              : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-400'
          }`}
        >
          <Power size={12} className={isEnabled ? 'text-green-400' : 'text-neutral-500'} />
          <span>{isEnabled ? 'Ativo' : 'Bypass'}</span>
        </button>
      </div>
    </div>
  )
}
