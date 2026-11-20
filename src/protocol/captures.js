const HEADER_LEN = 60
const NAME_OFFSET = 4
const NAME_FIELD = 14
const NAME_MAX = 13

const AM2_PAYLOAD_LEN = 6144 // 1536 float32
const AM2_RECORD_LEN = HEADER_LEN + AM2_PAYLOAD_LEN // 6204
const LMT_LEN = 68 // 'LMT\0' + 16 float32
const AM2_DEVICE_LEN = AM2_RECORD_LEN + LMT_LEN // 6272

const AM4_PAYLOAD_LEN = 7808 // 1952 float32
const AM4_RECORD_LEN = HEADER_LEN + AM4_PAYLOAD_LEN // 7868
const AM4_DEVICE_LEN = AM4_RECORD_LEN + LMT_LEN // 7936

const IR_TAPS = 2048
const IR_SAMPLE_RATE = 44100
const CAB_HEADER_LEN = 20

/**
 * Strip extension/index prefix and sanitize into printable ASCII <= 13 chars
 * @param {string} rawName 
 * @returns {string}
 */
export function sanitizeSlotName(rawName = '') {
  const base = rawName
    .replace(/\.[^/.]+$/, '')
    .replace(/^\d+[\s._-]+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  let clean = ''
  for (let i = 0; i < base.length; i++) {
    const code = base.charCodeAt(i)
    if (code >= 0x20 && code <= 0x7e) {
      clean += base[i]
    }
  }
  return clean.trim().slice(0, NAME_MAX) || 'USER_SLOT'
}

function encodeAsciiField14(name) {
  const clean = sanitizeSlotName(name)
  const out = new Uint8Array(NAME_FIELD)
  for (let i = 0; i < Math.min(NAME_MAX, clean.length); i++) {
    out[i] = clean.charCodeAt(i) & 0x7f
  }
  return out
}

function readAsciiField(bytes, offset, maxLen) {
  let out = ''
  for (let i = 0; i < maxLen; i++) {
    const b = bytes[offset + i]
    if (b === 0) break
    if (b >= 0x20 && b <= 0x7e) out += String.fromCharCode(b)
  }
  return out.trim()
}

function riffWalk(bytes) {
  if (
    bytes.length < 12 ||
    bytes[0] !== 0x52 || // R
    bytes[1] !== 0x49 || // I
    bytes[2] !== 0x46 || // F
    bytes[3] !== 0x46 || // F
    bytes[8] !== 0x57 || // W
    bytes[9] !== 0x41 || // A
    bytes[10] !== 0x56 || // V
    bytes[11] !== 0x45 // E
  ) {
    return null
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks = []
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    )
    const size = view.getUint32(offset + 4, true)
    chunks.push({ id, offset: offset + 8, size })
    offset += 8 + size + (size & 1)
  }
  return chunks
}

/**
 * Parse and validate a WAV Cabinet IR file
 * @param {ArrayBuffer} arrayBuffer 
 */
export function parseWavIr(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const errors = []
  const warnings = []

  const chunks = riffWalk(bytes)
  if (!chunks) {
    return {
      ok: false,
      errors: ['Arquivo não é um RIFF/WAVE válido.'],
      warnings: [],
    }
  }

  const fmt = chunks.find((c) => c.id === 'fmt ')
  const dataChunk = chunks.find((c) => c.id === 'data')
  if (!fmt || !dataChunk) {
    return {
      ok: false,
      errors: ['Chunks "fmt " ou "data" ausentes no arquivo WAV.'],
      warnings: [],
    }
  }

  if (fmt.size < 16 || fmt.offset + 16 > bytes.length) {
    return {
      ok: false,
      errors: ['Chunk "fmt " truncado.'],
      warnings: [],
    }
  }

  let formatTag = view.getUint16(fmt.offset, true)
  const channels = view.getUint16(fmt.offset + 2, true)
  const sampleRate = view.getUint32(fmt.offset + 4, true)
  const blockAlign = view.getUint16(fmt.offset + 12, true)
  const bits = view.getUint16(fmt.offset + 14, true)

  if (formatTag === 0xfffe && fmt.size >= 40 && fmt.offset + 40 <= bytes.length) {
    formatTag = view.getUint16(fmt.offset + 24, true)
  }

  if (formatTag !== 1 && formatTag !== 3) {
    errors.push(`Formato WAV não suportado (tag ${formatTag}). Use PCM ou IEEE Float.`)
  }
  if (channels < 1 || sampleRate < 1 || blockAlign < 1 || bits < 1) {
    errors.push('Parâmetros de áudio inválidos no cabeçalho WAV.')
  }

  const availableData = Math.min(dataChunk.size, Math.max(0, bytes.length - dataChunk.offset))
  const frames = blockAlign > 0 ? Math.floor(availableData / blockAlign) : 0
  if (frames <= 0) {
    errors.push('O arquivo WAV não contém amostras de áudio.')
  }

  if (sampleRate !== IR_SAMPLE_RATE) {
    warnings.push(`${sampleRate} Hz será reamostrado para 44100 Hz.`)
  }
  if (channels !== 1) {
    warnings.push(`${channels} canais serão somados para Mono.`)
  }
  if (bits !== 24 || formatTag === 3) {
    warnings.push(`${bits}-bit ${formatTag === 3 ? 'Float' : 'PCM'} será convertido para 24-bit PCM.`)
  }
  if (frames > IR_TAPS) {
    warnings.push(`${frames} amostras serão ajustadas para o limite de 2048 pts (46.4 ms).`)
  }

  return {
    ok: errors.length === 0,
    size: bytes.length,
    channels,
    sampleRate,
    bits,
    formatTag,
    frames,
    durationMs: sampleRate > 0 ? Number(((frames / sampleRate) * 1000).toFixed(1)) : 0,
    errors,
    warnings,
  }
}

function decodeWaveSample(view, offset, formatTag, bits) {
  if (formatTag === 3) {
    if (bits === 32) return view.getFloat32(offset, true)
    if (bits === 64) return view.getFloat64(offset, true)
  }
  if (bits === 8) {
    return (view.getUint8(offset) - 128) / 128
  }
  if (bits === 16) {
    return view.getInt16(offset, true) / 32768
  }
  if (bits === 24) {
    const b0 = view.getUint8(offset)
    const b1 = view.getUint8(offset + 1)
    const b2 = view.getUint8(offset + 2)
    let val = b0 | (b1 << 8) | (b2 << 16)
    if (val & 0x800000) val -= 0x1000000
    return val / 8388608
  }
  if (bits === 32) {
    return view.getInt32(offset, true) / 2147483648
  }
  throw new Error(`Profundidade de bits não suportada: ${bits}-bit`)
}

/**
 * Convert a WAV file into 2048 signed 24-bit mono samples at 44100 Hz (6144 bytes)
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Uint8Array}
 */
export function wavToCabSamples(arrayBuffer) {
  const info = parseWavIr(arrayBuffer)
  if (!info.ok) {
    throw new Error(info.errors.join(' '))
  }

  const bytes = new Uint8Array(arrayBuffer)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks = riffWalk(bytes)
  const fmt = chunks.find((c) => c.id === 'fmt ')
  const dataChunk = chunks.find((c) => c.id === 'data')
  const blockAlign = view.getUint16(fmt.offset + 12, true)

  const sampleWidth = Math.ceil(info.bits / 8)
  const mono = new Float32Array(info.frames)

  for (let f = 0; f < info.frames; f++) {
    const frameBase = dataChunk.offset + f * blockAlign
    let sum = 0
    for (let ch = 0; ch < info.channels; ch++) {
      sum += decodeWaveSample(view, frameBase + ch * sampleWidth, info.formatTag, info.bits)
    }
    mono[f] = sum / info.channels
  }

  const out = new Uint8Array(IR_TAPS * 3)
  const outView = new DataView(out.buffer)
  const max24 = (1 << 23) - 1
  const min24 = -(1 << 23)

  for (let i = 0; i < IR_TAPS; i++) {
    const srcPos = (i * info.sampleRate) / IR_SAMPLE_RATE
    const left = Math.floor(srcPos)
    let sample = 0
    if (left < mono.length) {
      const right = Math.min(left + 1, mono.length - 1)
      const frac = srcPos - left
      sample = mono[left] + (mono[right] - mono[left]) * frac
    }

    let q = Math.round(sample * (1 << 23))
    if (q > max24) q = max24
    if (q < min24) q = min24
    if (q < 0) q += 0x1000000

    const outOff = i * 3
    outView.setUint8(outOff, q & 0xff)
    outView.setUint8(outOff + 1, (q >> 8) & 0xff)
    outView.setUint8(outOff + 2, (q >> 16) & 0xff)
  }

  return out
}

/**
 * Build the exact 6164-byte CAB staging record (20B header + 6144B 24-bit PCM)
 * @param {ArrayBuffer} arrayBuffer 
 * @param {string} slotName 
 * @param {number} [level=50] 
 * @returns {Uint8Array}
 */
export function buildCabRecord(arrayBuffer, slotName, level = 50) {
  const samples = wavToCabSamples(arrayBuffer)
  const record = new Uint8Array(CAB_HEADER_LEN + samples.length)

  // 'CAB\0'
  record[0] = 0x43
  record[1] = 0x41
  record[2] = 0x42
  record[3] = 0x00

  // 14-byte NUL-terminated ASCII name
  record.set(encodeAsciiField14(slotName), NAME_OFFSET)

  record[18] = 0x01
  record[19] = Math.max(0, Math.min(100, Math.round(level)))
  record.set(samples, CAB_HEADER_LEN)

  return record
}

/**
 * Export a normalized 44.1 kHz / 24-bit / Mono / 2048-sample WAV file
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Uint8Array}
 */
export function exportNormalizedWav(arrayBuffer) {
  const samples = wavToCabSamples(arrayBuffer)
  const wav = new Uint8Array(44 + samples.length)
  const view = new DataView(wav.buffer)

  // RIFF header
  wav.set([0x52, 0x49, 0x46, 0x46], 0) // RIFF
  view.setUint32(4, 36 + samples.length, true)
  wav.set([0x57, 0x41, 0x56, 0x45], 8) // WAVE

  // fmt chunk
  wav.set([0x66, 0x6d, 0x74, 0x20], 12) // "fmt "
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM tag
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, IR_SAMPLE_RATE, true)
  view.setUint32(28, IR_SAMPLE_RATE * 3, true)
  view.setUint16(32, 3, true) // block align
  view.setUint16(34, 24, true) // 24-bit

  // data chunk
  wav.set([0x64, 0x61, 0x74, 0x61], 36) // "data"
  view.setUint32(40, samples.length, true)
  wav.set(samples, 44)

  return wav
}

function defaultAmpHeader(format = 'AM2') {
  const header = new Uint8Array(HEADER_LEN)
  const view = new DataView(header.buffer)
  header[0] = 0x41 // A
  header[1] = 0x4d // M
  header[2] = format === 'AM4' ? 0x34 : format === 'AM3' ? 0x33 : 0x32
  header[3] = 0x00

  header[0x12] = 100 // mix
  header[0x13] = 100 // level
  header[0x14] = 60 // gainMax
  header[0x15] = 30 // gainMin

  const eqFreqs = [100.0, 2000.0, 4000.0]
  for (let b = 0; b < 3; b++) {
    const off = 0x18 + b * 12
    view.setFloat32(off, eqFreqs[b], true)
    view.setFloat32(off + 4, -6.0, true)
    view.setFloat32(off + 8, 6.0, true)
  }
  return header
}

/**
 * Inspect any uploaded file (.wav, .am2, .am2Data, .am3Data, .am4, .am4Data, .nam)
 * @param {string} fileName 
 * @param {ArrayBuffer} arrayBuffer 
 */
export function inspectCaptureFile(fileName, arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  const lower = fileName.toLowerCase()

  // 1. Detect raw PyTorch .NAM JSON file
  if (lower.endsWith('.nam') || (bytes.length > 2 && bytes[0] === 0x7b)) {
    try {
      const text = new TextDecoder().decode(bytes)
      const json = JSON.parse(text)
      return {
        kind: 'nam_raw',
        ok: true,
        fileName,
        size: bytes.length,
        suggestedName: sanitizeSlotName(fileName),
        info: {
          version: json.version || 'N/A',
          architecture: json.architecture || 'WaveNet / LSTM',
          sampleRate: json.sample_rate || 48000,
          modelName: json.metadata?.name || sanitizeSlotName(fileName),
        },
        errors: [],
        warnings: [
          'Arquivos .nam brutos contêm pesos PyTorch em formato JSON. A pedaleira BlackBox executa modelos compilados nos formatos .am2 / .am2Data / .am3Data / .am4.',
        ],
      }
    } catch {
      return {
        kind: 'nam_raw',
        ok: false,
        fileName,
        size: bytes.length,
        errors: ['Arquivo .nam inválido ou corrompido.'],
        warnings: [],
      }
    }
  }

  // 2. Detect RIFF/WAVE IR
  if (
    lower.endsWith('.wav') ||
    (bytes.length >= 4 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46)
  ) {
    const wavInfo = parseWavIr(arrayBuffer)
    return {
      kind: 'cab',
      fileName,
      suggestedName: sanitizeSlotName(fileName),
      ...wavInfo,
    }
  }

  // 3. Detect AMP capture records (.am2, .am2Data, .am3Data, .am4, .am4Data)
  const size = bytes.length
  const errors = []
  const warnings = []

  let format = null
  let hasHeader = false
  let payloadOffset = 0
  let payloadFloats = 0
  let hasLmt = false

  if (size === AM2_PAYLOAD_LEN) {
    format = 'AM2'
    hasHeader = false
    payloadOffset = 0
    payloadFloats = 1536
    warnings.push('Arquivo .am2 sem cabeçalho: cabeçalho padrão AM2 (60 bytes) será gerado.')
  } else if (size === AM2_RECORD_LEN || size === AM2_DEVICE_LEN) {
    hasHeader = true
    payloadOffset = HEADER_LEN
    payloadFloats = 1536
    hasLmt = size === AM2_DEVICE_LEN &&
      bytes[AM2_RECORD_LEN] === 0x4c &&
      bytes[AM2_RECORD_LEN + 1] === 0x4d &&
      bytes[AM2_RECORD_LEN + 2] === 0x54
  } else if (size === AM4_PAYLOAD_LEN) {
    format = 'AM4'
    hasHeader = false
    payloadOffset = 0
    payloadFloats = 1952
    warnings.push('Arquivo .am4 bruto: cabeçalho padrão AM4 (60 bytes) será gerado.')
  } else if (size === AM4_RECORD_LEN || size === AM4_DEVICE_LEN) {
    format = 'AM4'
    hasHeader = true
    payloadOffset = HEADER_LEN
    payloadFloats = 1952
    hasLmt = size === AM4_DEVICE_LEN &&
      bytes[AM4_RECORD_LEN] === 0x4c &&
      bytes[AM4_RECORD_LEN + 1] === 0x4d &&
      bytes[AM4_RECORD_LEN + 2] === 0x54
  } else if (size >= AM4_RECORD_LEN && (lower.endsWith('.am4') || lower.endsWith('.am4data') || (bytes[0] === 0x41 && bytes[1] === 0x4d && bytes[2] === 0x34))) {
    format = 'AM4'
    hasHeader = true
    payloadOffset = HEADER_LEN
    payloadFloats = 1952
    hasLmt = size >= AM4_DEVICE_LEN &&
      bytes[AM4_RECORD_LEN] === 0x4c &&
      bytes[AM4_RECORD_LEN + 1] === 0x4d &&
      bytes[AM4_RECORD_LEN + 2] === 0x54
    if (size !== AM4_RECORD_LEN && size !== AM4_DEVICE_LEN) {
      warnings.push(`Arquivo AM4 com ${size} bytes normalizado para ${hasLmt ? AM4_DEVICE_LEN : AM4_RECORD_LEN} bytes.`)
    }
  } else if (size >= AM2_RECORD_LEN && (lower.endsWith('.am2data') || lower.endsWith('.am3data') || (bytes[0] === 0x41 && bytes[1] === 0x4d))) {
    format = 'AM2'
    hasHeader = true
    payloadOffset = HEADER_LEN
    payloadFloats = 1536
    hasLmt = size >= AM2_DEVICE_LEN &&
      bytes[AM2_RECORD_LEN] === 0x4c &&
      bytes[AM2_RECORD_LEN + 1] === 0x4d &&
      bytes[AM2_RECORD_LEN + 2] === 0x54
    if (size !== AM2_RECORD_LEN && size !== AM2_DEVICE_LEN) {
      warnings.push(`Arquivo AM2/AM3 com ${size} bytes normalizado para ${hasLmt ? AM2_DEVICE_LEN : AM2_RECORD_LEN} bytes.`)
    }
  } else {
    return {
      kind: 'unknown',
      ok: false,
      fileName,
      size,
      errors: [
        `Tamanho não reconhecido (${size} bytes). Esperado: .wav, .am2 (6144B), .am2Data/.am3Data (6204B/6272B) ou .am4 (7808B/7868B/7936B).`,
      ],
      warnings: [],
    }
  }

  let magicRepaired = false
  let name = ''
  let mix = 100
  let level = 100
  let gainMax = 60
  let gainMin = 30

  if (hasHeader) {
    const m0 = bytes[0]
    const m1 = bytes[1]
    const m2 = bytes[2]
    const m3 = bytes[3]

    if (m0 === 0x41 && m1 === 0x4d && m3 === 0x00 && (m2 === 0x32 || m2 === 0x33 || m2 === 0x34)) {
      format = `AM${String.fromCharCode(m2)}`
    } else if (m0 === 0x00 && m1 === 0x00 && m3 === 0x00 && (m2 === 0x32 || m2 === 0x33 || m2 === 0x34)) {
      format = `AM${String.fromCharCode(m2)}`
      magicRepaired = true
      warnings.push(`Magic 0000${m2.toString(16)}00 detectado e reparado automaticamente para ${format}.`)
    } else {
      errors.push('Cabeçalho AM2/AM3/AM4 inválido.')
    }

    name = readAsciiField(bytes, NAME_OFFSET, NAME_FIELD)
    mix = Math.min(100, bytes[0x12])
    level = bytes[0x13]
    gainMax = bytes[0x14]
    gainMin = bytes[0x15]
  }

  // Validate float32 weights
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let weightMin = Infinity
  let weightMax = -Infinity
  for (let i = 0; i < payloadFloats; i++) {
    const w = view.getFloat32(payloadOffset + i * 4, true)
    if (!Number.isFinite(w)) {
      errors.push(`Peso inválido (NaN/Inf) no índice ${i}.`)
      break
    }
    if (Math.abs(w) >= 1024) {
      errors.push(`Peso fora da faixa Q21 (${w.toFixed(2)}) no índice ${i}.`)
      break
    }
    if (w < weightMin) weightMin = w
    if (w > weightMax) weightMax = w
  }

  return {
    kind: 'amp',
    ok: errors.length === 0,
    fileName,
    size,
    format,
    hasHeader,
    magicRepaired,
    hasLmt,
    name,
    suggestedName: sanitizeSlotName(name || fileName),
    mix,
    level,
    gainMax,
    gainMin,
    weightCount: payloadFloats,
    weightMin: Number.isFinite(weightMin) ? Number(weightMin.toFixed(3)) : 0,
    weightMax: Number.isFinite(weightMax) ? Number(weightMax.toFixed(3)) : 0,
    errors,
    warnings,
  }
}

/**
 * Build normalized interchange & device AMP records from source capture file
 * @param {ArrayBuffer} arrayBuffer 
 * @param {string} slotName 
 * @param {{mix?: number, level?: number, gainMax?: number, gainMin?: number}} [options] 
 */
export function buildAmpRecord(arrayBuffer, slotName, options = {}) {
  const bytes = new Uint8Array(arrayBuffer)
  const size = bytes.length

  const isAm4 =
    size === AM4_PAYLOAD_LEN ||
    size === AM4_RECORD_LEN ||
    size === AM4_DEVICE_LEN ||
    (size >= AM4_RECORD_LEN &&
      ((bytes[0] === 0x41 && bytes[1] === 0x4d && bytes[2] === 0x34) ||
        (size >= AM4_DEVICE_LEN && bytes[AM4_RECORD_LEN] === 0x4c && bytes[AM4_RECORD_LEN + 1] === 0x4d)))
  const baseRecordLen = isAm4 ? AM4_RECORD_LEN : AM2_RECORD_LEN
  const deviceRecordLen = isAm4 ? AM4_DEVICE_LEN : AM2_DEVICE_LEN
  const payloadLen = isAm4 ? AM4_PAYLOAD_LEN : AM2_PAYLOAD_LEN

  const downloadBytes = new Uint8Array(baseRecordLen)

  if (size === AM2_PAYLOAD_LEN || size === AM4_PAYLOAD_LEN) {
    downloadBytes.set(defaultAmpHeader(isAm4 ? 'AM4' : 'AM2'), 0)
    downloadBytes.set(bytes, HEADER_LEN)
  } else if (size >= baseRecordLen) {
    downloadBytes.set(bytes.subarray(0, baseRecordLen), 0)
  } else {
    throw new Error('Tamanho de captura AMP inválido.')
  }

  // Repair 00 00 3x 00 magic if present
  if (
    downloadBytes[0] === 0x00 &&
    downloadBytes[1] === 0x00 &&
    downloadBytes[3] === 0x00 &&
    (downloadBytes[2] === 0x32 || downloadBytes[2] === 0x33 || downloadBytes[2] === 0x34)
  ) {
    downloadBytes[0] = 0x41
    downloadBytes[1] = 0x4d
  }

  // Write 14-byte name field
  downloadBytes.set(encodeAsciiField14(slotName), NAME_OFFSET)

  // Update header parameters if provided
  if (typeof options.mix === 'number') {
    downloadBytes[0x12] = Math.max(0, Math.min(100, Math.round(options.mix)))
  }
  if (typeof options.level === 'number') {
    downloadBytes[0x13] = Math.max(0, Math.min(255, Math.round(options.level)))
  }
  if (typeof options.gainMax === 'number') {
    downloadBytes[0x14] = Math.max(0, Math.min(100, Math.round(options.gainMax)))
  }
  if (typeof options.gainMin === 'number') {
    downloadBytes[0x15] = Math.max(0, Math.min(100, Math.round(options.gainMin)))
  }

  // Device staging/upload record (includes 68-byte LMT region)
  const deviceBytes = new Uint8Array(deviceRecordLen)
  deviceBytes.set(downloadBytes, 0)

  let hasLmt = false
  if (
    size === deviceRecordLen &&
    bytes[baseRecordLen] === 0x4c &&
    bytes[baseRecordLen + 1] === 0x4d &&
    bytes[baseRecordLen + 2] === 0x54
  ) {
    deviceBytes.set(bytes.subarray(baseRecordLen, deviceRecordLen), baseRecordLen)
    hasLmt = true
  }

  return {
    format: isAm4 ? 'AM4' : downloadBytes[2] === 0x33 ? 'AM3' : 'AM2',
    downloadBytes,
    deviceBytes,
    hasLmt,
    payloadLen,
  }
}
