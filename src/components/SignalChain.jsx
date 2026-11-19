import React from 'react'
import { BLOCKS } from '../protocol/constants'
import { GitCommit, Volume2 } from 'lucide-react'

export function SignalChain({
  routing = [0, 1, 5, 2, 3, 4],
  blocksState = {},
  onBlockClick,
  onToggleBlock,
}) {
  const blocksById = {}
  BLOCKS.forEach((b) => {
    blocksById[b.id] = b
  })

  return (
    <div className="bg-[#121418] border border-neutral-800/80 rounded-2xl p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <GitCommit size={13} className="text-amber-500" />
          Roteamento de Sinal
        </span>
        <span className="text-[10px] text-neutral-500 font-mono">
          Clique no pedal para focar
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none">
        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-400 bg-neutral-900 px-2.5 py-1.5 rounded-lg border border-neutral-800 whitespace-nowrap">
          IN
        </div>

        <div className="text-neutral-600 text-xs font-mono select-none">→</div>

        {routing.map((blockId, index) => {
          const block = blocksById[blockId]
          if (!block) return null
          const isEnabled = blocksState[block.key]?.enabled ?? false

          return (
            <React.Fragment key={block.id}>
              <div
                onClick={() => onBlockClick && onBlockClick(block.key)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm whitespace-nowrap cursor-pointer select-none ${
                  isEnabled
                    ? 'bg-[#181b22] border-neutral-700 text-neutral-100 hover:border-neutral-500'
                    : 'bg-[#101215] border-neutral-800 text-neutral-500 opacity-60 hover:opacity-90'
                }`}
                style={{
                  borderLeft: `3px solid ${isEnabled ? block.color : '#373d49'}`,
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleBlock && onToggleBlock(block.key)
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isEnabled
                      ? 'bg-green-400 shadow-[0_0_8px_#2ecc71]'
                      : 'bg-neutral-700 hover:bg-neutral-600'
                  }`}
                  title="Ligar / Desligar bloco"
                />
                <span>{block.name}</span>
                <span className="text-[9px] font-mono text-neutral-500 ml-0.5">
                  #{index + 1}
                </span>
              </div>

              {index < routing.length - 1 && (
                <div className="text-neutral-600 text-xs font-mono select-none">→</div>
              )}
            </React.Fragment>
          )
        })}

        <div className="text-neutral-600 text-xs font-mono select-none">→</div>

        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-400 bg-neutral-900 px-2.5 py-1.5 rounded-lg border border-neutral-800 whitespace-nowrap">
          <Volume2 size={12} className="text-amber-500" />
          OUT
        </div>
      </div>
    </div>
  )
}
