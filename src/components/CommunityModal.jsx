import React, { useState } from 'react'
import {
  X,
  Compass,
  Search,
  ExternalLink,
  Download,
  Layers,
  Sparkles,
  FileAudio,
  Radio,
  CheckCircle2,
} from 'lucide-react'

// Curated popular community NAM models and IRs
const POPULAR_COMMUNITY_MODELS = [
  {
    id: 'jcm800-kk',
    name: 'Marshall JCM800 2203',
    author: 'GuitarOrPoo',
    category: 'High Gain',
    type: 'Amp (DI)',
    description: 'Clássico timbre britânico hard rock dos anos 80, modificado para mais ganho.',
    tone3000Url: 'https://tone3000.com/search?q=JCM800',
    tags: ['Marshall', 'British', 'Rock', '80s'],
  },
  {
    id: '5150-block',
    name: 'Peavey 5150 Block Letter',
    author: 'AmpsNThings',
    category: 'High Gain',
    type: 'Amp (DI)',
    description: 'O padrão da indústria para metal moderno, chug pesado e médios cortantes.',
    tone3000Url: 'https://tone3000.com/search?q=5150',
    tags: ['Peavey', 'Metal', 'Drop D', 'Lead'],
  },
  {
    id: 'fender-twin-65',
    name: 'Fender 65 Twin Reverb',
    author: 'VintageAudioLab',
    category: 'Clean',
    type: 'Amp + Cab',
    description: 'Som limpo cristalino com headroom infinito, ideal para pedais e worship.',
    tone3000Url: 'https://tone3000.com/search?q=Twin+Reverb',
    tags: ['Fender', 'Clean', 'Pedal Platform', '60s'],
  },
  {
    id: 'mesa-dual-recto',
    name: 'Mesa Boogie Dual Rectifier',
    author: 'HeavyTonez',
    category: 'High Gain',
    type: 'Amp (DI)',
    description: 'Graves imponentes e distorção agressiva para nu-metal e post-grunge.',
    tone3000Url: 'https://tone3000.com/search?q=Dual+Rectifier',
    tags: ['Mesa', 'Metal', 'Modern', 'Heavy'],
  },
  {
    id: 'friedman-be100',
    name: 'Friedman BE-100 Deluxe',
    author: 'BrownSoundLab',
    category: 'Crunch',
    type: 'Amp + Cab',
    description: 'Evolução moderna do som Plexi britânico com ganho orgânico e dinâmico.',
    tone3000Url: 'https://tone3000.com/search?q=Friedman+BE100',
    tags: ['Friedman', 'Brown Sound', 'Lead', 'Boutique'],
  },
  {
    id: 'dumble-ods',
    name: 'Dumble Overdrive Special',
    author: 'ToneChaser',
    category: 'Crunch',
    type: 'Amp (DI)',
    description: 'Sustain suave estilo violoncelo, harmônicos ricos e resposta dinâmica lendária.',
    tone3000Url: 'https://tone3000.com/search?q=Dumble',
    tags: ['Dumble', 'Blues', 'Fusion', 'Rare'],
  },
  {
    id: 'matchless-dc30',
    name: 'Matchless DC-30',
    author: 'ChimeMaster',
    category: 'Clean',
    type: 'Amp + Cab',
    description: 'Brilho e presença estilo Class-A Vox el84 com graves firmes.',
    tone3000Url: 'https://tone3000.com/search?q=Matchless',
    tags: ['Matchless', 'Chime', 'Indie', 'Worship'],
  },
  {
    id: 'soldano-slo100',
    name: 'Soldano SLO-100 Super Lead',
    author: 'SonicForge',
    category: 'High Gain',
    type: 'Amp (DI)',
    description: 'Sustain líquido para solos e ataque percussivo para bases pesadas.',
    tone3000Url: 'https://tone3000.com/search?q=SLO100',
    tags: ['Soldano', 'Lead', 'High Gain', 'Rock'],
  },
  {
    id: 'ampeg-svt-cl',
    name: 'Ampeg SVT Classic (Bass)',
    author: 'LowEndKing',
    category: 'Bass',
    type: 'Amp + Cab',
    description: 'A referência absoluta para contrabaixo. Punch, peso e saturação valvulada.',
    tone3000Url: 'https://tone3000.com/search?q=Ampeg+SVT',
    tags: ['Bass', 'Ampeg', 'SVT', 'Low End'],
  },
  {
    id: 'ir-mesa-v30',
    name: 'Mesa 4x12 OS Celestion V30 (IR)',
    author: 'CabIRArchive',
    category: 'Cab IR',
    type: 'IR (44.1k/24b)',
    description: 'O clássico gabinete com microfonação SM57 + Royer R121 pronta para gravação.',
    tone3000Url: 'https://tone3000.com/search?q=Mesa+V30+IR',
    tags: ['Cab', 'Celestion', 'V30', 'Impulse Response'],
  },
  {
    id: 'ir-greenback-71',
    name: 'Marshall 1960A Greenback (IR)',
    author: 'VintageIRs',
    category: 'Cab IR',
    type: 'IR (44.1k/24b)',
    description: 'Médios aveludados e agudos doces para timbres clássicos de rock e blues.',
    tone3000Url: 'https://tone3000.com/search?q=Greenback+IR',
    tags: ['Cab', 'Greenback', 'Vintage', 'Marshall'],
  },
]

export function CommunityModal({
  isOpen,
  onClose,
  ampNames = [],
  cabNames = [],
  onSelectSlotModel,
}) {
  const [activeTab, setActiveTab] = useState('explore') // 'explore' | 'slots'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [selectedSlotType, setSelectedSlotType] = useState('amp') // 'amp' | 'cab'

  if (!isOpen) return null

  const categories = ['Todos', 'High Gain', 'Crunch', 'Clean', 'Bass', 'Cab IR']

  const filteredModels = POPULAR_COMMUNITY_MODELS.filter((item) => {
    const matchesCategory =
      selectedCategory === 'Todos' || item.category === selectedCategory
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#121418] border border-neutral-700 w-full max-w-4xl max-h-[90vh] rounded-2xl p-5 shadow-2xl relative flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X size={18} />
        </button>

        {/* Header & Tabs */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80 mr-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Compass size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-100 flex items-center gap-2">
                Tone3000 & Comunidade NAM
                <span className="text-[9px] font-mono font-bold bg-neutral-800 text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700">
                  HUB
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Explore modelos de amplificadores e gabinetes da comunidade oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeTab === 'explore'
                  ? 'bg-neutral-800 text-amber-400 shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Explorar Timbres
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeTab === 'slots'
                  ? 'bg-neutral-800 text-amber-400 shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Slots da BlackBox
            </button>
          </div>
        </div>

        {/* Tab 1: Explore Tone3000 & Community */}
        {activeTab === 'explore' && (
          <div className="flex-1 flex flex-col min-h-0 pt-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
              <div className="relative w-full sm:flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="text"
                  placeholder="Buscar modelo (ex: JCM800, 5150, Fender, Mesa, V30)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-black'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Models Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
              {filteredModels.map((item) => (
                <div
                  key={item.id}
                  className="bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                          {item.name}
                        </h3>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          por {item.author}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-amber-400 border border-neutral-700 whitespace-nowrap">
                        {item.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-300 mt-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] font-medium bg-neutral-950 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-neutral-500">
                      {item.category}
                    </span>
                    <a
                      href={item.tone3000Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition"
                    >
                      <span>Abrir no Tone3000</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Tone3000 Catalog Link */}
            <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-400 text-[11px]">
                Mais de 100.000 perfis NAM e IRs gratuitos disponíveis na biblioteca oficial Tone3000.
              </span>
              <a
                href="https://tone3000.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold"
              >
                <span>Acessar Tone3000.com</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: BlackBox Hardware Slots Manager */}
        {activeTab === 'slots' && (
          <div className="flex-1 flex flex-col min-h-0 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSlotType('amp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedSlotType === 'amp'
                      ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400'
                  }`}
                >
                  Slots de AMP (NAM) [1 a 20]
                </button>
                <button
                  onClick={() => setSelectedSlotType('cab')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedSlotType === 'cab'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400'
                  }`}
                >
                  Slots de CAB (IR) [1 a 20]
                </button>
              </div>

              <span className="text-[11px] font-mono text-neutral-400">
                Memória Flash BlackBox v23
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 min-h-0">
              {(selectedSlotType === 'amp' ? ampNames : cabNames).map((name, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-mono font-bold text-amber-500 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-medium text-neutral-200 truncate">
                      {name}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs text-neutral-300 space-y-1">
              <div className="font-bold text-neutral-100 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Como transferir os arquivos .nam ou .wav baixados para a BlackBox v23:
              </div>
              <p className="text-[11px] text-neutral-400">
                1. Baixe o arquivo <code>.nam</code> (Neural Amp) ou <code>.wav</code> (IR 44.1kHz 24-bit) no Tone3000.
              </p>
              <p className="text-[11px] text-neutral-400">
                2. No app M-EFCS ou via cabo USB, selecione o slot de destino (1 a 20) e envie o arquivo.
              </p>
              <p className="text-[11px] text-neutral-400">
                3. Clique em <strong>Sincronizar</strong> neste editor e os nomes dos novos modelos serão lidos da Flash instantaneamente!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

