import React, { useState, useEffect, useRef } from 'react'
import {
  inspectCaptureFile,
  buildAmpRecord,
  exportNormalizedWav,
  sanitizeSlotName,
} from '../protocol/captures'

const COMMUNITY_MODELS = [
  {
    id: 'jcm800-kk',
    name: 'Marshall JCM800 2203',
    author: 'GuitarOrPoo',
    category: 'High Gain',
    type: 'Amp (DI)',
    tone3000Url: 'https://tone3000.com/search?q=JCM800',
  },
  {
    id: '5150-block',
    name: 'Peavey 5150 Block Letter',
    author: 'AmpsNThings',
    category: 'High Gain',
    type: 'Amp (DI)',
    tone3000Url: 'https://tone3000.com/search?q=5150',
  },
  {
    id: 'fender-twin-65',
    name: 'Fender 65 Twin Reverb',
    author: 'VintageAudioLab',
    category: 'Clean',
    type: 'Amp + Cab',
    tone3000Url: 'https://tone3000.com/search?q=Twin+Reverb',
  },
  {
    id: 'mesa-dual-recto',
    name: 'Mesa Boogie Dual Rectifier',
    author: 'HeavyTonez',
    category: 'High Gain',
    type: 'Amp (DI)',
    tone3000Url: 'https://tone3000.com/search?q=Dual+Rectifier',
  },
  {
    id: 'friedman-be100',
    name: 'Friedman BE-100 Deluxe',
    author: 'BrownSoundLab',
    category: 'Crunch',
    type: 'Amp + Cab',
    tone3000Url: 'https://tone3000.com/search?q=Friedman+BE100',
  },
  {
    id: 'dumble-ods',
    name: 'Dumble Overdrive Special',
    author: 'ToneChaser',
    category: 'Crunch',
    type: 'Amp (DI)',
    tone3000Url: 'https://tone3000.com/search?q=Dumble',
  },
  {
    id: 'matchless-dc30',
    name: 'Matchless DC-30',
    author: 'ChimeMaster',
    category: 'Clean',
    type: 'Amp + Cab',
    tone3000Url: 'https://tone3000.com/search?q=Matchless',
  },
  {
    id: 'soldano-slo100',
    name: 'Soldano SLO-100 Super Lead',
    author: 'SonicForge',
    category: 'High Gain',
    type: 'Amp (DI)',
    tone3000Url: 'https://tone3000.com/search?q=SLO100',
  },
  {
    id: 'ampeg-svt-cl',
    name: 'Ampeg SVT Classic (Bass)',
    author: 'LowEndKing',
    category: 'Bass',
    type: 'Amp + Cab',
    tone3000Url: 'https://tone3000.com/search?q=Ampeg+SVT',
  },
  {
    id: 'ir-mesa-v30',
    name: 'Mesa 4x12 OS Celestion V30',
    author: 'CabIRArchive',
    category: 'Cab IR',
    type: 'IR 44.1k',
    tone3000Url: 'https://tone3000.com/search?q=Mesa+V30+IR',
  },
  {
    id: 'ir-greenback-71',
    name: 'Marshall 1960A Greenback',
    author: 'VintageIRs',
    category: 'Cab IR',
    type: 'IR 44.1k',
    tone3000Url: 'https://tone3000.com/search?q=Greenback+IR',
  },
]

export function CommunityModal({
  isOpen,
  onClose,
  ampNames = [],
  cabNames = [],
  isConnected = false,
  initialTarget = null, // { tab?: 'import' | 'explore' | 'slots', kind?: 'amp' | 'cab', slot?: number }
  onStageCapture,
  onSaveCapture,
  onShowConfirm,
}) {
  const [activeTab, setActiveTab] = useState('import')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [selectedSlotType, setSelectedSlotType] = useState('amp')

  // Import state
  const fileInputRef = useRef(null)
  const [rawBuffer, setRawBuffer] = useState(null)
  const [parsedFile, setParsedFile] = useState(null)
  const [targetSlot, setTargetSlot] = useState(0)
  const [slotName, setSlotName] = useState('')
  const [irLevel, setIrLevel] = useState(50)
  const [ampMix, setAmpMix] = useState(100)
  const [ampLevel, setAmpLevel] = useState(100)
  const [ampGainMin, setAmpGainMin] = useState(30)
  const [ampGainMax, setAmpGainMax] = useState(60)
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferProgress, setTransferProgress] = useState({ curr: 0, total: 0, label: '' })
  const [transferFeedback, setTransferFeedback] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    if (initialTarget?.tab) setActiveTab(initialTarget.tab)
    if (initialTarget?.kind) setSelectedSlotType(initialTarget.kind)
    if (typeof initialTarget?.slot === 'number') setTargetSlot(initialTarget.slot)
    setTransferFeedback(null)
  }, [isOpen, initialTarget])

  if (!isOpen) return null

  const categories = ['Todos', 'High Gain', 'Crunch', 'Clean', 'Bass', 'Cab IR']

  const filteredModels = COMMUNITY_MODELS.filter((item) => {
    const matchesCategory =
      selectedCategory === 'Todos' || item.category === selectedCategory
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleFileLoad = async (file) => {
    if (!file) return
    setTransferFeedback(null)
    const buffer = await file.arrayBuffer()
    const info = inspectCaptureFile(file.name, buffer)
    setRawBuffer(buffer)
    setParsedFile(info)
    setSlotName(info.suggestedName || sanitizeSlotName(file.name))

    if (info.kind === 'amp') {
      setAmpMix(info.mix ?? 100)
      setAmpLevel(info.level ?? 100)
      setAmpGainMin(info.gainMin ?? 30)
      setAmpGainMax(info.gainMax ?? 60)
    } else if (info.kind === 'cab') {
      setIrLevel(50)
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFileLoad(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileLoad(file)
  }

  const handleDownloadConverted = () => {
    if (!rawBuffer || !parsedFile || !parsedFile.ok) return
    try {
      let bytes
      let downloadName
      const cleanName = sanitizeSlotName(slotName)

      if (parsedFile.kind === 'cab') {
        bytes = exportNormalizedWav(rawBuffer)
        downloadName = `${cleanName}_44k_24b.wav`
      } else if (parsedFile.kind === 'amp') {
        const built = buildAmpRecord(rawBuffer, cleanName, {
          mix: ampMix,
          level: ampLevel,
          gainMin: ampGainMin,
          gainMax: ampGainMax,
        })
        bytes = built.downloadBytes
        downloadName = `${cleanName}.${built.format === 'AM4' ? 'am4Data' : 'am2Data'}`
      } else {
        return
      }

      const blob = new Blob([bytes], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = downloadName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setTransferFeedback({ type: 'error', text: err.message })
    }
  }

  const handleStage = async () => {
    if (!isConnected || !rawBuffer || !parsedFile?.ok || !onStageCapture) return
    setIsTransferring(true)
    setTransferFeedback(null)
    setTransferProgress({ curr: 0, total: 1, label: 'ENVIANDO PARA RAM...' })

    try {
      await onStageCapture({
        kind: parsedFile.kind,
        buffer: rawBuffer,
        slotName: sanitizeSlotName(slotName),
        level: irLevel,
        mix: ampMix,
        ampLevel,
        gainMin: ampGainMin,
        gainMax: ampGainMax,
        onProgress: (curr, total) => {
          setTransferProgress({ curr, total, label: `ENVIANDO CHUNK ${curr}/${total}...` })
        },
      })
      setTransferFeedback({
        type: 'ok',
        text: 'Carregado na RAM temporária! Toque para testar o som antes de gravar no slot.',
      })
    } catch (err) {
      setTransferFeedback({ type: 'error', text: err.message })
    } finally {
      setIsTransferring(false)
    }
  }

  const handleSaveSlot = async () => {
    if (!isConnected || !rawBuffer || !parsedFile?.ok || !onSaveCapture) return
    const slotNumStr = String(targetSlot + 1).padStart(2, '0')
    const confirmed = onShowConfirm
      ? await onShowConfirm({
          title: 'GRAVAR CAPTURA NA FLASH',
          message: `Sobrescrever permanentemente o slot ${parsedFile.kind.toUpperCase()} #${slotNumStr} com "${sanitizeSlotName(slotName)}"?`,
          confirmLabel: 'GRAVAR NO SLOT',
          variant: 'warning',
        })
      : false
    if (!confirmed) {
      return
    }

    setIsTransferring(true)
    setTransferFeedback(null)
    setTransferProgress({ curr: 0, total: 1, label: 'GRAVANDO NA FLASH...' })

    try {
      await onSaveCapture({
        kind: parsedFile.kind,
        slotIndex0: targetSlot,
        buffer: rawBuffer,
        slotName: sanitizeSlotName(slotName),
        level: irLevel,
        mix: ampMix,
        ampLevel,
        gainMin: ampGainMin,
        gainMax: ampGainMax,
        onProgress: (curr, total) => {
          setTransferProgress({ curr, total, label: `GRAVANDO BLOCO ${curr}/${total}...` })
        },
      })
      setTransferFeedback({
        type: 'ok',
        text: `Salvo com sucesso no slot ${parsedFile.kind.toUpperCase()} #${slotNumStr}!`,
      })
    } catch (err) {
      setTransferFeedback({ type: 'error', text: err.message })
    } finally {
      setIsTransferring(false)
    }
  }

  const activeSlotsList =
    parsedFile?.kind === 'cab' ? cabNames : ampNames

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="bg-[#141416] border-t-4 border-[#d9822b] w-full max-w-4xl max-h-[90vh] p-5 relative flex flex-col overflow-hidden">
        <button
          onClick={onClose}
          disabled={isTransferring}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-display text-lg transition disabled:opacity-30"
        >
          ✕
        </button>

        {/* Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mr-10">
          <h2 className="font-display text-3xl text-[#f2efe9]">
            IMPORTAR <span className="text-[#e5a93c]">AMP / IR</span> & TONE3000
          </h2>

          <div className="flex items-center gap-1 bg-[#060607] p-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition ${
                activeTab === 'import'
                  ? 'bg-[#d9822b] text-[#120902]'
                  : 'text-[#9a968e] hover:text-[#f2efe9]'
              }`}
            >
              IMPORTAR ARQUIVO
            </button>
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition ${
                activeTab === 'explore'
                  ? 'bg-[#d9822b] text-[#120902]'
                  : 'text-[#9a968e] hover:text-[#f2efe9]'
              }`}
            >
              TONE3000
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition ${
                activeTab === 'slots'
                  ? 'bg-[#d9822b] text-[#120902]'
                  : 'text-[#9a968e] hover:text-[#f2efe9]'
              }`}
            >
              SLOTS FLASH (20)
            </button>
          </div>
        </div>

        {/* Tab 1: Importer (.wav / .am2 / .am2Data / .am3Data / .am4 / .nam) */}
        {activeTab === 'import' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 pr-1">
            {/* File Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !isTransferring && fileInputRef.current?.click()}
              className="bg-[#060607] hover:bg-[#0f0f12] border border-dashed border-[#38383e] hover:border-[#d9822b] p-5 text-center cursor-pointer transition"
            >
              <div className="font-display text-2xl text-[#e5a93c]">
                {parsedFile ? parsedFile.fileName : 'SELECIONAR OU ARRASTAR ARQUIVO'}
              </div>
              <div className="text-xs text-[#9a968e] mt-1">
                Suporta CAB IR (<code className="text-[#f2efe9]">.wav</code>) · Capturas BlackBox (<code className="text-[#f2efe9]">.am2</code>, <code className="text-[#f2efe9]">.am2Data</code>, <code className="text-[#f2efe9]">.am3Data</code>, <code className="text-[#f2efe9]">.am4</code>) · Diagnóstico <code className="text-[#f2efe9]">.nam</code>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.am2,.am2data,.am3data,.am4,.am4data,.nam"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {/* File Diagnostic & Controls */}
            {parsedFile && (
              <div className="bg-[#1e1e22] p-4 flex flex-col gap-4">
                {/* Status Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2a2a30]">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#d9822b] text-[#120902] font-bold text-xs px-2.5 py-1 uppercase">
                      {parsedFile.kind === 'cab'
                        ? 'CAB / IR (.WAV)'
                        : parsedFile.kind === 'amp'
                        ? `AMP CAPTURE (${parsedFile.format})`
                        : parsedFile.kind === 'nam_raw'
                        ? 'NAM BRUTO (JSON)'
                        : 'ARQUIVO DESCONHECIDO'}
                    </span>
                    <span className="text-xs font-mono text-[#9a968e]">
                      {parsedFile.size} bytes
                    </span>
                  </div>

                  {parsedFile.kind === 'cab' && parsedFile.ok && (
                    <div className="text-xs font-mono text-[#e5a93c]">
                      {parsedFile.sampleRate} Hz → 44100 Hz · {parsedFile.channels} ch → Mono · 2048 pts
                    </div>
                  )}

                  {parsedFile.kind === 'amp' && parsedFile.ok && (
                    <div className="text-xs font-mono text-[#e5a93c]">
                      {parsedFile.weightCount} pesos float32 · range [{parsedFile.weightMin}, {parsedFile.weightMax}]
                    </div>
                  )}
                </div>

                {/* Errors */}
                {parsedFile.errors?.length > 0 && (
                  <div className="bg-[#060607] border-l-4 border-[#e5484d] p-3 text-xs text-[#e5484d] font-semibold space-y-1">
                    {parsedFile.errors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                )}

                {/* Warnings / Raw NAM explanation */}
                {parsedFile.warnings?.length > 0 && (
                  <div className="bg-[#060607] border-l-4 border-[#e5a93c] p-3 text-xs text-[#f2efe9] space-y-1">
                    {parsedFile.warnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                    {parsedFile.kind === 'nam_raw' && parsedFile.info && (
                      <div className="text-[#9a968e] pt-1 font-mono">
                        Modelo: {parsedFile.info.modelName} · Arquitetura: {parsedFile.info.architecture} · {parsedFile.info.sampleRate} Hz
                      </div>
                    )}
                  </div>
                )}

                {/* Editable Target Slot & Parameters for valid AMP / CAB */}
                {(parsedFile.kind === 'cab' || parsedFile.kind === 'amp') && parsedFile.ok && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#9a968e] mb-1">
                          Slot de Destino ({parsedFile.kind.toUpperCase()})
                        </label>
                        <select
                          value={targetSlot}
                          onChange={(e) => setTargetSlot(Number(e.target.value))}
                          className="w-full bg-[#060607] text-[#f2efe9] text-sm font-semibold px-3 h-10 border-0 focus:outline focus:outline-2 focus:outline-[#d9822b]"
                        >
                          {Array.from({ length: 20 }).map((_, idx) => (
                            <option key={idx} value={idx}>
                              #{String(idx + 1).padStart(2, '0')} · {activeSlotsList[idx] || `Slot ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#9a968e] mb-1">
                          Nome no Visor (Máx. 13 ASCII)
                        </label>
                        <input
                          type="text"
                          maxLength={13}
                          value={slotName}
                          onChange={(e) => setSlotName(e.target.value)}
                          className="w-full bg-[#060607] text-[#f2efe9] font-mono text-sm font-bold px-3 h-10 border-0 focus:outline focus:outline-2 focus:outline-[#d9822b]"
                        />
                      </div>

                      {parsedFile.kind === 'cab' ? (
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-[#9a968e] mb-1">
                            Nível do IR ({irLevel})
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={irLevel}
                            onChange={(e) => setIrLevel(Number(e.target.value))}
                            className="w-full accent-[#d9822b] mt-2 cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-[#9a968e] mb-1">
                              Mix ({ampMix})
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={ampMix}
                              onChange={(e) => setAmpMix(Number(e.target.value))}
                              className="w-full bg-[#060607] text-[#f2efe9] font-mono text-sm px-2.5 h-10"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-[#9a968e] mb-1">
                              Level ({ampLevel})
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="200"
                              value={ampLevel}
                              onChange={(e) => setAmpLevel(Number(e.target.value))}
                              className="w-full bg-[#060607] text-[#f2efe9] font-mono text-sm px-2.5 h-10"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transfer Progress */}
                    {isTransferring && (
                      <div className="bg-[#060607] p-3">
                        <div className="flex justify-between text-xs font-mono text-[#e5a93c] mb-1.5">
                          <span>{transferProgress.label}</span>
                          <span>
                            {transferProgress.total > 0
                              ? Math.round((transferProgress.curr / transferProgress.total) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#1e1e22]">
                          <div
                            className="h-full bg-[#d9822b] transition-all duration-150"
                            style={{
                              width: `${
                                transferProgress.total > 0
                                  ? Math.round((transferProgress.curr / transferProgress.total) * 100)
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Feedback Banner */}
                    {transferFeedback && (
                      <div
                        className={`p-3 text-xs font-semibold bg-[#060607] border-l-4 ${
                          transferFeedback.type === 'error'
                            ? 'border-[#e5484d] text-[#e5484d]'
                            : 'border-[#e5a93c] text-[#e5a93c]'
                        }`}
                      >
                        {transferFeedback.text}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadConverted}
                        disabled={isTransferring}
                        className="h-11 px-4 bg-[#141416] hover:bg-[#060607] text-[#9a968e] hover:text-[#f2efe9] font-bold text-xs uppercase tracking-wider transition disabled:opacity-40"
                      >
                        BAIXAR CONVERTIDO
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleStage}
                          disabled={!isConnected || isTransferring}
                          className="h-11 px-4 bg-[#141416] hover:bg-[#2a2a30] text-[#e5a93c] font-bold text-xs uppercase tracking-wider transition disabled:opacity-35"
                          title="Enviar temporariamente para ouvir sem gravar na Flash"
                        >
                          TESTAR NA RAM (AUDITION)
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveSlot}
                          disabled={!isConnected || isTransferring}
                          className="h-11 px-5 bg-[#d9822b] hover:bg-[#e8953f] text-[#120902] font-bold text-xs uppercase tracking-wider transition disabled:opacity-35"
                        >
                          GRAVAR NO SLOT #{String(targetSlot + 1).padStart(2, '0')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Tone3000 Directory */}
        {activeTab === 'explore' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="Filtrar (JCM800, 5150, Fender, V30...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-[#060607] text-[#f2efe9] placeholder-[#9a968e]/60 text-sm font-semibold px-3 h-10 border-0 focus:outline focus:outline-2 focus:outline-[#d9822b]"
              />

              <div className="flex items-center gap-1 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 h-10 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-[#e5a93c] text-[#120902]'
                        : 'bg-[#1e1e22] text-[#9a968e] hover:text-[#f2efe9]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 min-h-0">
              {filteredModels.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1e1e22] p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-display text-xl text-[#f2efe9] truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#9a968e] mt-0.5 flex items-center gap-2">
                      <span>{item.author}</span>
                      <span>·</span>
                      <span className="text-[#e5a93c] font-semibold">{item.type}</span>
                    </div>
                  </div>

                  <a
                    href={item.tone3000Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#d9822b] hover:bg-[#e8953f] text-[#120902] font-bold text-xs uppercase px-3 py-2 shrink-0 transition"
                  >
                    TONE3000 ↗
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 bg-[#060607] px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-[#9a968e]">CATÁLOGO COMPLETO</span>
              <a
                href="https://tone3000.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#e5a93c] hover:underline font-bold uppercase"
              >
                TONE3000.COM ↗
              </a>
            </div>
          </div>
        )}

        {/* Tab 3: Flash Slots Grid */}
        {activeTab === 'slots' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setSelectedSlotType('amp')}
                className={`px-4 h-10 text-xs font-bold uppercase tracking-wider transition ${
                  selectedSlotType === 'amp'
                    ? 'bg-[#d96b27] text-[#120902]'
                    : 'bg-[#1e1e22] text-[#9a968e]'
                }`}
              >
                AMP · NAM (1–20)
              </button>
              <button
                onClick={() => setSelectedSlotType('cab')}
                className={`px-4 h-10 text-xs font-bold uppercase tracking-wider transition ${
                  selectedSlotType === 'cab'
                    ? 'bg-[#b85d35] text-[#120902]'
                    : 'bg-[#1e1e22] text-[#9a968e]'
                }`}
              >
                CAB · IR (1–20)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5 min-h-0">
              {(selectedSlotType === 'amp' ? ampNames : cabNames).map((name, idx) => (
                <div
                  key={idx}
                  className="bg-[#060607] px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-display text-lg text-[#d9822b] tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-semibold text-[#f2efe9] truncate">
                      {name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetSlot(idx)
                      setActiveTab('import')
                    }}
                    className="bg-[#1e1e22] hover:bg-[#d9822b] hover:text-[#120902] text-[#9a968e] text-[10px] font-bold uppercase px-2 py-1 shrink-0 transition"
                  >
                    IMPORTAR
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
