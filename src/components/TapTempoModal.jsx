import React, { useState, useRef, useEffect } from 'react'

export function TapTempoModal({ isOpen, onClose, currentBpm = 120, onBpmChange }) {
  const [bpm, setBpm] = useState(currentBpm)
  const [tapTimes, setTapTimes] = useState([])
  const [isFlashing, setIsFlashing] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    setBpm(currentBpm)
  }, [currentBpm])

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
    const newTimes = [...tapTimes, now].filter((t) => now - t < 3000)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="bg-[#141416] border-t-4 border-[#d9822b] w-full max-w-sm p-6 relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-display text-lg transition"
        >
          ✕
        </button>

        <h2 className="font-display text-3xl text-[#f2efe9] mb-5 self-start">
          TAP TEMPO
        </h2>

        <div className="w-full bg-[#060607] p-5 flex flex-col items-center mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-3.5 h-3.5 rounded-full transition-colors ${
                isFlashing ? 'bg-[#e5a93c]' : 'bg-[#38383e]'
              }`}
            />
            <span className="font-display text-5xl text-[#f2efe9] tabular-nums leading-none">
              {bpm}
            </span>
            <span className="font-display text-xl text-[#9a968e]">BPM</span>
          </div>
          <div className="text-xs font-semibold text-[#e5a93c] mt-2 tabular-nums">
            {(60000 / bpm).toFixed(0)} MS (1/4)
          </div>
        </div>

        <button
          onClick={handleTap}
          className="w-full py-7 bg-[#d9822b] hover:bg-[#e8953f] active:scale-[0.98] text-[#120902] font-display text-4xl tracking-widest transition select-none"
        >
          TAP
        </button>

        <div className="w-full mt-5 flex items-center gap-3">
          <span className="font-display text-lg text-[#9a968e]">40</span>
          <input
            type="range"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => handleManualChange(e.target.value)}
            className="w-full accent-[#d9822b] cursor-pointer"
          />
          <span className="font-display text-lg text-[#9a968e]">240</span>
        </div>
      </div>
    </div>
  )
}
