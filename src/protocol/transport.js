import { BLE_CONFIG, PROTOCOL } from './constants'
import { sysexWrap, sysexUnwrap } from './codec'
import { parseFrame, isAck } from './frames'

export class BlackBoxTransport {
  constructor() {
    this.type = null // 'ble' | 'midi' | null
    this.connected = false
    this.deviceName = ''

    // BLE references
    this.bleDevice = null
    this.bleServer = null
    this.txChar = null
    this.rxChar = null

    // MIDI references
    this.midiAccess = null
    this.midiInput = null
    this.midiOutput = null

    // Event callbacks
    this.onMessageListeners = new Set()
    this.onStatusListeners = new Set()

    // Receive buffers for fragmented responses
    this.rxBuffer = []
    this.midiRxBuffer = []
    this.ackResolvers = []
    this.writeQueue = Promise.resolve()
    this.lastRxTime = 0
  }

  notifyStatus(status) {
    this.onStatusListeners.forEach(fn => fn(status))
  }

  notifyMessage(msg) {
    this.onMessageListeners.forEach(fn => fn(msg))
  }

  onMessage(fn) {
    this.onMessageListeners.add(fn)
    return () => this.onMessageListeners.delete(fn)
  }

  onStatus(fn) {
    this.onStatusListeners.add(fn)
    return () => this.onStatusListeners.delete(fn)
  }

  /**
   * Connect via Web Bluetooth (BLE)
   */
  async connectBLE() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth não é suportado pelo seu navegador. Use Chrome, Chromium, Brave ou Edge.')
    }

    this.notifyStatus({ state: 'connecting', method: 'ble', message: 'Buscando dispositivo Bluetooth...' })

    try {
      this.bleDevice = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'BlackBox' },
          { namePrefix: 'M-VAVE' },
          { services: [BLE_CONFIG.serviceUuid] }
        ],
        optionalServices: [BLE_CONFIG.serviceUuid]
      })

      this.bleDevice.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect('Dispositivo Bluetooth desconectado.')
      })

      this.deviceName = this.bleDevice.name || 'BlackBox (BLE)'
      this.notifyStatus({ state: 'connecting', method: 'ble', message: `Conectando ao GATT de ${this.deviceName}...` })

      this.bleServer = await this.bleDevice.gatt.connect()
      const service = await this.bleServer.getPrimaryService(BLE_CONFIG.serviceUuid)

      this.txChar = await service.getCharacteristic(BLE_CONFIG.txUuid)
      this.rxChar = await service.getCharacteristic(BLE_CONFIG.rxUuid)

      await this.rxChar.startNotifications()
      this.rxChar.addEventListener('characteristicvaluechanged', (event) => {
        const val = new Uint8Array(event.target.value.buffer)
        this.handleIncomingRaw(val)
      })

      this.type = 'ble'
      this.connected = true
      this.notifyStatus({
        state: 'connected',
        method: 'ble',
        deviceName: this.deviceName,
        message: 'Conectado via Bluetooth com sucesso!'
      })
    } catch (err) {
      this.disconnect()
      throw err
    }
  }

  /**
   * Connect via Web MIDI (USB Cable SysEx)
   */
  async connectMIDI() {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API não é suportada pelo seu navegador. Use Chrome, Chromium, Brave ou Edge.')
    }

    this.notifyStatus({ state: 'connecting', method: 'midi', message: 'Acessando dispositivos MIDI...' })

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true })

      const inputs = Array.from(this.midiAccess.inputs.values())
      const outputs = Array.from(this.midiAccess.outputs.values())

      if (inputs.length === 0 || outputs.length === 0) {
        throw new Error('Nenhum dispositivo MIDI encontrado via USB. Verifique se o cabo está conectado.')
      }

      const matchPort = (p) => /blackbox|m-vave|cuvave|jieli|composite/i.test(`${p.name} ${p.manufacturer || ''}`)
      const isNotThrough = (p) => !/midi through/i.test(p.name || '')
      const input = inputs.find(matchPort) || inputs.find(isNotThrough) || inputs[0]
      const output = outputs.find(matchPort) || outputs.find(isNotThrough) || outputs[0]

      this.midiInput = input
      this.midiOutput = output
      this.deviceName = input.name || 'BlackBox (USB MIDI)'
      this.midiRxBuffer = []

      this.midiInput.onmidimessage = (event) => {
        const data = event.data
        if (!data || data.length === 0) return

        for (let i = 0; i < data.length; i++) {
          const byte = data[i]
          // Filter MIDI real-time bytes that may interleave SysEx
          if (byte >= 0xF8 && byte <= 0xFE) continue

          if (byte === 0xF0) {
            this.midiRxBuffer = [0xF0]
          } else if (this.midiRxBuffer.length > 0) {
            this.midiRxBuffer.push(byte)
            if (byte === 0xF7) {
              const completeSysEx = new Uint8Array(this.midiRxBuffer)
              this.midiRxBuffer = []
              try {
                const raw = sysexUnwrap(completeSysEx)
                this.handleIncomingRaw(raw)
              } catch (err) {
                console.error('Erro ao desembrulhar SysEx:', err)
              }
            }
          }
        }
      }

      this.midiAccess.onstatechange = (e) => {
        if (e.port === this.midiInput && e.port.state === 'disconnected') {
          this.handleDisconnect('Cabo USB MIDI desconectado.')
        }
      }

      this.type = 'midi'
      this.connected = true
      this.notifyStatus({
        state: 'connected',
        method: 'midi',
        deviceName: this.deviceName,
        message: 'Conectado via Cabo USB (SysEx) com sucesso!'
      })
    } catch (err) {
      this.disconnect()
      throw err
    }
  }

  /**
   * Send raw frame to BlackBox
   * @param {Uint8Array} rawFrame 
   */
  async sendRaw(rawFrame) {
    if (!this.connected) {
      throw new Error('Dispositivo não está conectado.')
    }

    const writeBleSlice = async (slice) => {
      if (this.txChar.writeValueWithoutResponse) {
        await this.txChar.writeValueWithoutResponse(slice)
      } else {
        await this.txChar.writeValue(slice)
      }
    }

    const task = async () => {
      if (!this.connected) {
        throw new Error('Dispositivo não está conectado.')
      }

      if (this.type === 'ble') {
        if (!this.txChar) throw new Error('Canal BLE TX não inicializado.')
        const mtuChunk = 240
        for (let offset = 0; offset < rawFrame.length; offset += mtuChunk) {
          const slice = rawFrame.subarray(offset, Math.min(rawFrame.length, offset + mtuChunk))
          try {
            await writeBleSlice(slice)
          } catch (err) {
            if (slice.length > 20) {
              for (let sub = 0; sub < slice.length; sub += 20) {
                const subSlice = slice.subarray(sub, Math.min(slice.length, sub + 20))
                await writeBleSlice(subSlice)
                if (sub + 20 < slice.length) {
                  await new Promise(resolve => setTimeout(resolve, 10))
                }
              }
            } else {
              throw err
            }
          }
          if (offset + mtuChunk < rawFrame.length) {
            await new Promise(resolve => setTimeout(resolve, 15))
          }
        }
      } else if (this.type === 'midi') {
        if (!this.midiOutput) throw new Error('Canal MIDI Out não inicializado.')
        const wrapped = sysexWrap(rawFrame)
        this.midiOutput.send(wrapped)
      }
    }

    const result = this.writeQueue.then(task, task)
    this.writeQueue = result.catch(() => {})
    return result
  }

  /**
   * Send a write frame and wait for the compact 8-byte ACK
   * @param {Uint8Array} rawFrame 
   * @param {number} [timeoutMs=3000] 
   * @returns {Promise<boolean>}
   */
  async sendAndWaitAck(rawFrame, timeoutMs = 3000) {
    let settled = false
    let timerId = null
    let entry = null

    const ackPromise = new Promise((resolve, reject) => {
      entry = {
        resolve: () => {
          if (settled) return
          settled = true
          clearTimeout(timerId)
          resolve(true)
        },
        reject: (err) => {
          if (settled) return
          settled = true
          clearTimeout(timerId)
          reject(err)
        },
      }
      this.ackResolvers.push(entry)
      timerId = setTimeout(() => {
        const idx = this.ackResolvers.indexOf(entry)
        if (idx !== -1) this.ackResolvers.splice(idx, 1)
        entry.reject(new Error('Timeout aguardando confirmação (ACK) do pedal.'))
      }, timeoutMs)
    })

    try {
      await this.sendRaw(rawFrame)
    } catch (err) {
      const idx = this.ackResolvers.indexOf(entry)
      if (idx !== -1) this.ackResolvers.splice(idx, 1)
      entry.reject(err)
    }

    return ackPromise
  }

  /**
   * Reassemble fragmented raw bytes into complete frames
   * @param {Uint8Array} chunk 
   */
  handleIncomingRaw(chunk) {
    if (!chunk || chunk.length === 0) return

    const now = Date.now()
    if (this.rxBuffer.length > 0 && now - this.lastRxTime > 300) {
      this.rxBuffer = []
    }
    this.lastRxTime = now

    for (let i = 0; i < chunk.length; i++) {
      this.rxBuffer.push(chunk[i])
    }

    // Extract any compact 8-byte ACK immediately so stale/partial buffers cannot block an ACK
    const ackSeq = PROTOCOL.ACK
    while (this.rxBuffer.length >= ackSeq.length) {
      let ackIdx = -1
      for (let i = 0; i <= this.rxBuffer.length - ackSeq.length; i++) {
        let matched = true
        for (let k = 0; k < ackSeq.length; k++) {
          if (this.rxBuffer[i + k] !== ackSeq[k]) {
            matched = false
            break
          }
        }
        if (matched) {
          ackIdx = i
          break
        }
      }
      if (ackIdx === -1) break
      const ackBytes = new Uint8Array(this.rxBuffer.splice(ackIdx, ackSeq.length))
      const pending = this.ackResolvers.shift()
      if (pending) pending.resolve()
      this.notifyMessage({
        raw: ackBytes,
        parsed: { type: 'ACK' },
      })
    }

    const isValidMagic = (b0, b1, b2) =>
      b0 === 0x00 &&
      b1 === 0x59 &&
      (b2 === 0x23 || b2 === 0x22 || b2 === 0x00 || b2 === 0x11 || b2 === 0x21)

    while (this.rxBuffer.length >= 3) {
      // Align to valid 3-byte magic header
      if (!isValidMagic(this.rxBuffer[0], this.rxBuffer[1], this.rxBuffer[2])) {
        let foundIdx = -1
        for (let i = 1; i <= this.rxBuffer.length - 3; i++) {
          if (isValidMagic(this.rxBuffer[i], this.rxBuffer[i + 1], this.rxBuffer[i + 2])) {
            foundIdx = i
            break
          }
        }
        if (foundIdx === -1) {
          // Preserve trailing 0x00 or 0x00 0x59 in case header spans fragments
          const len = this.rxBuffer.length
          if (len >= 2 && this.rxBuffer[len - 2] === 0x00 && this.rxBuffer[len - 1] === 0x59) {
            this.rxBuffer = [0x00, 0x59]
          } else if (this.rxBuffer[len - 1] === 0x00) {
            this.rxBuffer = [0x00]
          } else {
            this.rxBuffer = []
          }
          break
        }
        this.rxBuffer.splice(0, foundIdx)
      }

      if (this.rxBuffer.length < 8) break

      // Check compact 8-byte ACK: 00 59 00 01 00 00 00 FF
      const candidate8 = this.rxBuffer.slice(0, 8)
      if (isAck(candidate8)) {
        const ackBytes = new Uint8Array(this.rxBuffer.splice(0, 8))
        const pending = this.ackResolvers.shift()
        if (pending) pending.resolve()
        this.notifyMessage({
          raw: ackBytes,
          parsed: { type: 'ACK' },
        })
        continue
      }

      if (this.rxBuffer.length < PROTOCOL.HEADER_LEN + 1) break

      const lengthField = this.rxBuffer[3] | (this.rxBuffer[4] << 8)
      const totalFrameLen = lengthField + 7

      if (totalFrameLen < PROTOCOL.HEADER_LEN + 1 || totalFrameLen > 4096) {
        // Invalid length sync; discard first byte and resync
        this.rxBuffer.shift()
        continue
      }

      if (this.rxBuffer.length < totalFrameLen) {
        // Wait for remaining fragments
        break
      }

      const completeFrame = new Uint8Array(this.rxBuffer.splice(0, totalFrameLen))
      const parsed = parseFrame(completeFrame)
      this.notifyMessage({
        raw: completeFrame,
        parsed,
      })
    }
  }

  handleDisconnect(reason = 'Desconectado.') {
    this.connected = false
    this.notifyStatus({
      state: 'disconnected',
      method: null,
      message: reason,
    })
    this.cleanup()
  }

  disconnect() {
    this.connected = false
    this.cleanup()
    this.notifyStatus({
      state: 'disconnected',
      method: null,
      message: 'Desconectado.',
    })
  }

  cleanup() {
    if (this.bleDevice && this.bleDevice.gatt && this.bleDevice.gatt.connected) {
      this.bleDevice.gatt.disconnect()
    }
    this.bleDevice = null
    this.bleServer = null
    this.txChar = null
    this.rxChar = null

    if (this.midiInput) {
      this.midiInput.onmidimessage = null
    }
    this.midiInput = null
    this.midiOutput = null
    this.type = null

    this.rxBuffer = []
    this.midiRxBuffer = []
    this.lastRxTime = 0
    this.writeQueue = Promise.resolve()
    while (this.ackResolvers.length > 0) {
      const pending = this.ackResolvers.shift()
      pending.reject(new Error('Conexão encerrada.'))
    }
  }
}

export const transport = new BlackBoxTransport()
