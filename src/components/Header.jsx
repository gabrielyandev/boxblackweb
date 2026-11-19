import React from 'react'
import { Knob } from './Knob'
import { Bluetooth, Cable, Unplug, Mic, Activity, Keyboard, Radio, Compass } from 'lucide-react'

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
    <header className="bg-[#101215] border-b border-neutral-800/90 px-4 py-2.5 shadow-xl select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Hardware status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md shadow-amber-600/20 border border-amber-400/40">
            <Radio className="text-black" size={17} />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-black tracking-tight text-white uppercase font-mono">
              BLACKBOX
            </h1>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              FW V23
            </span>
          </div>
        </div>

        {/* Studio Utilities (Tone3000, Tuner, Tap, Shortcuts) */}
        <div className="hidden sm:flex items-center gap-1.5 bg-neutral-900/90 px-2 py-1 rounded-xl border border-neutral-800">
          <button
            onClick={onOpenCommunity}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-neutral-800 text-xs font-semibold transition"
            title="Explorar Tone3000 e Timbres da Comunidade"
          >
            <Compass size={14} className="text-amber-400" />
            <span>Tone3000 & NAM</span>
          </button>

          <div className="w-[1px] h-3 bg-neutral-800" />

          <button
            onClick={onOpenTuner}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-semibold transition"
            title="Afinador Cromático (Atalho: T)"
          >
            <Mic size={13} className="text-amber-500" />
            <span>Afinador</span>
          </button>

          <div className="w-[1px] h-3 bg-neutral-800" />

          <button
            onClick={onOpenTapTempo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-semibold transition"
            title="Tap Tempo / BPM"
          >
            <Activity size={13} className="text-amber-500" />
            <span>Tap BPM</span>
          </button>

          <div className="w-[1px] h-3 bg-neutral-800" />

          <button
            onClick={onOpenShortcuts}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="Atalhos de Teclado"
          >
            <Keyboard size={14} />
          </button>
        </div>

        {/* Master Output & Connection */}
        <div className="flex items-center gap-4">
          {/* Master Volume Knob */}
          <div className="flex items-center gap-2 bg-neutral-900/90 px-2.5 py-1 rounded-xl border border-neutral-800">
            <Knob
              label="Master"
              value={masterVolume}
              color="#f59e0b"
              size="sm"
              disabled={!isConnected}
              onChange={onMasterVolumeChange}
            />
          </div>

          {/* Connection Actions */}
          <div className="flex items-center gap-2">
            {!isConnected ? (
              <>
                <button
                  onClick={onConnectBLE}
                  disabled={isConnecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/30 hover:bg-blue-900/50 border border-blue-500/40 text-blue-300 text-xs font-bold transition disabled:opacity-50"
                  title="Conectar via Bluetooth"
                >
                  <Bluetooth size={14} />
                  <span>{isConnecting && connectionState.method === 'ble' ? 'Buscando...' : 'Bluetooth'}</span>
                </button>

                <button
                  onClick={onConnectMIDI}
                  disabled={isConnecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold transition disabled:opacity-50"
                  title="Conectar via USB MIDI SysEx"
                >
                  <Cable size={14} />
                  <span>{isConnecting && connectionState.method === 'midi' ? 'Conectando...' : 'Cabo USB'}</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-neutral-900 px-2.5 py-1 rounded-xl border border-neutral-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-neutral-200 truncate max-w-[120px] font-mono">
                      {connectionState.deviceName || 'BlackBox'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onDisconnect}
                  className="p-1.5 rounded-xl bg-neutral-900 hover:bg-red-950/40 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-300 transition"
                  title="Desconectar da pedaleira"
                >
                  <Unplug size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
