import React from 'react'

export function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const shortcuts = [
    { key: '1 .. 6', desc: 'Ligar / Desligar blocos' },
    { key: '← / →', desc: 'Preset anterior / próximo' },
    { key: 'ESPAÇO', desc: 'Mute Master' },
    { key: 'A', desc: 'Alternar A / B' },
    { key: 'CTRL + S', desc: 'Salvar na Flash' },
    { key: 'T', desc: 'Afinador' },
    { key: 'C', desc: 'Tone3000 & Slots' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="bg-[#141416] border-t-4 border-[#d9822b] w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-display text-lg transition"
        >
          ✕
        </button>

        <h2 className="font-display text-3xl text-[#f2efe9] mb-5">
          ATALHOS
        </h2>

        <div className="space-y-1.5">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2.5 bg-[#060607] text-xs"
            >
              <kbd className="font-display text-lg text-[#e5a93c] tracking-wider">
                {sc.key}
              </kbd>
              <span className="text-[#f2efe9] font-semibold">{sc.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
