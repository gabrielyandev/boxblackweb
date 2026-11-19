import React, { useState } from 'react'

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
}) {
  const [activeTab, setActiveTab] = useState('explore') // 'explore' | 'slots'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [selectedSlotType, setSelectedSlotType] = useState('amp') // 'amp' | 'cab'

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041011]/85 p-4">
      <div className="bg-[#0e2828] border-t-4 border-[#e3b862] w-full max-w-4xl max-h-[88vh] p-5 relative flex flex-col overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#133332] hover:bg-[#1b4544] text-[#eaf0ea] font-display text-lg transition"
        >
          ✕
        </button>

        {/* Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mr-10">
          <h2 className="font-display text-3xl text-[#eaf0ea]">
            TONE<span className="text-[#63e0f5]">3000</span> & SLOTS NAM
          </h2>

          <div className="flex items-center gap-1 bg-[#050f10] p-1">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'explore'
                  ? 'bg-[#e3b862] text-[#231a06]'
                  : 'text-[#a9c0bc] hover:text-[#eaf0ea]'
              }`}
            >
              TONE3000
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'slots'
                  ? 'bg-[#e3b862] text-[#231a06]'
                  : 'text-[#a9c0bc] hover:text-[#eaf0ea]'
              }`}
            >
              SLOTS FLASH (20)
            </button>
          </div>
        </div>

        {/* Tab 1: Tone3000 Directory */}
        {activeTab === 'explore' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="Filtrar (JCM800, 5150, Fender, V30...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-[#050f10] text-[#eaf0ea] placeholder-[#6f8a87] text-sm font-semibold px-3 h-10 border-0 focus:outline focus:outline-2 focus:outline-[#e3b862]"
              />

              <div className="flex items-center gap-1 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 h-10 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-[#63e0f5] text-[#04191a]'
                        : 'bg-[#133332] text-[#a9c0bc] hover:text-[#eaf0ea]'
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
                  className="bg-[#133332] p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-display text-xl text-[#eaf0ea] truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#a9c0bc] mt-0.5 flex items-center gap-2">
                      <span>{item.author}</span>
                      <span>·</span>
                      <span className="text-[#63e0f5] font-semibold">{item.type}</span>
                    </div>
                  </div>

                  <a
                    href={item.tone3000Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#e3b862] hover:bg-[#f0c97a] text-[#231a06] font-bold text-xs uppercase px-3 py-2 shrink-0 transition"
                  >
                    TONE3000 ↗
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 bg-[#050f10] px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-[#a9c0bc]">CATÁLOGO COMPLETO</span>
              <a
                href="https://tone3000.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#e3b862] hover:underline font-bold uppercase"
              >
                TONE3000.COM ↗
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: Flash Slots Grid */}
        {activeTab === 'slots' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setSelectedSlotType('amp')}
                className={`px-4 h-10 text-xs font-bold uppercase tracking-wider transition ${
                  selectedSlotType === 'amp'
                    ? 'bg-[#d9a441] text-[#071011]'
                    : 'bg-[#133332] text-[#a9c0bc]'
                }`}
              >
                AMP · NAM (1–20)
              </button>
              <button
                onClick={() => setSelectedSlotType('cab')}
                className={`px-4 h-10 text-xs font-bold uppercase tracking-wider transition ${
                  selectedSlotType === 'cab'
                    ? 'bg-[#c8743a] text-[#071011]'
                    : 'bg-[#133332] text-[#a9c0bc]'
                }`}
              >
                CAB · IR (1–20)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5 min-h-0">
              {(selectedSlotType === 'amp' ? ampNames : cabNames).map((name, idx) => (
                <div
                  key={idx}
                  className="bg-[#050f10] px-3 py-2.5 flex items-center gap-2.5"
                >
                  <span className="font-display text-lg text-[#e3b862] tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-semibold text-[#eaf0ea] truncate">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
