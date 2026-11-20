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
import { SupportModal } from './components/SupportModal'
import { DialogModal } from './components/DialogModal'
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
  cmdStageCabFrames,
  cmdSaveCabHeaderFrames,
  cmdStageAmpFrames,
  cmdSaveAmpFrames,
  serializePreset,
} from './protocol/frames'
import { buildCabRecord, buildAmpRecord } from './protocol/captures'

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
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const [importerTarget, setImporterTarget] = useState(null)
  const [dialogState, setDialogState] = useState(null)

  const blockRefs = useRef({})
  const slotDumpResolvers = useRef({})
  const dialogResolverRef = useRef(null)
  const currentPresetIdRef = useRef(0)
  const rawPresetRef = useRef(null)
  const lastUiEditTimeRef = useRef(0)
  const isSavingRef = useRef(false)
  const forceRamSyncRef = useRef(false)
  const modelSyncOnlyRef = useRef(false)
  const knobThrottleRef = useRef({})

  const openDialog = useCallback((config) => {
    return new Promise((resolve) => {
      if (dialogResolverRef.current) {
        dialogResolverRef.current(false)
      }
      dialogResolverRef.current = resolve
      setDialogState(config)
    })
  }, [])

  const showAlert = useCallback(
    ({ title = 'AVISO', message = '', variant = 'warning', confirmLabel = 'ENTENDI' }) =>
      openDialog({ mode: 'alert', title, message, variant, confirmLabel }),
    [openDialog]
  )

  const showConfirm = useCallback(
    ({
      title = 'CONFIRMAR AÇÃO',
      message = '',
      variant = 'warning',
      confirmLabel = 'CONFIRMAR',
      cancelLabel = 'CANCELAR',
    }) => openDialog({ mode: 'confirm', title, message, variant, confirmLabel, cancelLabel }),
    [openDialog]
  )

  const handleDialogConfirm = useCallback(() => {
    const resolve = dialogResolverRef.current
    dialogResolverRef.current = null
    setDialogState(null)
    if (resolve) resolve(true)
  }, [])

  const handleDialogCancel = useCallback(() => {
    const resolve = dialogResolverRef.current
    dialogResolverRef.current = null
    setDialogState(null)
    if (resolve) resolve(false)
  }, [])

  useEffect(() => {
    currentPresetIdRef.current = currentPresetId
  }, [currentPresetId])

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
        rawPresetRef.current = null
        showStatus('Desconectado')
      }
    })

    const unsubMsg = transport.onMessage(({ parsed }) => {
      if (!parsed) return

      if (parsed.type === 'PRESET_SYNC') {
        if (parsed.presetId !== currentPresetIdRef.current) {
          currentPresetIdRef.current = parsed.presetId
          setCurrentPresetId(parsed.presetId)
          setIsCompareActive(false)
          setTimeout(() => {
            if (transport.connected && !isSavingRef.current) {
              forceRamSyncRef.current = true
              modelSyncOnlyRef.current = false
              transport.sendRaw(cmdRamDump()).catch(() => {})
            }
          }, 200)
        }
      } else if (parsed.type === 'RAM_DUMP' && parsed.preset) {
        const isForced = forceRamSyncRef.current
        if (!isForced && Date.now() - lastUiEditTimeRef.current < 1000) {
          return
        }
        forceRamSyncRef.current = false
        if (parsed.rawPreset) {
          rawPresetRef.current = new Uint8Array(parsed.rawPreset)
        }
        setMasterVolume(parsed.preset.masterVolume)
        setRouting(parsed.preset.routing)
        setBlocksState(parsed.preset.blocks)
        if (modelSyncOnlyRef.current) {
          modelSyncOnlyRef.current = false
        } else {
          setOriginalPreset(JSON.parse(JSON.stringify(parsed.preset)))
          setIsCompareActive(false)
          setHasModifications(false)
          showStatus(`P${String(currentPresetIdRef.current + 1).padStart(2, '0')} sincronizado com sucesso`)
        }
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
  }, [])

  // Background poll for physical footswitch preset changes on pedal
  useEffect(() => {
    if (connectionState.state !== 'connected') return
    const intervalId = setInterval(() => {
      if (
        transport.connected &&
        !isSavingRef.current &&
        Date.now() - lastUiEditTimeRef.current > 1500
      ) {
        transport.sendRaw(cmdPresetSync()).catch(() => {})
      }
    }, 3000)

    return () => clearInterval(intervalId)
  }, [connectionState.state])

  // Initial queries on connect
  const syncPedalData = useCallback(async () => {
    try {
      await transport.sendRaw(cmdPresetSync())
      await new Promise((r) => setTimeout(r, 220))
      forceRamSyncRef.current = true
      modelSyncOnlyRef.current = false
      await transport.sendRaw(cmdRamDump())
      await new Promise((r) => setTimeout(r, 350))
      await transport.sendRaw(cmdReadAmpNames())
      await new Promise((r) => setTimeout(r, 350))
      await transport.sendRaw(cmdReadCabNames())
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
      await showAlert({
        title: 'FALHA NA CONEXÃO BLUETOOTH',
        message: err.message,
        variant: 'error',
      })
    }
  }

  // Connect MIDI
  const handleConnectMIDI = async () => {
    try {
      await transport.connectMIDI()
      setTimeout(syncPedalData, 500)
    } catch (err) {
      await showAlert({
        title: 'FALHA NA CONEXÃO USB MIDI',
        message: err.message,
        variant: 'error',
      })
    }
  }

  const handleDisconnect = () => {
    transport.disconnect()
  }

  const flushPendingKnobWrites = async () => {
    const entries = Object.entries(knobThrottleRef.current)
    const pendingSends = []
    for (const [addrStr, entry] of entries) {
      if (entry && entry.timer) {
        clearTimeout(entry.timer)
        const val = entry.pendingVal
        knobThrottleRef.current[addrStr] = { lastSent: Date.now(), pendingVal: null, timer: null }
        if (transport.connected && val !== null && val !== undefined) {
          pendingSends.push(
            transport.sendRaw(cmdWriteKnob(Number(addrStr), val)).catch(() => {})
          )
        }
      }
    }
    if (pendingSends.length > 0) {
      await Promise.all(pendingSends)
    }
    await transport.writeQueue
    await new Promise((r) => setTimeout(r, 50))
  }

  // Parameter updates
  const handleToggle = async (blockKey) => {
    const block = BLOCKS.find((b) => b.key === blockKey)
    if (!block) return

    lastUiEditTimeRef.current = Date.now()
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

    lastUiEditTimeRef.current = Date.now()
    setBlocksState((prev) => ({
      ...prev,
      [blockKey]: { ...prev[blockKey], modelIndex },
    }))
    setHasModifications(true)

    if (transport.connected) {
      try {
        await transport.sendRaw(cmdWriteModel(block.modelAddr, modelIndex))
        setTimeout(() => {
          if (transport.connected && !isSavingRef.current) {
            forceRamSyncRef.current = true
            modelSyncOnlyRef.current = true
            transport.sendRaw(cmdRamDump()).catch(() => {})
          }
        }, 180)
      } catch (err) {
        console.error('Erro ao enviar modelo:', err)
      }
    }
  }

  const handleKnobChange = async (blockKey, slotIndex, value) => {
    const block = BLOCKS.find((b) => b.key === blockKey)
    if (!block) return

    lastUiEditTimeRef.current = Date.now()
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
      const entry = knobThrottleRef.current[knobAddr]
      const now = Date.now()
      if (entry && entry.timer) {
        clearTimeout(entry.timer)
        entry.timer = null
      }
      const lastSent = entry?.lastSent ?? 0
      const sendNow = () => {
        knobThrottleRef.current[knobAddr] = { lastSent: Date.now(), pendingVal: null, timer: null }
        if (transport.connected) {
          transport.sendRaw(cmdWriteKnob(knobAddr, value)).catch((err) => {
            console.error('Erro ao enviar knob:', err)
          })
        }
      }

      if (now - lastSent >= 35) {
        sendNow()
      } else {
        const delay = Math.max(5, 35 - (now - lastSent))
        const timer = setTimeout(sendNow, delay)
        knobThrottleRef.current[knobAddr] = { lastSent, pendingVal: value, timer }
      }
    }
  }

  const handleMasterVolumeChange = async (val) => {
    lastUiEditTimeRef.current = Date.now()
    setMasterVolume(val)
    setHasModifications(true)
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
    lastUiEditTimeRef.current = Date.now()
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
    currentPresetIdRef.current = presetId
    setCurrentPresetId(presetId)
    setIsCompareActive(false)
    if (transport.connected) {
      try {
        await transport.sendRaw(cmdLoadPreset(presetId))
        setTimeout(() => {
          if (transport.connected && !isSavingRef.current) {
            forceRamSyncRef.current = true
            modelSyncOnlyRef.current = false
            transport.sendRaw(cmdRamDump()).catch(() => {})
          }
        }, 450)
      } catch (err) {
        console.error('Erro ao carregar preset:', err)
      }
    }
  }

  const handleReloadFromPedal = async () => {
    if (!transport.connected) return
    try {
      forceRamSyncRef.current = true
      modelSyncOnlyRef.current = false
      await transport.sendRaw(cmdRamDump())
    } catch (err) {
      await showAlert({
        title: 'ERRO AO SINCRONIZAR',
        message: err.message,
        variant: 'error',
      })
    }
  }

  const handleSaveToFlash = async () => {
    if (!transport.connected) {
      await showAlert({
        title: 'PEDAL DESCONECTADO',
        message: 'Conecte o pedal via Bluetooth ou Cabo USB antes de salvar na memória Flash.',
        variant: 'warning',
      })
      return
    }

    const targetPresetId = currentPresetIdRef.current
    setIsSaving(true)
    isSavingRef.current = true
    lastUiEditTimeRef.current = Date.now()

    try {
      await flushPendingKnobWrites()
      const snapshot = {
        masterVolume,
        routing,
        blocks: blocksState,
      }
      const serialized = serializePreset(snapshot, rawPresetRef.current)
      rawPresetRef.current = new Uint8Array(serialized)

      const frame = cmdWriteFlashPreset(targetPresetId, serialized)
      try {
        await transport.sendAndWaitAck(frame, 3500)
      } catch {
        // Retry once if the first ACK timed out on BLE/USB
        await transport.sendAndWaitAck(frame, 3500)
      }

      setOriginalPreset(JSON.parse(JSON.stringify(snapshot)))
      setIsCompareActive(false)
      setHasModifications(false)
      showStatus(`Preset P${String(targetPresetId + 1).padStart(2, '0')} gravado na Flash com sucesso!`)
    } catch (err) {
      await showAlert({
        title: 'ERRO AO SALVAR NO PEDAL',
        message: err.message,
        variant: 'error',
      })
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }

  const writeLivePreset = async (targetPreset) => {
    if (!transport.connected || !targetPreset?.blocks) return
    lastUiEditTimeRef.current = Date.now()
    for (let i = 0; i < BLOCKS.length; i++) {
      const b = BLOCKS[i]
      const blkState = targetPreset.blocks[b.key]
      if (!blkState) continue
      await transport.sendRaw(cmdWriteToggle(b.toggleAddr, blkState.enabled))
      await transport.sendRaw(cmdWriteModel(b.modelAddr, blkState.modelIndex))
      for (let k = 0; k < 6; k++) {
        await transport.sendRaw(cmdWriteKnob(b.knobBase + k * 2, blkState.knobs?.[k] || 0))
      }
    }
    if (Array.isArray(targetPreset.routing) && targetPreset.routing.length === 6) {
      await transport.sendRaw(cmdWriteRouting(targetPreset.routing))
    }
    if (typeof targetPreset.masterVolume === 'number') {
      await transport.sendRaw(cmdWritePatchVolume(targetPreset.masterVolume))
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
        await writeLivePreset(targetPreset)
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

    lastUiEditTimeRef.current = Date.now()
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

  const handleImportJson = async (json) => {
    lastUiEditTimeRef.current = Date.now()
    const nextVolume = typeof json.masterVolume === 'number' ? json.masterVolume : masterVolume
    const nextRouting = Array.isArray(json.routing) && json.routing.length === 6 ? json.routing : routing
    const nextBlocks = json.blocks || blocksState

    if (typeof json.masterVolume === 'number') setMasterVolume(json.masterVolume)
    if (Array.isArray(json.routing) && json.routing.length === 6) setRouting(json.routing)
    if (json.blocks) setBlocksState(json.blocks)
    if (json.name) handleRenamePreset(currentPresetId, json.name)
    setHasModifications(true)

    if (transport.connected) {
      try {
        await writeLivePreset({
          masterVolume: nextVolume,
          routing: nextRouting,
          blocks: nextBlocks,
        })
      } catch (err) {
        console.error('Erro ao aplicar JSON importado na RAM:', err)
      }
    }
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

  // Open AMP / CAB file importer modal
  const handleOpenImporter = (kind, slotIndex = 0) => {
    setImporterTarget({ tab: 'import', kind, slot: slotIndex })
    setIsCommunityOpen(true)
  }

  // Stage AMP or CAB capture into live RAM for auditioning
  const handleStageCapture = async ({
    kind,
    buffer,
    slotName,
    level,
    mix,
    ampLevel,
    gainMax,
    gainMin,
    onProgress,
  }) => {
    if (!transport.connected) {
      throw new Error('Conecte a BlackBox antes de enviar arquivos.')
    }

    let frames
    if (kind === 'cab') {
      const record = buildCabRecord(buffer, slotName, level)
      frames = cmdStageCabFrames(record)
    } else if (kind === 'amp') {
      const { deviceBytes } = buildAmpRecord(buffer, slotName, {
        mix,
        level: ampLevel,
        gainMax,
        gainMin,
      })
      frames = cmdStageAmpFrames(deviceBytes)
    } else {
      throw new Error('Tipo de arquivo não suportado para envio ao pedal.')
    }

    for (let i = 0; i < frames.length; i++) {
      if (onProgress) onProgress(i + 1, frames.length)
      await transport.sendAndWaitAck(frames[i], 3500)
    }
    showStatus(`${kind.toUpperCase()} "${slotName}" carregado na RAM temporária`)
  }

  // Save AMP or CAB capture permanently into Flash slot (0..19)
  const handleSaveCapture = async ({
    kind,
    slotIndex0,
    buffer,
    slotName,
    level,
    mix,
    ampLevel,
    gainMax,
    gainMin,
    onProgress,
  }) => {
    if (!transport.connected) {
      throw new Error('Conecte a BlackBox antes de gravar no slot.')
    }

    if (kind === 'cab') {
      const record = buildCabRecord(buffer, slotName, level)
      const stageFrames = cmdStageCabFrames(record)
      const saveFrames = cmdSaveCabHeaderFrames(slotIndex0, record.subarray(0, 20))
      const total = stageFrames.length + saveFrames.length

      for (let i = 0; i < stageFrames.length; i++) {
        if (onProgress) onProgress(i + 1, total)
        await transport.sendAndWaitAck(stageFrames[i], 3500)
      }
      await new Promise((r) => setTimeout(r, 400))
      for (let i = 0; i < saveFrames.length; i++) {
        if (onProgress) onProgress(stageFrames.length + i + 1, total)
        await transport.sendAndWaitAck(saveFrames[i], 4000)
      }
      await new Promise((r) => setTimeout(r, 300))
      await transport.sendRaw(cmdReadCabNames())
    } else if (kind === 'amp') {
      const { deviceBytes } = buildAmpRecord(buffer, slotName, {
        mix,
        level: ampLevel,
        gainMax,
        gainMin,
      })
      const frames = cmdSaveAmpFrames(slotIndex0, deviceBytes)
      for (let i = 0; i < frames.length; i++) {
        if (onProgress) onProgress(i + 1, frames.length)
        const isCommitFrame = i === frames.length - 1
        try {
          await transport.sendAndWaitAck(frames[i], isCommitFrame ? 5000 : 3500)
        } catch (err) {
          if (!isCommitFrame) throw err
        }
      }
      await new Promise((r) => setTimeout(r, 400))
      await transport.sendRaw(cmdReadAmpNames())
    } else {
      throw new Error('Tipo de arquivo não suportado para gravação em slot.')
    }

    showStatus(
      `${kind.toUpperCase()} "${slotName}" gravado no slot #${String(slotIndex0 + 1).padStart(2, '0')}`
    )
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
  }, [currentPresetId, masterVolume, routing, blocksState, originalPreset, isCompareActive])

  const scrollToBlock = (key) => {
    const el = blockRefs.current[key]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0c] text-[#f2efe9] selection:bg-[#d9822b] selection:text-[#120902]">
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
        onOpenCommunity={() => {
          setImporterTarget({ tab: 'explore' })
          setIsCommunityOpen(true)
        }}
        onOpenSupport={() => setIsSupportOpen(true)}
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
          disabled={connectionState.state !== 'connected'}
          isSaving={isSaving}
          isCompareActive={isCompareActive}
          onToggleCompare={handleToggleCompare}
          hasModifications={hasModifications}
          presetNames={presetNames}
          onRenamePreset={handleRenamePreset}
          onShowAlert={showAlert}
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
                  onOpenImporter={
                    block.key === 'amp' || block.key === 'cab'
                      ? handleOpenImporter
                      : null
                  }
                />
              </div>
            )
          })}
        </div>
      </main>

      {/* Bottom Status Strip */}
      <footer className="bg-[#060607] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              connectionState.state === 'connected' ? 'bg-[#e5a93c]' : 'bg-[#38383e]'
            }`}
          />
          <span className="font-semibold text-[#9a968e] uppercase tracking-wider text-[11px]">
            {statusMessage}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[#9a968e] text-[11px] font-semibold uppercase tracking-wider">
          <a
            href="https://github.com/gabrielyandev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f2efe9] transition"
          >
            POR GABRIEL YAN (@GABRIELYANDEV)
          </a>
          <a
            href="https://github.com/gabrielyandev/boxblackweb"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#e5a93c] transition"
          >
            GITHUB ↗
          </a>
          <button
            onClick={() => setIsSupportOpen(true)}
            className="text-[#d9822b] hover:text-[#e8953f] font-bold transition"
          >
            CONTRIBUIR / APOIAR
          </button>
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="hover:text-[#f2efe9] transition"
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
        onShowAlert={showAlert}
        onShowConfirm={showConfirm}
      />
      <CommunityModal
        isOpen={isCommunityOpen}
        onClose={() => setIsCommunityOpen(false)}
        ampNames={ampNames}
        cabNames={cabNames}
        isConnected={connectionState.state === 'connected'}
        initialTarget={importerTarget}
        onStageCapture={handleStageCapture}
        onSaveCapture={handleSaveCapture}
        onShowConfirm={showConfirm}
      />
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        onShowAlert={showAlert}
      />
      <DialogModal
        dialog={dialogState}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </div>
  )
}
