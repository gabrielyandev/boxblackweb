import { BLE_CONFIG, PROTOCOL } from './constants'
import { sysexWrap, sysexUnwrap } from './codec'
import { parseFrame } from './frames'

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

    // Receive buffer for fragmented responses
    this.rxBuffer = []
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

      // Try finding one named BlackBox or M-VAVE, otherwise use the first available
      const input = inputs.find(i => /blackbox|m-vave|cuvave/i.test(i.name)) || inputs[0]
      const output = outputs.find(o => /blackbox|m-vave|cuvave/i.test(o.name)) || outputs[0]

      this.midiInput = input
      this.midiOutput = output
      this.deviceName = input.name || 'BlackBox (USB MIDI)'

      this.midiInput.onmidimessage = (event) => {
        const data = event.data
        if (data && data.length >= 2 && data[0] === 0xF0 && data[data.length - 1] === 0xF7) {
          try {
            const raw = sysexUnwrap(data)
            this.handleIncomingRaw(raw)
          } catch (err) {
            console.error('Erro ao desembrulhar SysEx:', err)
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

    if (this.type === 'ble') {
      if (!this.txChar) throw new Error('Canal BLE TX não inicializado.')
      // Use writeValueWithoutResponse if available
      if (this.txChar.writeValueWithoutResponse) {
        await this.txChar.writeValueWithoutResponse(rawFrame)
      } else {
        await this.txChar.writeValue(rawFrame)
      }
    } else if (this.type === 'midi') {
      if (!this.midiOutput) throw new Error('Canal MIDI Out não inicializado.')
      const wrapped = sysexWrap(rawFrame)
      this.midiOutput.send(wrapped)
    }
  }

  /**
   * Handle incoming raw bytes from either BLE or SysEx
   */
  handleIncomingRaw(rawBytes) {
    // If incoming bytes form a frame or are fragmented
    const parsed = parseFrame(rawBytes)
    this.notifyMessage({
      raw: rawBytes,
      parsed,
    })
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
  }
}

export const transport = new BlackBoxTransport()
