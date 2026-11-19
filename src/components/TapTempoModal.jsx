import React, { useState, useRef, useEffect } from 'react'
import { X, Activity } from 'lucide-react'

export function TapTempoModal({ isOpen, onClose, currentBpm = 120, onBpmChange }) {
  const [bpm, setBpm] = useState(currentBpm)
  const [tapTimes, setTapTimes] = useState([])
  const [isFlashing, setIsFlashing] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    setBpm(currentBpm)
  }, [currentBpm])

  // Visual metronome flash
  useEffect(() => {
    if (!isOpen || bpm <= 0) return
    const intervalMs = (60 / bpm) * 1000

    const flash = () => {
      setIsFlashing(true)
      setTimeout(() => setIsFlashing(false), 80)
    }

    timerRef.current = setInterval(flash, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [isOpen, bpm])

  if (!isOpen) return null

  const handleTap = () => {
    const now = Date.now()
    const newTimes = [...tapTimes, now].filter((t) => now - t < 3000) // keep last 3 seconds
    setTapTimes(newTimes)

    if (newTimes.length >= 2) {
      const intervals = []
      for (let i = 1; i < newTimes.length; i++) {
        intervals.push(newTimes[i] - newTimes[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const calculatedBpm = Math.round(60000 / avgInterval)
      const clampedBpm = Math.max(40, Math.min(240, calculatedBpm))
      setBpm(clampedBpm)
      if (onBpmChange) onBpmChange(clampedBpm)
    }
  }

  const handleManualChange = (val) => {
    const num = Math.max(40, Math.min(240, Number(val)))
    setBpm(num)
    if (onBpmChange) onBpmChange(num)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#14161a] border border-neutral-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Activity size={18} className="text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
            Tap Tempo / BPM
          </h2>
        </div>

        {/* Flashing Metronome Indicator */}
        <div className="flex items-center gap-3 my-2">
          <div
            className={`w-6 h-6 rounded-full transition-all duration-75 ${
              isFlashing
                ? 'bg-amber-400 shadow-[0_0_16px_#f59e0b] scale-110'
                : 'bg-neutral-800 border border-neutral-700 scale-100'
            }`}
          />
          <span className="text-4xl font-black font-mono text-white tracking-tight">
            {bpm} <span className="text-sm font-sans font-bold text-neutral-400">BPM</span>
          </span>
        </div>

        <div className="text-xs font-mono text-neutral-400 mt-1 mb-6">
          Delay {(60000 / bpm).toFixed(0)} ms (1/4 nota)
        </div>

        {/* Big Tap Button */}
        <button
          onClick={handleTap}
          className="w-full py-8 rounded-2xl bg-gradient-to-b from-[#262930] to-[#181a1f] hover:from-[#2e323b] hover:to-[#1e2027] active:scale-[0.98] border border-neutral-700 text-lg font-black tracking-widest text-amber-400 shadow-xl transition-all duration-100 select-none uppercase"
        >
          TAP
        </button>

        {/* Manual BPM Slider */}
        <div className="w-full mt-6 flex items-center gap-3">
          <span className="text-[11px] font-bold text-neutral-400 font-mono">40</span>
          <input
            type="range"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => handleManualChange(e.target.value)}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="text-[11px] font-bold text-neutral-400 font-mono">240</span>
        </div>
      </div>
    </div>
  )
}

