import React from 'react'
import { X, Keyboard } from 'lucide-react'

export function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const shortcuts = [
    { key: '1 .. 6', desc: 'Ligar / Desligar blocos (FX, AMP, MOD, DLY, REV, CAB)' },
    { key: '←  /  →', desc: 'Navegar para o preset anterior / próximo' },
    { key: 'Espaço', desc: 'Mute geral / Bypass instantâneo' },
    { key: 'A', desc: 'Alternar comparação A / B (Original vs Editado)' },
    { key: 'Ctrl + S', desc: 'Gravar alterações permanentemente na memória Flash' },
    { key: 'T', desc: 'Abrir Afinador Cromático' },
    { key: 'C', desc: 'Abrir Tone3000 & Hub da Comunidade' },
    { key: 'Esc', desc: 'Fechar janelas / modais' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#14161a] border border-neutral-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Keyboard size={18} className="text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
            Atalhos de Teclado
          </h2>
        </div>

        <div className="space-y-2 mt-4">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-neutral-800/80 text-xs"
            >
              <kbd className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded-lg font-mono font-bold text-amber-400 text-[11px] shadow-sm">
                {sc.key}
              </kbd>
              <span className="text-neutral-300 text-right">{sc.desc}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-neutral-500 text-center mt-6">
          Projetado para controle ágil em estúdio ou ao vivo sem encostar no mouse.
        </p>
      </div>
    </div>
  )
}

