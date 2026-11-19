import React from 'react'
import { BLOCKS } from '../protocol/constants'

function StageGraphic({ blockKey, enabled }) {
  const ledColor = enabled ? '#e5484d' : '#3a1414'

  if (blockKey === 'amp') {
    return (
      <svg viewBox="0 0 80 48" className="w-14 h-9 shrink-0" aria-hidden="true">
        <rect x="2" y="2" width="76" height="44" rx="2" fill="#181512" />
        <rect x="6" y="6" width="68" height="12" fill="#e5a93c" />
        {[15, 27, 39, 51, 63].map((x) => (
          <circle key={x} cx={x} cy="12" r="2.8" fill="#141416" />
        ))}
        <rect x="6" y="22" width="68" height="20" fill="#26211c" />
        <path d="M6 28H74M6 34H74M6 39H74" stroke="#181512" strokeWidth="1.5" />
        <circle cx="70" cy="12" r="2" fill={ledColor} />
      </svg>
    )
  }

  if (blockKey === 'cab') {
    return (
      <svg viewBox="0 0 44 48" className="w-9 h-9 shrink-0" aria-hidden="true">
        <rect x="2" y="2" width="40" height="44" rx="2" fill="#1c1410" />
        <circle cx="22" cy="16" r="10" fill="#0b0b0c" />
        <circle cx="22" cy="16" r="3.5" fill="#b85d35" />
        <circle cx="22" cy="36" r="7" fill="#0b0b0c" />
        <circle cx="22" cy="36" r="2.5" fill="#b85d35" />
      </svg>
    )
  }

  // Mini stompbox SVG (FX, MOD, DLY, REV)
  return (
    <svg viewBox="0 0 40 52" className="w-8 h-9 shrink-0" aria-hidden="true">
      <rect x="2" y="2" width="36" height="48" rx="2" fill="#141416" />
      <circle cx="12" cy="11" r="3.5" fill="#2a2a30" />
      <path d="M12 11V8" stroke="#f2efe9" strokeWidth="1.2" />
      <circle cx="28" cy="11" r="3.5" fill="#2a2a30" />
      <path d="M28 11V8" stroke="#f2efe9" strokeWidth="1.2" />
      <circle cx="20" cy="22" r="2.2" fill={ledColor} />
      <rect x="8" y="27" width="24" height="4" fill="#222226" />
      <circle cx="20" cy="40" r="6" fill="#7c8086" />
      <circle cx="20" cy="40" r="3.5" fill="#c9ced3" />
    </svg>
  )
}

export function SignalChain({
  routing = [0, 1, 5, 2, 3, 4],
  blocksState = {},
  onBlockClick,
  onToggleBlock,
  onMoveBlock,
  ampNames = [],
  cabNames = [],
}) {
  const blocksById = {}
  BLOCKS.forEach((b) => {
    blocksById[b.id] = b
  })

  return (
    <section className="bg-[#141416] p-3 sm:p-4 relative overflow-hidden">
      <div className="relative flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
        {/* Animated signal cable behind nodes */}
        <div
          className="hidden md:block absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-[#1e1e22] overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div className="w-16 h-full bg-[#e5a93c] cable-pulse" />
        </div>

        {/* Input P10 Jack */}
        <div
          className="hidden md:flex flex-col items-center gap-1 relative z-10 shrink-0"
          title="IN"
        >
          <div className="w-8 h-8 rounded-full bg-[#9a968e] border-[6px] border-[#38383e]" />
          <span className="font-display text-xs text-[#9a968e]">IN</span>
        </div>

        {/* 6 Interactive Stages */}
        <div className="relative z-10 flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 min-w-[540px] sm:min-w-0">
          {routing.map((blockId, index) => {
            const block = blocksById[blockId]
            if (!block) return null

            const blkState = blocksState[block.key] || {}
            const isEnabled = blkState.enabled ?? false
            const modelIdx = blkState.modelIndex ?? 0

            let modelList = block.models
            if (block.key === 'amp' && ampNames.length > 0) modelList = ampNames
            if (block.key === 'cab' && cabNames.length > 0) modelList = cabNames
            const activeModelName = modelList[modelIdx] || modelList[0] || ''

            return (
              <div
                key={block.id}
                onClick={() => onBlockClick && onBlockClick(block.key)}
                className="flex flex-col justify-between p-2.5 cursor-pointer transition-colors select-none min-h-[108px]"
                style={{
                  backgroundColor: isEnabled ? block.color : '#1e1e22',
                  color: isEnabled ? '#120902' : '#9a968e',
                }}
              >
                {/* Top row: order + LED */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm opacity-75">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleBlock && onToggleBlock(block.key)
                    }}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: isEnabled ? 'rgba(18, 9, 2, 0.22)' : '#060607',
                      color: isEnabled ? '#120902' : '#9a968e',
                    }}
                    title="Ligar / Bypass"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isEnabled ? '#e5484d' : '#3a1414' }}
                    />
                    <span>{isEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Middle: SVG Graphic + Name */}
                <div className="flex items-center gap-2 my-1.5">
                  <StageGraphic blockKey={block.key} enabled={isEnabled} />
                  <div className="min-w-0">
                    <div className="font-display text-xl leading-none truncate">
                      {block.name}
                    </div>
                    <div className="text-[11px] font-semibold truncate opacity-85 mt-0.5">
                      {activeModelName}
                    </div>
                  </div>
                </div>

                {/* Bottom: Reorder controls */}
                {onMoveBlock && (
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation()
                        onMoveBlock(index, index - 1)
                      }}
                      className="px-2 py-0.5 text-xs font-bold disabled:opacity-25 transition"
                      style={{
                        backgroundColor: isEnabled ? 'rgba(18, 9, 2, 0.16)' : '#0b0b0c',
                      }}
                      title="Mover para esquerda"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={index === routing.length - 1}
                      onClick={(e) => {
                        e.stopPropagation()
                        onMoveBlock(index, index + 1)
                      }}
                      className="px-2 py-0.5 text-xs font-bold disabled:opacity-25 transition"
                      style={{
                        backgroundColor: isEnabled ? 'rgba(18, 9, 2, 0.16)' : '#0b0b0c',
                      }}
                      title="Mover para direita"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Output P10 Jack */}
        <div
          className="hidden md:flex flex-col items-center gap-1 relative z-10 shrink-0"
          title="OUT"
        >
          <div className="w-8 h-8 rounded-full bg-[#9a968e] border-[6px] border-[#38383e]" />
          <span className="font-display text-xs text-[#9a968e]">OUT</span>
        </div>
      </div>
    </section>
  )
}
