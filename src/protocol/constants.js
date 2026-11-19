export const BLE_CONFIG = {
  deviceName: 'BlackBox_BLE',
  serviceUuid: '0000ae40-0000-1000-8000-00805f9b34fb',
  txUuid: '0000ae41-0000-1000-8000-00805f9b34fb',
  rxUuid: '0000ae42-0000-1000-8000-00805f9b34fb',
}

export const PROTOCOL = {
  MAGIC_READ: [0x00, 0x59, 0x23],
  MAGIC_WRITE: [0x00, 0x59, 0x22],
  ACK: [0x00, 0x59, 0x00, 0x01, 0x00, 0x00, 0x00, 0xFF],
  
  SPACE_PARAM: 0x0400,
  SPACE_STRING: 0x0500,

  ADDR_PRESET_BASE: 0x00000000,
  ADDR_LIVE_RAM: 0x10000000,
  ADDR_CURRENT_PRESET: 0x20000000,
  ADDR_LOAD_PRESET: 0xE0000000,
  ADDR_COMMIT: 0xF0000000,
  ADDR_CAB_NAMES: 0x80000000,
  ADDR_AMP_NAMES: 0x90000000,

  PRESET_SIZE: 92,
  PRESET_COUNT: 80,
  HEADER_LEN: 14,
  
  ADDR_PATCH_VOLUME: 0x00,
  ADDR_ROUTING: 0x02,
}

export const GHOST = null

export const DEFAULT_AMP_NAMES = [
  "1 AC-SeVin", "2 JVM 1960", "3 Plexi 1987", "4 JCM800",
  "5 SLO 100", "6 Recto Modern", "7 Dual Rect", "8 5150 Lead",
  "9 Bogner Shiva", "10 Friedman BE", "11 Twin Reverb", "12 Bassman 59",
  "13 Deluxe Rev", "14 Matchless", "15 Mark V", "16 Rockerverb",
  "17 Engl Power", "18 Diezel VH4", "19 Acoustic Sim", "20 Clean Bass"
]

export const DEFAULT_CAB_NAMES = [
  "1 1960A 4x12 V30", "2 Greenback 4x12", "3 Recto 4x12 OS", "4 Bogner 2x12",
  "5 Twin 2x12 Jensen", "6 AC30 2x12 Blue", "7 Deluxe 1x12 Ox", "8 Bassman 4x10",
  "9 Orange 4x12", "10 Friedman 4x12", "11 Mesa 2x12", "12 EVH 5150 4x12",
  "13 Marshall 1936", "14 Custom 1x12", "15 Port City 2x12", "16 Ampeg 8x10",
  "17 Acoustic 1x15", "18 Studio Cab 1", "19 Studio Cab 2", "20 Flat Response"
]

export const BLOCKS = [
  {
    id: 0,
    key: 'fx',
    name: 'FX / GATE',
    color: '#e67e22',
    toggleAddr: 0x08,
    modelAddr: 0x0E,
    knobBase: 0x14,
    models: ['Noise Gate++', 'Boost', 'Compress', 'AI Gate MS'],
    knobs: [
      ['Gate', GHOST, GHOST, GHOST, GHOST, GHOST],
      ['Gate', 'Gain', GHOST, GHOST, GHOST, GHOST],
      ['Gate', 'Sustain', 'Attack', 'Level', GHOST, GHOST],
      ['Gate', 'Bias', GHOST, GHOST, GHOST, GHOST],
    ],
  },
  {
    id: 1,
    key: 'amp',
    name: 'AMP (NAM)',
    color: '#e74c3c',
    toggleAddr: 0x09,
    modelAddr: 0x0F,
    knobBase: 0x20,
    models: DEFAULT_AMP_NAMES,
    isDynamic: false,
    knobs: [
      ['Gain', 'Level', 'Bass', 'Mid', 'Treble', GHOST],
    ],
  },
  {
    id: 2,
    key: 'mod',
    name: 'MODULATION',
    color: '#3498db',
    toggleAddr: 0x0A,
    modelAddr: 0x10,
    knobBase: 0x2C,
    models: ['Chorus', 'Phaser', 'Tremolo', 'Flanger', 'Vibrato', 'Univibe', 'Autofilter'],
    knobs: [
      ['Speed', 'Depth', 'Mix', GHOST, GHOST, GHOST],
      ['Speed', 'Midcut', 'Reso', 'Feedback', GHOST, GHOST],
      ['Speed', 'Depth', 'Level', GHOST, GHOST, GHOST],
      ['Speed', 'Depth', 'Feedback', 'Mix', GHOST, GHOST],
      ['Speed', 'Depth', GHOST, GHOST, GHOST, GHOST],
      ['Speed', 'Depth', 'Mix', GHOST, GHOST, GHOST],
      ['Speed', 'Min', 'Max', 'Mix', 'Feedback', GHOST],
    ],
  },
  {
    id: 3,
    key: 'dly',
    name: 'DELAY',
    color: '#9b59b6',
    toggleAddr: 0x0B,
    modelAddr: 0x11,
    knobBase: 0x38,
    models: ['Analog', 'Duck', 'Dtape', 'Dual', 'Lofi'],
    knobs: [
      ['Time', 'Feedback', 'Mix', 'Phaser', 'Pitch', GHOST],
      ['Time', 'Feedback', 'Mix', 'Unpack', 'Speed', 'Depth'],
      ['Time', 'Feedback', 'Mix', 'Grit', 'Speed', 'Depth'],
      ['Time', 'Feedback', 'Mix', 'T-Mode', 'Speed', 'Depth'],
      ['Time', 'Feedback', 'Mix', 'Grit', 'Speed', 'Depth'],
    ],
  },
  {
    id: 4,
    key: 'rev',
    name: 'REVERB',
    color: '#1abc9c',
    toggleAddr: 0x0C,
    modelAddr: 0x12,
    knobBase: 0x44,
    models: ['Room', 'Hall', 'Swell', 'Spring', 'Shimmer', 'Cloud'],
    knobs: [
      ['Decay', 'Mix', 'High Pass', 'Low Pass', 'Depth', GHOST],
      ['Decay', 'Mix', 'High Pass', 'Low Pass', 'Depth', GHOST],
      ['Decay', 'Mix', 'High Pass', 'Low Pass', 'Rise-T', GHOST],
      ['Decay', 'Mix', 'High Pass', 'Low Pass', 'Combs', GHOST],
      ['Decay', 'Mix', 'Tone', 'Pitch', 'Amount', GHOST],
      ['Decay', 'Mix', 'High Pass', 'Low Pass', 'Diffusion', GHOST],
    ],
  },
  {
    id: 5,
    key: 'cab',
    name: 'CAB / IR',
    color: '#f1c40f',
    toggleAddr: 0x0D,
    modelAddr: 0x13,
    knobBase: 0x50,
    models: DEFAULT_CAB_NAMES,
    isDynamic: false,
    knobs: [
      ['Level', 'Low Cut', 'High Cut', GHOST, GHOST, GHOST],
    ],
  },
]
