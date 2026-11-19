import { PROTOCOL, BLOCKS, DEFAULT_AMP_NAMES, DEFAULT_CAB_NAMES } from './constants'
import { calculateChecksum, verifyChecksum } from './codec'

/**
 * Build a raw binary frame
 * @param {Array<number>|Uint8Array} magic 
 * @param {number} space 
 * @param {number} address 
 * @param {number} size 
 * @param {Uint8Array} [payload=new Uint8Array(0)] 
 * @returns {Uint8Array}
 */
export function buildFrame(magic, space, address, size, payload = new Uint8Array(0)) {
  const frameLen = PROTOCOL.HEADER_LEN + payload.length + 1
  const body = new Uint8Array(frameLen)
  
  // Magic (3 bytes)
  body.set(magic, 0)
  
  // Length (2 bytes LE) = payload.length + 8
  const lengthField = payload.length + 8
  body[3] = lengthField & 0xFF
  body[4] = (lengthField >> 8) & 0xFF
  
  // Space (2 bytes LE)
  body[5] = space & 0xFF
  body[6] = (space >> 8) & 0xFF
  
  // Address (4 bytes LE)
  body[7] = address & 0xFF
  body[8] = (address >> 8) & 0xFF
  body[9] = (address >> 16) & 0xFF
  body[10] = (address >> 24) & 0xFF
  
  // Size (3 bytes LE)
  body[11] = size & 0xFF
  body[12] = (size >> 8) & 0xFF
  body[13] = (size >> 16) & 0xFF
  
  // Payload
  if (payload.length > 0) {
    body.set(payload, PROTOCOL.HEADER_LEN)
  }
  
  // Checksum at final byte
  body[body.length - 1] = calculateChecksum(body)
  return body
}

export function buildRead(address, size, space = PROTOCOL.SPACE_PARAM) {
  return buildFrame(PROTOCOL.MAGIC_READ, space, address, size)
}

/** Request live RAM preset dump (92 bytes) */
export function cmdRamDump() {
  return buildRead(PROTOCOL.ADDR_LIVE_RAM, PROTOCOL.PRESET_SIZE)
}

/** Request active preset ID sync */
export function cmdPresetSync() {
  return buildRead(PROTOCOL.ADDR_CURRENT_PRESET, 4)
}

/** Load a stored preset (0-based: 0..79 for P01..P80) */
export function cmdLoadPreset(presetIndex0) {
  return buildFrame(
    PROTOCOL.MAGIC_WRITE,
    PROTOCOL.SPACE_PARAM,
    PROTOCOL.ADDR_LOAD_PRESET + presetIndex0,
    1,
    new Uint8Array([0x01])
  )
}

/** Read a stored preset slot directly from Flash memory (92 bytes) */
export function cmdReadPreset(presetIndex0) {
  return buildRead(
    PROTOCOL.ADDR_PRESET_BASE + presetIndex0 * PROTOCOL.PRESET_SIZE,
    PROTOCOL.PRESET_SIZE,
    PROTOCOL.SPACE_PARAM
  )
}

/** Toggle block on/off */
export function cmdWriteToggle(toggleAddr, isOn) {
  return buildFrame(
    PROTOCOL.MAGIC_WRITE,
    PROTOCOL.SPACE_PARAM,
    PROTOCOL.ADDR_LIVE_RAM + toggleAddr,
    1,
    new Uint8Array([isOn ? 0x01 : 0x00])
  )
}

/** Change model for block */
export function cmdWriteModel(modelAddr, modelIndex) {
  return buildFrame(
    PROTOCOL.MAGIC_WRITE,
    PROTOCOL.SPACE_PARAM,
    PROTOCOL.ADDR_LIVE_RAM + modelAddr,
    1,
    new Uint8Array([modelIndex & 0xFF])
  )
}

/** Write knob value (0 to 100) */
export function cmdWriteKnob(knobAddr, value0to100) {
  const val = Math.max(0, Math.min(100, Math.round(value0to100)))
  return buildFrame(
    PROTOCOL.MAGIC_WRITE,
    PROTOCOL.SPACE_PARAM,
    PROTOCOL.ADDR_LIVE_RAM + knobAddr,
    2,
    new Uint8Array([val & 0xFF, (val >> 8) & 0xFF])
  )
}

/** Write master volume (0 to 100) */
export function cmdWritePatchVolume(value0to100) {
  return cmdWriteKnob(PROTOCOL.ADDR_PATCH_VOLUME, value0to100)
}

/** Write routing order (array of 6 block IDs, e.g. [0, 1, 2, 3, 4, 5]) */
export function cmdWriteRouting(orderArray) {
  return buildFrame(
    PROTOCOL.MAGIC_WRITE,
    PROTOCOL.SPACE_PARAM,
    PROTOCOL.ADDR_LIVE_RAM + PROTOCOL.ADDR_ROUTING,
    6,
    new Uint8Array(orderArray)
  )
}

/** Read AMP names table from Flash (280 bytes = 20 slots x 14 bytes) */
export function cmdReadAmpNames() {
  return buildRead(PROTOCOL.ADDR_AMP_NAMES, 280, PROTOCOL.SPACE_STRING)
}

/** Read CAB names table from Flash (280 bytes = 20 slots x 14 bytes) */
export function cmdReadCabNames() {
  return buildRead(PROTOCOL.ADDR_CAB_NAMES, 280, PROTOCOL.SPACE_STRING)
}

/** Save current preset to flash slot (permanent save) */
export function cmdWriteFlashPreset(presetIndex0, preset92Bytes) {
  if (preset92Bytes.length !== PROTOCOL.PRESET_SIZE) {
    throw new Error(`Preset size must be ${PROTOCOL.PRESET_SIZE} bytes`)
  }
  return buildFrame(
    PROTOCOL.MAGIC_WRITE,
    PROTOCOL.SPACE_PARAM,
    PROTOCOL.ADDR_PRESET_BASE + presetIndex0 * PROTOCOL.PRESET_SIZE,
    PROTOCOL.PRESET_SIZE,
    preset92Bytes
  )
}

/** Force OLED refresh / Commit */
export function cmdCommit() {
  return buildFrame(PROTOCOL.MAGIC_WRITE, PROTOCOL.SPACE_PARAM, PROTOCOL.ADDR_COMMIT, 0)
}

/**
 * Check if a packet is the compact ACK response
 * @param {Uint8Array} raw 
 * @returns {boolean}
 */
export function isAck(raw) {
  if (raw.length !== PROTOCOL.ACK.length) return false
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== PROTOCOL.ACK[i]) return false
  }
  return true
}

/**
 * Parse 20 null-terminated strings of 14 bytes each from flash string table
 * @param {Uint8Array} bytes 
 * @param {string[]} defaultNames 
 * @returns {string[]}
 */
export function parseStringTable(bytes, defaultNames = []) {
  const result = []
  const slotCount = 20
  const slotLen = 14
  for (let i = 0; i < slotCount; i++) {
    const chunk = bytes.subarray(i * slotLen, (i + 1) * slotLen)
    let s = ''
    for (let j = 0; j < chunk.length; j++) {
      const b = chunk[j]
      if (b === 0) break
      if (b >= 32 && b <= 126) s += String.fromCharCode(b)
    }
    s = s.trim()
    if (s.length > 0) {
      result.push(`${i + 1} ${s}`)
    } else if (defaultNames[i]) {
      result.push(defaultNames[i])
    } else {
      result.push(`${i + 1} Slot ${i + 1}`)
    }
  }
  return result
}

/**
 * Parse a raw incoming frame
 * @param {Uint8Array} raw 
 */
export function parseFrame(raw) {
  if (isAck(raw)) {
    return { type: 'ACK' }
  }

  if (raw.length < PROTOCOL.HEADER_LEN + 1) {
    return { type: 'UNKNOWN', raw }
  }

  const magic = [raw[0], raw[1], raw[2]]
  const length = raw[3] | (raw[4] << 8)
  const space = raw[5] | (raw[6] << 8)
  const address = (raw[7] | (raw[8] << 8) | (raw[9] << 16) | (raw[10] << 24)) >>> 0
  const size = raw[11] | (raw[12] << 8) | (raw[13] << 16)
  const payload = raw.subarray(PROTOCOL.HEADER_LEN, raw.length - 1)
  const checksum = raw[raw.length - 1]
  const checksumOk = verifyChecksum(raw)

  if (address === PROTOCOL.ADDR_CURRENT_PRESET && payload.length >= 1) {
    return {
      type: 'PRESET_SYNC',
      presetId: payload[0],
      checksumOk,
      payload,
    }
  }

  if (address === PROTOCOL.ADDR_LIVE_RAM && payload.length === PROTOCOL.PRESET_SIZE) {
    return {
      type: 'RAM_DUMP',
      preset: parseRamDump(payload),
      checksumOk,
      rawPreset: payload,
    }
  }

  if (address === PROTOCOL.ADDR_AMP_NAMES && payload.length >= 280) {
    return {
      type: 'AMP_NAMES',
      names: parseStringTable(payload, DEFAULT_AMP_NAMES),
      checksumOk,
      payload,
    }
  }

  if (address === PROTOCOL.ADDR_CAB_NAMES && payload.length >= 280) {
    return {
      type: 'CAB_NAMES',
      names: parseStringTable(payload, DEFAULT_CAB_NAMES),
      checksumOk,
      payload,
    }
  }

  // Preset dump from Flash memory slot
  const isPresetSlot = address >= PROTOCOL.ADDR_PRESET_BASE &&
    address < PROTOCOL.ADDR_PRESET_BASE + PROTOCOL.PRESET_COUNT * PROTOCOL.PRESET_SIZE &&
    payload.length === PROTOCOL.PRESET_SIZE

  if (isPresetSlot) {
    const slot = Math.floor((address - PROTOCOL.ADDR_PRESET_BASE) / PROTOCOL.PRESET_SIZE)
    return {
      type: 'PRESET_SLOT_DUMP',
      slot,
      preset: parseRamDump(payload),
      rawPreset: payload,
      checksumOk,
    }
  }

  return {
    type: 'GENERIC_FRAME',
    magic,
    space,
    address,
    size,
    payload,
    checksumOk,
  }
}

/**
 * Parse a 92-byte RAM Dump into an editable preset state
 * @param {Uint8Array} dump 
 */
export function parseRamDump(dump) {
  const masterVolume = dump[0] | (dump[1] << 8)
  const routing = Array.from(dump.subarray(2, 8))

  // Block states & models
  const blocksState = {}
  BLOCKS.forEach(block => {
    const isEnabled = dump[block.toggleAddr] === 1
    const modelIndex = dump[block.modelAddr]
    
    // 6 knob values (each 2 bytes LE)
    const knobValues = []
    for (let i = 0; i < 6; i++) {
      const offset = block.knobBase + i * 2
      const val = dump[offset] | (dump[offset + 1] << 8)
      knobValues.push(val)
    }

    blocksState[block.key] = {
      enabled: isEnabled,
      modelIndex,
      knobs: knobValues,
    }
  })

  return {
    masterVolume,
    routing,
    blocks: blocksState,
  }
}

/**
 * Re-serialize editable preset state back into 92 bytes
 */
export function serializePreset(presetState) {
  const dump = new Uint8Array(PROTOCOL.PRESET_SIZE)

  // Master Volume
  dump[0] = presetState.masterVolume & 0xFF
  dump[1] = (presetState.masterVolume >> 8) & 0xFF

  // Routing
  for (let i = 0; i < 6; i++) {
    dump[2 + i] = presetState.routing[i]
  }

  // Blocks
  BLOCKS.forEach(block => {
    const state = presetState.blocks[block.key]
    dump[block.toggleAddr] = state.enabled ? 1 : 0
    dump[block.modelAddr] = state.modelIndex & 0xFF

    for (let i = 0; i < 6; i++) {
      const offset = block.knobBase + i * 2
      const val = state.knobs[i] || 0
      dump[offset] = val & 0xFF
      dump[offset + 1] = (val >> 8) & 0xFF
    }
  })

  return dump
}
