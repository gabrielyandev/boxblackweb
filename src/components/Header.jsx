import React from 'react'
import { Knob } from './Knob'

export function Header({
  connectionState,
  onConnectBLE,
  onConnectMIDI,
  onDisconnect,
  masterVolume = 85,
  onMasterVolumeChange,
  onOpenTuner,
  onOpenTapTempo,
  onOpenShortcuts,
  onOpenCommunity,
  onOpenSupport,
}) {
  const isConnected = connectionState.state === 'connected'
  const isConnecting = connectionState.state === 'connecting'

  return (
    <header className="bg-[#0b0b0c] sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <div className="font-display text-3xl sm:text-4xl tracking-tight text-[#f2efe9]">
            BLACK<span className="text-[#e5a93c]">BOX</span>
          </div>
          <span className="bg-[#060607] text-[#d9822b] text-[11px] font-bold px-2 py-1 uppercase tracking-wider">
            V23 ONLINE
          </span>
        </div>

        {/* Studio Utilities */}
        <nav className="order-3 sm:order-2 w-full sm:w-auto flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={onOpenCommunity}
            className="bg-[#1e1e22] hover:bg-[#2a2a30] text-[#e5a93c] px-3.5 min-h-[40px] text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap"
            title="Tone3000 & NAM (Atalho: C)"
          >
            TONE3000 / NAM
          </button>

          <button
            onClick={onOpenTuner}
            className="bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] px-3.5 min-h-[40px] text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap"
            title="Afinador (Atalho: T)"
          >
            AFINADOR
          </button>

          <button
            onClick={onOpenTapTempo}
            className="bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] px-3.5 min-h-[40px] text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap"
            title="Tap Tempo / BPM"
          >
            TAP BPM
          </button>

          <button
            onClick={onOpenShortcuts}
            className="hidden md:inline-flex items-center bg-[#1e1e22] hover:bg-[#2a2a30] text-[#9a968e] hover:text-[#f2efe9] px-3 min-h-[40px] text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap"
            title="Atalhos"
          >
            ATALHOS
          </button>

          <button
            onClick={onOpenSupport}
            className="bg-[#1e1e22] hover:bg-[#2a2a30] text-[#d9822b] px-3.5 min-h-[40px] text-xs font-bold uppercase tracking-wider transition whitespace-nowrap flex items-center gap-1.5"
            title="Apoiar o projeto & Créditos"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
              <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="currentColor" />
              <path
                d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2.5M12 3.5v2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>APOIAR</span>
          </button>
        </nav>

        {/* Master & Connection */}
        <div className="order-2 sm:order-3 flex items-center gap-2 sm:gap-3">
          {/* Compact Master Output */}
          <div className="hidden md:flex items-center gap-2 bg-[#141416] px-3 py-1">
            <Knob
              label="MASTER"
              value={masterVolume}
              color="#d9822b"
              size="sm"
              disabled={!isConnected}
              onChange={onMasterVolumeChange}
            />
          </div>

          {/* Mobile Master quick value */}
          <div className="flex md:hidden items-center gap-2 bg-[#141416] px-2.5 min-h-[42px]">
            <span className="text-[10px] font-bold uppercase text-[#9a968e]">MST</span>
            <span className="font-display text-xl text-[#e5a93c] tabular-nums">{masterVolume}</span>
          </div>

          {!isConnected ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onConnectBLE}
                disabled={isConnecting}
                className="bg-[#d9822b] hover:bg-[#e8953f] active:scale-[0.98] text-[#120902] font-bold text-xs sm:text-sm uppercase tracking-wide px-4 min-h-[42px] transition disabled:opacity-50"
              >
                {isConnecting && connectionState.method === 'ble' ? 'BUSCANDO...' : 'BLUETOOTH'}
              </button>

              <button
                onClick={onConnectMIDI}
                disabled={isConnecting}
                className="bg-[#1e1e22] hover:bg-[#2a2a30] active:scale-[0.98] text-[#f2efe9] font-semibold text-xs sm:text-sm uppercase tracking-wide px-3.5 min-h-[42px] transition disabled:opacity-50"
              >
                {isConnecting && connectionState.method === 'midi' ? 'LENDO...' : 'CABO USB'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="bg-[#060607] px-3.5 min-h-[42px] flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e5a93c]" />
                <span className="font-display text-xl text-[#e5a93c] truncate max-w-[110px]">
                  {connectionState.deviceName || 'BLACKBOX'}
                </span>
              </div>

              <button
                onClick={onDisconnect}
                className="bg-[#1e1e22] hover:bg-[#e5484d] hover:text-white text-[#9a968e] font-semibold text-xs uppercase tracking-wider px-3.5 min-h-[42px] transition"
              >
                SAIR
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom status bar line */}
      <div className="w-full h-[3px] bg-[#1e1e22]">
        <div
          className={`h-full transition-all duration-300 ${
            isConnected ? 'w-full bg-[#e5a93c]' : isConnecting ? 'w-1/2 bg-[#d9822b]' : 'w-0'
          }`}
        />
      </div>
    </header>
  )
}
