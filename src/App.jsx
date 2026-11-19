import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from './components/Header'
import { PresetBar } from './components/PresetBar'
import { SignalChain } from './components/SignalChain'
import { BlockCard } from './components/BlockCard'
import { TunerModal } from './components/TunerModal'
import { TapTempoModal } from './components/TapTempoModal'
import { ShortcutsModal } from './components/ShortcutsModal'
import { BackupModal } from './components/BackupModal'
import { CommunityModal } from './components/CommunityModal'
import { BLOCKS, DEFAULT_AMP_NAMES, DEFAULT_CAB_NAMES, PROTOCOL } from './protocol/constants'
import { transport } from './protocol/transport'
import {
  cmdRamDump,
  cmdPresetSync,
  cmdLoadPreset,
  cmdReadPreset,
  cmdReadAmpNames,
  cmdReadCabNames,
  cmdWriteToggle,
  cmdWriteModel,
  cmdWriteKnob,
  cmdWritePatchVolume,
  cmdWriteRouting,
  cmdWriteFlashPreset,
  serializePreset,
} from './protocol/frames'

const INITIAL_BLOCKS_STATE = {
  fx: { enabled: true, modelIndex: 0, knobs: [45, 0, 0, 0, 0, 0] },
  amp: { enabled: true, modelIndex: 2, knobs: [65, 70, 50, 55, 60, 0] },
  mod: { enabled: false, modelIndex: 0, knobs: [35, 50, 40, 0, 0, 0] },
  dly: { enabled: false, modelIndex: 0, knobs: [40, 30, 25, 0, 0, 0] },
  rev: { enabled: true, modelIndex: 1, knobs: [50, 30, 60, 40, 0, 0] },
  cab: { enabled: true, modelIndex: 0, knobs: [80, 20, 80, 0, 0, 0] },
}

export default function App() {
  const [connectionState, setConnectionState] = useState({
    state: 'disconnected',
    method: null,
    deviceName: '',
    message: '',
  })

  const [currentPresetId, setCurrentPresetId] = useState(0)
  const [masterVolume, setMasterVolume] = useState(85)
  const [routing, setRouting] = useState([0, 1, 5, 2, 3, 4])
  const [blocksState, setBlocksState] = useState(INITIAL_BLOCKS_STATE)
  const [originalPreset, setOriginalPreset] = useState(null)
  const [isCompareActive, setIsCompareActive] = useState(false)
  const [hasModifications, setHasModifications] = useState(false)

  const [ampNames, setAmpNames] = useState(DEFAULT_AMP_NAMES)
  const [cabNames, setCabNames] = useState(DEFAULT_CAB_NAMES)
  const [presetNames, setPresetNames] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('blackbox_preset_names') || '{}')
    } catch {
      return {}
    }
  })

  const [clipboardBlock, setClipboardBlock] = useState(null)
  const [bpm, setBpm] = useState(120)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Pronto • Desconectado')

  // Modals
  const [isTunerOpen, setIsTunerOpen] = useState(false)
  const [isTapTempoOpen, setIsTapTempoOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [isBackupOpen, setIsBackupOpen] = useState(false)
  const [isCommunityOpen, setIsCommunityOpen] = useState(false)

  const blockRefs = useRef({})
  const slotDumpResolvers = useRef({})

  const showStatus = (msg) => {
    setStatusMessage(msg)
  }

  // Handle transport status and incoming frames
  useEffect(() => {
    const unsubStatus = transport.onStatus((status) => {
      setConnectionState(status)
      if (status.state === 'connected') {
        showStatus(`Conectado ao ${status.deviceName} via ${status.method === 'ble' ? 'Bluetooth BLE' : 'USB SysEx'}`)
      } else if (status.state === 'disconnected') {
        showStatus('Desconectado')
      }
    })

    const unsubMsg = transport.onMessage(({ parsed }) => {
      if (!parsed) return

      if (parsed.type === 'PRESET_SYNC') {
        setCurrentPresetId(parsed.presetId)
      } else if (parsed.type === 'RAM_DUMP' && parsed.preset) {
        setMasterVolume(parsed.preset.masterVolume)
        setRouting(parsed.preset.routing)
        setBlocksState(parsed.preset.blocks)
        setOriginalPreset(JSON.parse(JSON.stringify(parsed.preset)))
        setIsCompareActive(false)
        setHasModifications(false)
        showStatus(`P${String(currentPresetId + 1).padStart(2, '0')} sincronizado com sucesso`)
      } else if (parsed.type === 'AMP_NAMES' && parsed.names) {
        setAmpNames(parsed.names)
        showStatus('Perfis NAM da pedaleira carregados!')
      } else if (parsed.type === 'CAB_NAMES' && parsed.names) {
        setCabNames(parsed.names)
        showStatus('IRs de gabinetes carregados!')
      } else if (parsed.type === 'PRESET_SLOT_DUMP') {
        const resolver = slotDumpResolvers.current[parsed.slot]
        if (resolver) {
          resolver(parsed.rawPreset)
          delete slotDumpResolvers.current[parsed.slot]
        }
      }
    })

    return () => {
      unsubStatus()
      unsubMsg()
    }
  }, [currentPresetId])

  // Initial queries on connect
  const syncPedalData = useCallback(async () => {
    try {
      await transport.sendRaw(cmdPresetSync())
      await transport.sendRaw(cmdRamDump())
      // Query Flash custom NAM and IR names
      setTimeout(async () => {
        try {
          await transport.sendRaw(cmdReadAmpNames())
          await transport.sendRaw(cmdReadCabNames())
        } catch (e) {
          console.warn('Leitura de nomes de AMP/CAB:', e)
        }
      }, 400)
    } catch (e) {
      console.error('Falha ao sincronizar inicial:', e)
    }
  }, [])

  // Connect BLE
  const handleConnectBLE = async () => {
    try {
      await transport.connectBLE()
      setTimeout(syncPedalData, 500)
    } catch (err) {
      alert('Falha ao conectar Bluetooth: ' + err.message)
    }
  }

  // Connect MIDI
  const handleConnectMIDI = async () => {
    try {
      await transport.connectMIDI()
      setTimeout(syncPedalData, 500)
    } catch (err) {
      alert('Falha ao conectar via USB MIDI: ' + err.message)
    }
  }

  const handleDisconnect = () => {
    transport.disconnect()
  }

  // Parameter updates
  const handleToggle = async (blockKey) => {
    const block = BLOCKS.find((b) => b.key === blockKey)
    if (!block) return

    const newEnabled = !blocksState[blockKey].enabled
    setBlocksState((prev) => ({
      ...prev,
      [blockKey]: { ...prev[blockKey], enabled: newEnabled },
    }))
    setHasModifications(true)

    if (transport.connected) {
      try {
        await transport.sendRaw(cmdWriteToggle(block.toggleAddr, newEnabled))
      } catch (err) {
        console.error('Erro ao enviar toggle:', err)
      }
    }
  }

  const handleModelChange = async (blockKey, modelIndex) => {
    const block = BLOCKS.find((b) => b.key === blockKey)
    if (!block) return

    setBlocksState((prev) => ({
      ...prev,
      [blockKey]: { ...prev[blockKey], modelIndex },
    }))
    setHasModifications(true)

    if (transport.connected) {
      try {
        await transport.sendRaw(cmdWriteModel(block.modelAddr, modelIndex))
      } catch (err) {
        console.error('Erro ao enviar modelo:', err)
      }
    }
  }

  const handleKnobChange = async (blockKey, slotIndex, value) => {
    const block = BLOCKS.find((b) => b.key === blockKey)
    if (!block) return

    setBlocksState((prev) => {
      const currentKnobs = [...prev[blockKey].knobs]
      currentKnobs[slotIndex] = value
      return {
        ...prev,
        [blockKey]: { ...prev[blockKey], knobs: currentKnobs },
      }
    })
    setHasModifications(true)

    if (transport.connected) {
      const knobAddr = block.knobBase + slotIndex * 2
      try {
        await transport.sendRaw(cmdWriteKnob(knobAddr, value))
      } catch (err) {
        console.error('Erro ao enviar knob:', err)
      }
    }
  }

  const handleMasterVolumeChange = async (val) => {
    setMasterVolume(val)
    if (transport.connected) {
      try {
        await transport.sendRaw(cmdWritePatchVolume(val))
      } catch (err) {
        console.error('Erro ao enviar Master Volume:', err)
      }
    }
  }

  const handleMoveBlock = async (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= routing.length) return
    const newRouting = [...routing]
    const [moved] = newRouting.splice(fromIndex, 1)
    newRouting.splice(toIndex, 0, moved)
    setRouting(newRouting)
    setHasModifications(true)

    if (transport.connected) {
      try {
        await transport.sendRaw(cmdWriteRouting(newRouting))
      } catch (err) {
        console.error('Erro ao enviar roteamento:', err)
      }
    }
  }

  // Preset Selection
  const handleSelectPreset = async (presetId) => {
    setCurrentPresetId(presetId)
    setIsCompareActive(false)
    if (transport.connected) {
      try {
        await transport.sendRaw(cmdLoadPreset(presetId))
        setTimeout(async () => {
          await transport.sendRaw(cmdRamDump())
        }, 150)
      } catch (err) {
        console.error('Erro ao carregar preset:', err)
      }
    }
  }

  const handleReloadFromPedal = async () => {
    if (!transport.connected) return
    try {
      await transport.sendRaw(cmdRamDump())
    } catch (err) {
      alert('Erro ao sincronizar: ' + err.message)
    }
  }

  const handleSaveToFlash = async () => {
    if (!transport.connected) {
      alert('Conecte o pedal antes de salvar na memória Flash!')
      return
    }

    setIsSaving(true)
    try {
      const serialized = serializePreset({
        masterVolume,
        routing,
        blocks: blocksState,
      })
      await transport.sendRaw(cmdWriteFlashPreset(currentPresetId, serialized))
      setOriginalPreset(JSON.parse(JSON.stringify({ masterVolume, routing, blocks: blocksState })))
      setHasModifications(false)
      showStatus(`Preset P${String(currentPresetId + 1).padStart(2, '0')} gravado na Flash com sucesso!`)
    } catch (err) {
      alert('Erro ao salvar no pedal: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // A/B Compare Toggle
  const handleToggleCompare = async () => {
    if (!originalPreset) return
    const nextCompare = !isCompareActive
    setIsCompareActive(nextCompare)

    const targetPreset = nextCompare
      ? originalPreset
      : { masterVolume, routing, blocks: blocksState }

    if (transport.connected) {
      try {
        const serialized = serializePreset(targetPreset)
        // Write entire live RAM preset
        for (let i = 0; i < BLOCKS.length; i++) {
          const b = BLOCKS[i]
          const blkState = targetPreset.blocks[b.key]
          await transport.sendRaw(cmdWriteToggle(b.toggleAddr, blkState.enabled))
          await transport.sendRaw(cmdWriteModel(b.modelAddr, blkState.modelIndex))
          for (let k = 0; k < 6; k++) {
            await transport.sendRaw(cmdWriteKnob(b.knobBase + k * 2, blkState.knobs[k] || 0))
          }
        }
        await transport.sendRaw(cmdWriteRouting(targetPreset.routing))
        await transport.sendRaw(cmdWritePatchVolume(targetPreset.masterVolume))
      } catch (err) {
        console.error('Erro no A/B Compare:', err)
      }
    }

    showStatus(nextCompare ? 'Comparando: [A] Som Original' : 'Comparando: [B] Som Editado')
  }

  // Block Copy / Paste
  const handleCopyBlock = (key, state) => {
    setClipboardBlock({ key, state: JSON.parse(JSON.stringify(state)) })
    showStatus(`Configurações de ${key.toUpperCase()} copiadas!`)
  }

  const handlePasteBlock = async (key) => {
    if (!clipboardBlock || !clipboardBlock.state) return
    const block = BLOCKS.find((b) => b.key === key)
    if (!block) return

    const incoming = clipboardBlock.state
    setBlocksState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        modelIndex: incoming.modelIndex,
        knobs: [...incoming.knobs],
      },
    }))
    setHasModifications(true)

    if (transport.connected) {
      try {
        await transport.sendRaw(cmdWriteModel(block.modelAddr, incoming.modelIndex))
        for (let k = 0; k < 6; k++) {
          await transport.sendRaw(cmdWriteKnob(block.knobBase + k * 2, incoming.knobs[k] || 0))
        }
      } catch (err) {
        console.error('Erro ao colar configurações:', err)
      }
    }
    showStatus(`Configurações coladas em ${key.toUpperCase()}!`)
  }

  // Rename preset and persist
  const handleRenamePreset = (slot, name) => {
    const updated = { ...presetNames, [slot]: name }
    setPresetNames(updated)
    try {
      localStorage.setItem('blackbox_preset_names', JSON.stringify(updated))
    } catch {}
  }

  // Single preset Export/Import
  const handleExportJson = () => {
    const data = {
      device: 'M-VAVE BlackBox',
      firmware: 'v23',
      name: presetNames[currentPresetId] || `Preset P${String(currentPresetId + 1).padStart(2, '0')}`,
      slot: currentPresetId,
      masterVolume,
      routing,
      blocks: blocksState,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BlackBox_P${String(currentPresetId + 1).padStart(2, '0')}.json`
    a.click()
    URL.revokeObjectURL(url)
    showStatus('Preset exportado com sucesso')
  }

  const handleImportJson = (json) => {
    if (typeof json.masterVolume === 'number') setMasterVolume(json.masterVolume)
    if (Array.isArray(json.routing) && json.routing.length === 6) setRouting(json.routing)
    if (json.blocks) setBlocksState(json.blocks)
    if (json.name) handleRenamePreset(currentPresetId, json.name)
    setHasModifications(true)
    showStatus('Preset importado! Clique em Salvar para gravar no pedal.')
  }

  // Full 80 Presets Backup & Restore
  const handleStartFullBackup = async (onProgress) => {
    const totalSlots = PROTOCOL.PRESET_COUNT
    const presetsDump = []

    for (let slot = 0; slot < totalSlots; slot++) {
      onProgress(slot + 1, totalSlots)
      const rawBytes = await new Promise((resolve) => {
        slotDumpResolvers.current[slot] = resolve
        transport.sendRaw(cmdReadPreset(slot)).catch(() => resolve(null))
        // Timeout safeguard
        setTimeout(() => {
          if (slotDumpResolvers.current[slot]) {
            slotDumpResolvers.current[slot](null)
            delete slotDumpResolvers.current[slot]
          }
        }, 1200)
      })

      presetsDump.push({
        slot,
        name: presetNames[slot] || `P${String(slot + 1).padStart(2, '0')}`,
        rawHex: rawBytes ? Array.from(rawBytes).map((b) => b.toString(16).padStart(2, '0')).join('') : null,
      })
    }

    const backupFile = {
      device: 'M-VAVE BlackBox',
      firmware: 'v23',
      date: new Date().toISOString(),
      presetNames,
      presets: presetsDump,
    }

    const blob = new Blob([JSON.stringify(backupFile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BlackBox_FullBackup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRestoreBackup = async (backupData, onProgress) => {
    const list = backupData.presets || backupData
    const total = list.length

    for (let i = 0; i < total; i++) {
      const item = list[i]
      onProgress(i + 1, total)
      if (item.rawHex && item.rawHex.length === PROTOCOL.PRESET_SIZE * 2) {
        const bytes = new Uint8Array(PROTOCOL.PRESET_SIZE)
        for (let b = 0; b < PROTOCOL.PRESET_SIZE; b++) {
          bytes[b] = parseInt(item.rawHex.substr(b * 2, 2), 16)
        }
        await transport.sendRaw(cmdWriteFlashPreset(item.slot ?? i, bytes))
        await new Promise((r) => setTimeout(r, 60))
      }
    }

    if (backupData.presetNames) {
      setPresetNames(backupData.presetNames)
      localStorage.setItem('blackbox_preset_names', JSON.stringify(backupData.presetNames))
    }

    await handleReloadFromPedal()
  }

  // Tap Tempo BPM Sync with Delay
  const handleBpmChange = (newBpm) => {
    setBpm(newBpm)
    // Map BPM (40..240) to Delay Time knob (0..100)
    const quarterMs = 60000 / newBpm
    const knobVal = Math.round(Math.min(100, Math.max(0, (quarterMs / 1000) * 100)))
    handleKnobChange('dly', 0, knobVal)
    showStatus(`Delay ajustado para ${newBpm} BPM (${quarterMs.toFixed(0)} ms)`)
  }

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is inside an input, textarea, or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.key >= '1' && e.key <= '6') {
        const blockOrder = ['fx', 'amp', 'mod', 'dly', 'rev', 'cab']
        const targetKey = blockOrder[Number(e.key) - 1]
        if (targetKey) {
          e.preventDefault()
          handleToggle(targetKey)
        }
      } else if (e.key === 'ArrowLeft' || e.key === '[') {
        e.preventDefault()
        if (currentPresetId > 0) handleSelectPreset(currentPresetId - 1)
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        e.preventDefault()
        if (currentPresetId < PROTOCOL.PRESET_COUNT - 1) handleSelectPreset(currentPresetId + 1)
      } else if (e.key === ' ') {
        e.preventDefault()
        // Mute / Restore Master Volume
        handleMasterVolumeChange(masterVolume === 0 ? 80 : 0)
        showStatus(masterVolume === 0 ? 'Master Volume restaurado' : 'Mute Master ativo')
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        handleSaveToFlash()
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        handleToggleCompare()
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        setIsTunerOpen((prev) => !prev)
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        setIsCommunityOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPresetId, masterVolume, blocksState, originalPreset, isCompareActive])

  const scrollToBlock = (key) => {
    const el = blockRefs.current[key]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#071819] text-[#eaf0ea] selection:bg-[#e3b862] selection:text-[#231a06]">
      {/* Top Rack Header */}
      <Header
        connectionState={connectionState}
        onConnectBLE={handleConnectBLE}
        onConnectMIDI={handleConnectMIDI}
        onDisconnect={handleDisconnect}
        masterVolume={masterVolume}
        onMasterVolumeChange={handleMasterVolumeChange}
        onOpenTuner={() => setIsTunerOpen(true)}
        onOpenTapTempo={() => setIsTapTempoOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenCommunity={() => setIsCommunityOpen(true)}
      />

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full p-2.5 sm:p-4 flex-1 flex flex-col gap-3">
        {/* Preset Management Strip */}
        <PresetBar
          currentPresetId={currentPresetId}
          onSelectPreset={handleSelectPreset}
          onSaveToFlash={handleSaveToFlash}
          onReload={handleReloadFromPedal}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onOpenBackupModal={() => setIsBackupOpen(true)}
          disabled={!transport.connected}
          isSaving={isSaving}
          isCompareActive={isCompareActive}
          onToggleCompare={handleToggleCompare}
          hasModifications={hasModifications}
          presetNames={presetNames}
          onRenamePreset={handleRenamePreset}
        />

        {/* Interactive Audio Signal Chain */}
        <SignalChain
          routing={routing}
          blocksState={blocksState}
          onBlockClick={scrollToBlock}
          onToggleBlock={handleToggle}
          onMoveBlock={handleMoveBlock}
          ampNames={ampNames}
          cabNames={cabNames}
        />

        {/* Effect Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 my-1">
          {routing.map((blockId, index) => {
            const block = BLOCKS.find((b) => b.id === blockId)
            if (!block) return null

            const blockShortcutMap = { fx: 1, amp: 2, mod: 3, dly: 4, rev: 5, cab: 6 }

            return (
              <div key={block.id} ref={(el) => (blockRefs.current[block.key] = el)}>
                <BlockCard
                  block={block}
                  state={blocksState[block.key]}
                  onToggle={() => handleToggle(block.key)}
                  onModelChange={(modelIdx) => handleModelChange(block.key, modelIdx)}
                  onKnobChange={(slotIdx, val) => handleKnobChange(block.key, slotIdx, val)}
                  onMoveLeft={() => handleMoveBlock(index, index - 1)}
                  onMoveRight={() => handleMoveBlock(index, index + 1)}
                  canMoveLeft={index > 0}
                  canMoveRight={index < routing.length - 1}
                  ampNames={ampNames}
                  cabNames={cabNames}
                  onCopyBlock={handleCopyBlock}
                  onPasteBlock={handlePasteBlock}
                  hasClipboard={Boolean(clipboardBlock)}
                  shortcutNumber={blockShortcutMap[block.key]}
                />
              </div>
            )
          })}
        </div>
      </main>

      {/* Bottom Status Strip */}
      <footer className="bg-[#050f10] px-4 py-2 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              connectionState.state === 'connected' ? 'bg-[#63e0f5]' : 'bg-[#3d5654]'
            }`}
          />
          <span className="font-semibold text-[#a9c0bc] uppercase tracking-wider text-[11px]">
            {statusMessage}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[#a9c0bc]">
          <span className="hidden sm:inline font-display text-base tracking-wider">
            BLACKBOX · FW V23
          </span>
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="font-semibold text-[11px] uppercase tracking-wider hover:text-[#e3b862] transition"
          >
            ATALHOS
          </button>
        </div>
      </footer>

      {/* Pro Audio Modals */}
      <TunerModal isOpen={isTunerOpen} onClose={() => setIsTunerOpen(false)} />
      <TapTempoModal
        isOpen={isTapTempoOpen}
        onClose={() => setIsTapTempoOpen(false)}
        currentBpm={bpm}
        onBpmChange={handleBpmChange}
      />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        isConnected={connectionState.state === 'connected'}
        onStartFullBackup={handleStartFullBackup}
        onRestoreBackup={handleRestoreBackup}
        presetNames={presetNames}
      />
      <CommunityModal
        isOpen={isCommunityOpen}
        onClose={() => setIsCommunityOpen(false)}
        ampNames={ampNames}
        cabNames={cabNames}
      />
    </div>
  )
}
