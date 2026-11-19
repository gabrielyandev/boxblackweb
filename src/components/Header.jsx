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
}) {
  const isConnected = connectionState.state === 'connected'
  const isConnecting = connectionState.state === 'connecting'

  return (
    <header className="bg-[#071819] sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <div className="font-display text-3xl sm:text-4xl tracking-tight text-[#eaf0ea]">
            BLACK<span className="text-[#63e0f5]">BOX</span>
          </div>
          <span className="bg-[#050f10] text-[#e3b862] text-[11px] font-bold px-2 py-1 uppercase tracking-wider">
            V23 ONLINE
          </span>
        </div>

        {/* Studio Utilities */}
        <nav className="order-3 sm:order-2 w-full sm:w-auto flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={onOpenCommunity}
            className="bg-[#133332] hover:bg-[#1b4544] text-[#e3b862] px-3.5 min-h-[40px] text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap"
            title="Tone3000 & NAM (Atalho: C)"
          >
            TONE3000 / NAM
          </button>

          <button
            onClick={onOpenTuner}
            className="bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea] px-3.5 min-h-[40px] text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap"
            title="Afinador (Atalho: T)"
          >
            AFINADOR
          </button>

          <button
            onClick={onOpenTapTempo}
            className="bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea] px-3.5 min-h-[40px] text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap"
            title="Tap Tempo / BPM"
          >
            TAP BPM
          </button>

          <button
            onClick={onOpenShortcuts}
            className="hidden md:inline-flex items-center bg-[#133332] hover:bg-[#1b4544] text-[#a9c0bc] hover:text-[#eaf0ea] px-3 min-h-[40px] text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap"
            title="Atalhos"
          >
            ATALHOS
          </button>
        </nav>

        {/* Master & Connection */}
        <div className="order-2 sm:order-3 flex items-center gap-2 sm:gap-3">
          {/* Compact Master Output */}
          <div className="hidden md:flex items-center gap-2 bg-[#0e2828] px-3 py-1">
            <Knob
              label="MASTER"
              value={masterVolume}
              color="#e3b862"
              size="sm"
              disabled={!isConnected}
              onChange={onMasterVolumeChange}
            />
          </div>

          {/* Mobile Master quick value */}
          <div className="flex md:hidden items-center gap-2 bg-[#0e2828] px-2.5 min-h-[42px]">
            <span className="text-[10px] font-bold uppercase text-[#a9c0bc]">MST</span>
            <span className="font-display text-xl text-[#e3b862] tabular-nums">{masterVolume}</span>
          </div>

          {!isConnected ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onConnectBLE}
                disabled={isConnecting}
                className="bg-[#e3b862] hover:bg-[#f0c97a] active:scale-[0.98] text-[#231a06] font-semibold text-xs sm:text-sm uppercase tracking-wide px-4 min-h-[42px] transition disabled:opacity-50"
              >
                {isConnecting && connectionState.method === 'ble' ? 'BUSCANDO...' : 'BLUETOOTH'}
              </button>

              <button
                onClick={onConnectMIDI}
                disabled={isConnecting}
                className="bg-[#133332] hover:bg-[#1b4544] active:scale-[0.98] text-[#eaf0ea] font-semibold text-xs sm:text-sm uppercase tracking-wide px-3.5 min-h-[42px] transition disabled:opacity-50"
              >
                {isConnecting && connectionState.method === 'midi' ? 'LENDO...' : 'CABO USB'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="bg-[#050f10] px-3.5 min-h-[42px] flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#63e0f5]" />
                <span className="font-display text-xl text-[#63e0f5] truncate max-w-[110px]">
                  {connectionState.deviceName || 'BLACKBOX'}
                </span>
              </div>

              <button
                onClick={onDisconnect}
                className="bg-[#133332] hover:bg-[#e5484d] hover:text-white text-[#a9c0bc] font-semibold text-xs uppercase tracking-wider px-3.5 min-h-[42px] transition"
              >
                SAIR
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom status bar line */}
      <div className="w-full h-[3px] bg-[#133332]">
        <div
          className={`h-full transition-all duration-300 ${
            isConnected ? 'w-full bg-[#63e0f5]' : isConnecting ? 'w-1/2 bg-[#e3b862]' : 'w-0'
          }`}
        />
      </div>
    </header>
  )
}
