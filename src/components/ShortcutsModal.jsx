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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041011]/85 p-4">
      <div className="bg-[#0e2828] border-t-4 border-[#e3b862] w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea] font-display text-lg transition"
        >
          ✕
        </button>

        <h2 className="font-display text-3xl text-[#eaf0ea] mb-5">
          ATALHOS
        </h2>

        <div className="space-y-1.5">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2.5 bg-[#050f10] text-xs"
            >
              <kbd className="font-display text-lg text-[#e3b862] tracking-wider">
                {sc.key}
              </kbd>
              <span className="text-[#eaf0ea] font-semibold">{sc.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
