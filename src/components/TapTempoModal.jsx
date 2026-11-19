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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041011]/85 p-4">
      <div className="bg-[#0e2828] border-t-4 border-[#e3b862] w-full max-w-sm p-6 relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea] font-display text-lg transition"
        >
          ✕
        </button>

        <h2 className="font-display text-3xl text-[#eaf0ea] mb-5 self-start">
          TAP TEMPO
        </h2>

        <div className="w-full bg-[#05080a] p-5 flex flex-col items-center mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-3.5 h-3.5 rounded-full transition-colors ${
                isFlashing ? 'bg-[#e3b862]' : 'bg-[#3a2a10]'
              }`}
            />
            <span className="font-display text-5xl text-[#eaf0ea] tabular-nums leading-none">
              {bpm}
            </span>
            <span className="font-display text-xl text-[#a9c0bc]">BPM</span>
          </div>
          <div className="text-xs font-semibold text-[#63e0f5] mt-2 tabular-nums">
            {(60000 / bpm).toFixed(0)} MS (1/4)
          </div>
        </div>

        <button
          onClick={handleTap}
          className="w-full py-7 bg-[#e3b862] hover:bg-[#f0c97a] active:scale-[0.98] text-[#231a06] font-display text-4xl tracking-widest transition select-none"
        >
          TAP
        </button>

        <div className="w-full mt-5 flex items-center gap-3">
          <span className="font-display text-lg text-[#a9c0bc]">40</span>
          <input
            type="range"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => handleManualChange(e.target.value)}
            className="w-full accent-[#e3b862] cursor-pointer"
          />
          <span className="font-display text-lg text-[#a9c0bc]">240</span>
        </div>
      </div>
    </div>
  )
}
