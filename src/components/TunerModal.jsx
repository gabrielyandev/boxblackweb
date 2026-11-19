import React, { useState, useEffect, useRef } from 'react'

const NOTE_STRINGS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function noteFromPitch(frequency) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2))
  return Math.round(noteNum) + 69
}

function frequencyFromNoteNumber(note) {
  return 440 * Math.pow(2, (note - 69) / 12)
}

function centsOffFromPitch(frequency, note) {
  return Math.floor((1200 * Math.log(frequency / frequencyFromNoteNumber(note))) / Math.log(2))
}

function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length
  let rms = 0

  for (let i = 0; i < SIZE; i++) {
    const val = buf[i]
    rms += val * val
  }
  rms = Math.sqrt(rms / SIZE)
  if (rms < 0.015) return -1

  let r1 = 0
  let r2 = SIZE - 1
  const thres = 0.2
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i
      break
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i
      break
    }
  }

  const bufSlice = buf.slice(r1, r2)
  const c = new Array(bufSlice.length).fill(0)
  for (let i = 0; i < bufSlice.length; i++) {
    for (let j = 0; j < bufSlice.length - i; j++) {
      c[i] = c[i] + bufSlice[j] * bufSlice[j + i]
    }
  }

  let d = 0
  while (c[d] > c[d + 1]) d++
  let maxval = -1
  let maxpos = -1
  for (let i = d; i < bufSlice.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i]
      maxpos = i
    }
  }
  let T0 = maxpos

  const x1 = c[T0 - 1]
  const x2 = c[T0]
  const x3 = c[T0 + 1]
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  if (a) T0 = T0 - b / (2 * a)

  return sampleRate / T0
}

export function TunerModal({ isOpen, onClose }) {
  const [isListening, setIsListening] = useState(false)
  const [pitch, setPitch] = useState(0)
  const [noteName, setNoteName] = useState('--')
  const [cents, setCents] = useState(0)
  const [errorMsg, setErrorMsg] = useState(null)

  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)

  const startTuner = async () => {
    try {
      setErrorMsg(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream

      const AudioContext = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      setIsListening(true)

      const buflen = 2048
      const buf = new Float32Array(buflen)

      const updatePitch = () => {
        analyser.getFloatTimeDomainData(buf)
        const ac = autoCorrelate(buf, audioCtx.sampleRate)

        if (ac !== -1 && ac > 30 && ac < 2000) {
          const freq = Math.round(ac * 10) / 10
          const note = noteFromPitch(freq)
          const name = NOTE_STRINGS[note % 12]
          const octave = Math.floor(note / 12) - 1
          const off = centsOffFromPitch(freq, note)

          setPitch(freq)
          setNoteName(`${name}${octave}`)
          setCents(off)
        }

        animFrameRef.current = requestAnimationFrame(updatePitch)
      }

      updatePitch()
    } catch (err) {
      setErrorMsg('Acesso ao áudio indisponível.')
      setIsListening(false)
    }
  }

  const stopTuner = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setIsListening(false)
    setPitch(0)
    setNoteName('--')
    setCents(0)
  }

  useEffect(() => {
    if (isOpen) {
      startTuner()
    } else {
      stopTuner()
    }
    return () => stopTuner()
  }, [isOpen])

  if (!isOpen) return null

  const isTuned = Math.abs(cents) <= 3 && noteName !== '--'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="bg-[#141416] border-t-4 border-[#d9822b] w-full max-w-md p-6 relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-display text-lg transition"
        >
          ✕
        </button>

        <h2 className="font-display text-3xl text-[#f2efe9] mb-6 self-start">
          AFINADOR
        </h2>

        {errorMsg ? (
          <div className="w-full p-4 bg-[#060607] text-[#e5484d] text-sm font-semibold text-center my-4">
            {errorMsg}
          </div>
        ) : (
          <div className="w-full bg-[#060607] p-6 flex flex-col items-center">
            <div
              className={`font-display text-7xl tracking-tight leading-none transition-colors ${
                isTuned
                  ? 'text-[#e5a93c]'
                  : noteName !== '--'
                  ? 'text-[#f2efe9]'
                  : 'text-[#38383e]'
              }`}
            >
              {noteName}
            </div>
            <div className="text-xs font-semibold text-[#9a968e] mt-2 tabular-nums">
              {pitch > 0 ? `${pitch.toFixed(1)} HZ` : 'AGUARDANDO SINAL'}
            </div>

            {/* Flat horizontal gauge */}
            <div className="w-full mt-6">
              <div className="flex justify-between text-[11px] font-semibold text-[#9a968e] mb-2 tabular-nums">
                <span>-50</span>
                <span>0</span>
                <span>+50</span>
              </div>

              <div className="w-full h-2 bg-[#1e1e22] relative">
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-[#b86b1f]" />
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-4 -ml-1.5 transition-all duration-75 ${
                    isTuned ? 'bg-[#e5a93c]' : 'bg-[#d9822b]'
                  }`}
                  style={{
                    left: `${Math.max(4, Math.min(96, 50 + (cents / 50) * 46))}%`,
                  }}
                />
              </div>

              <div className="mt-4 text-center font-display text-xl tabular-nums">
                {noteName !== '--' ? (
                  <span className={isTuned ? 'text-[#e5a93c]' : 'text-[#f2efe9]'}>
                    {cents > 0 ? `+${cents}` : cents} CENTS
                  </span>
                ) : (
                  <span className="text-[#38383e]">--</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 w-full flex justify-end">
          <button
            onClick={isListening ? stopTuner : startTuner}
            className={`px-5 h-11 text-xs font-bold uppercase tracking-wider transition ${
              isListening
                ? 'bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9]'
                : 'bg-[#d9822b] hover:bg-[#e8953f] text-[#120902]'
            }`}
          >
            {isListening ? 'PAUSAR' : 'ATIVAR ÁUDIO'}
          </button>
        </div>
      </div>
    </div>
  )
}
