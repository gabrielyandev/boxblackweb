/**
 * Base-128 codec and SysEx wrapping for M-VAVE BlackBox USB MIDI
 * and Checksum calculations for BLE / SysEx frames.
 */

export const SYSEX_START = 0xF0
export const SYSEX_END = 0xF7

/**
 * Pack 8-bit bytes into 7-bit SysEx data bytes, LSB-first and continuous.
 * @param {Uint8Array|Array<number>} data 
 * @returns {Uint8Array}
 */
export function base128Encode(data) {
  const out = []
  let accum = 0
  let bits = 0

  for (let i = 0; i < data.length; i++) {
    accum |= (data[i] & 0xFF) << bits
    bits += 8
    while (bits >= 7) {
      out.push(accum & 0x7F)
      accum >>= 7
      bits -= 7
    }
  }
  out.push(accum & 0x7F)
  return new Uint8Array(out)
}

/**
 * Unpack 7-bit SysEx data bytes back into 8-bit bytes. Leftover bits drop.
 * @param {Uint8Array|Array<number>} enc 
 * @returns {Uint8Array}
 */
export function base128Decode(enc) {
  const out = []
  let accum = 0
  let bits = 0

  for (let i = 0; i < enc.length; i++) {
    accum |= (enc[i] & 0x7F) << bits
    bits += 7
    if (bits >= 8) {
      out.push(accum & 0xFF)
      accum >>= 8
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

/**
 * Wrap raw packet into 7-bit compliant SysEx message
 * @param {Uint8Array} raw 
 * @returns {Uint8Array}
 */
export function sysexWrap(raw) {
  const encoded = base128Encode(raw)
  const full = new Uint8Array(encoded.length + 2)
  full[0] = SYSEX_START
  full.set(encoded, 1)
  full[full.length - 1] = SYSEX_END
  return full
}

/**
 * Unwrap SysEx message into raw packet
 * @param {Uint8Array} msg 
 * @returns {Uint8Array}
 */
export function sysexUnwrap(msg) {
  if (msg.length < 2 || msg[0] !== SYSEX_START || msg[msg.length - 1] !== SYSEX_END) {
    throw new Error('Not a valid SysEx frame (missing F0 or F7)')
  }
  return base128Decode(msg.subarray(1, -1))
}

/**
 * Calculate outbound checksum: 0xFF - sum(frame[5:-1])
 * @param {Uint8Array|Array<number>} frame 
 * @returns {number}
 */
export function calculateChecksum(frame) {
  let sum = 0
  const end = frame.length - 1
  for (let i = 5; i < end; i++) {
    sum = (sum + frame[i]) & 0xFF
  }
  return (0xFF - sum) & 0xFF
}

/**
 * Verify frame checksum
 * @param {Uint8Array} frame 
 * @returns {boolean}
 */
export function verifyChecksum(frame) {
  if (frame.length < 6) return false
  const expected = calculateChecksum(frame)
  return frame[frame.length - 1] === expected
}
