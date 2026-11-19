import React, { useState, useEffect, useRef } from 'react'
import { X, Mic, MicOff, Volume2 } from 'lucide-react'

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

// Auto-correlation pitch detection algorithm
function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length
  let rms = 0

  for (let i = 0; i < SIZE; i++) {
    const val = buf[i]
    rms += val * val
  }
  rms = Math.sqrt(rms / SIZE)
  if (rms < 0.015) return -1 // signal too quiet

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

  // Parabolic interpolation for fine frequency accuracy
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
      setErrorMsg('Acesso ao microfone/áudio negado ou indisponível.')
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
  const needleRotation = Math.max(-45, Math.min(45, cents * 0.9))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#14161a] border border-neutral-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
            Afinador Cromático
          </h2>
        </div>

        {errorMsg ? (
          <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs text-center my-4">
            {errorMsg}
          </div>
        ) : (
          <>
            {/* Note Display */}
            <div className="my-2 flex flex-col items-center">
              <div
                className={`text-6xl font-black font-mono tracking-tight transition-colors duration-150 ${
                  isTuned
                    ? 'text-green-400 drop-shadow-[0_0_15px_#2ecc71]'
                    : noteName !== '--'
                    ? 'text-white'
                    : 'text-neutral-600'
                }`}
              >
                {noteName}
              </div>
              <div className="text-xs font-mono text-neutral-400 mt-1">
                {pitch > 0 ? `${pitch.toFixed(1)} Hz` : 'Toque uma corda'}
              </div>
            </div>

            {/* Needle Gauge */}
            <div className="w-full relative h-24 flex flex-col items-center justify-end mt-4">
              <div className="w-full flex justify-between text-[10px] font-mono text-neutral-500 px-8 mb-2">
                <span>-50</span>
                <span>-25</span>
                <span className="text-neutral-300 font-bold">0</span>
                <span>+25</span>
                <span>+50</span>
              </div>

              {/* Arc baseline */}
              <div className="w-48 h-1 bg-neutral-800 rounded-full relative overflow-visible">
                {/* Center marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-3 bg-neutral-600 rounded" />
                {/* Needle indicator */}
                <div
                  className={`absolute top-1/2 left-1/2 -translate-y-1/2 w-3 h-3 rounded-full -ml-1.5 transition-all duration-100 ${
                    isTuned ? 'bg-green-400 shadow-[0_0_8px_#2ecc71]' : 'bg-amber-400'
                  }`}
                  style={{
                    left: `${50 + (cents / 50) * 45}%`,
                  }}
                />
              </div>

              {/* Cents read */}
              <div className="mt-4 text-xs font-mono font-bold">
                {noteName !== '--' ? (
                  <span className={isTuned ? 'text-green-400' : 'text-neutral-300'}>
                    {cents > 0 ? `+${cents}` : cents} cents
                  </span>
                ) : (
                  <span className="text-neutral-600">Aguardando sinal...</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer controls */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={isListening ? stopTuner : startTuner}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition shadow ${
              isListening
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-750'
                : 'bg-amber-600 border-amber-500 text-black hover:bg-amber-500'
            }`}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            <span>{isListening ? 'Pausar' : 'Ouvir Microfone'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

