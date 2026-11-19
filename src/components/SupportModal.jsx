import React, { useState } from 'react'

export function SupportModal({ isOpen, onClose }) {
  const [copiedPix, setCopiedPix] = useState(false)

  if (!isOpen) return null

  const pixKey = 'yanjob.dev@gmail.com'

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixKey)
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2500)
    } catch {
      alert(`Chave Pix: ${pixKey}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="bg-[#141416] border-t-4 border-[#d9822b] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 px-2.5 py-1 bg-[#1e1e22] hover:bg-[#2a2a30] text-[#f2efe9] font-display text-lg transition"
          aria-label="Fechar"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-5 mr-10">
          <h2 className="font-display text-3xl text-[#f2efe9]">
            SOBRE & <span className="text-[#e5a93c]">CONTRIBUIÇÃO</span>
          </h2>
          <p className="text-xs text-[#9a968e] mt-1">
            Projeto independente e gratuito de código aberto criado por{' '}
            <strong className="text-[#f2efe9]">Gabriel Yan (@gabrielyandev)</strong>.
          </p>
        </div>

        {/* Block 1: Coffee / Pix Support */}
        <div className="bg-[#1e1e22] border-t-2 border-[#d9822b] p-4 mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#d9822b] shrink-0" aria-hidden="true">
              <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="currentColor" />
              <path
                d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2.5M12 3.5v2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <h3 className="font-display text-2xl text-[#f2efe9]">
              ME PAGUE UM CAFÉ (PIX)
            </h3>
          </div>
          <p className="text-xs text-[#9a968e] mb-3">
            O BlackBox Editor é gratuito e sem anúncios. Seu apoio ajuda a manter o projeto vivo e trazer novos recursos.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 bg-[#060607] px-3.5 h-11 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#9a968e] mr-2">PIX</span>
              <code className="text-sm font-mono font-semibold text-[#f2efe9] select-all truncate">
                {pixKey}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopyPix}
              className={`h-11 px-5 font-bold text-xs uppercase tracking-wider transition shrink-0 ${
                copiedPix
                  ? 'bg-[#e5a93c] text-[#120902]'
                  : 'bg-[#d9822b] hover:bg-[#e8953f] text-[#120902]'
              }`}
            >
              {copiedPix ? 'COPIADO!' : 'COPIAR CHAVE PIX'}
            </button>
          </div>
        </div>

        {/* Block 2: Contribute on GitHub */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <a
            href="https://github.com/gabrielyandev/boxblackweb"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1e1e22] hover:bg-[#2a2a30] border-t-2 border-[#e5a93c] p-4 flex flex-col justify-between gap-3 transition"
          >
            <div>
              <h3 className="font-display text-xl text-[#e5a93c]">
                REPOSITÓRIO & STAR
              </h3>
              <p className="text-xs text-[#9a968e] mt-1">
                Deixe uma Star no GitHub ou envie um Pull Request com melhorias.
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase text-[#f2efe9] underline underline-offset-4">
              GITHUB ↗
            </span>
          </a>

          <a
            href="https://github.com/gabrielyandev/boxblackweb/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1e1e22] hover:bg-[#2a2a30] border-t-2 border-[#d96b27] p-4 flex flex-col justify-between gap-3 transition"
          >
            <div>
              <h3 className="font-display text-xl text-[#d96b27]">
                REPORTAR BUG / IDEIA
              </h3>
              <p className="text-xs text-[#9a968e] mt-1">
                Encontrou algum erro na v23 ou quer sugerir uma função? Abra uma issue.
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase text-[#f2efe9] underline underline-offset-4">
              ABRIR ISSUE ↗
            </span>
          </a>

          <a
            href="https://github.com/gabrielyandev"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1e1e22] hover:bg-[#2a2a30] border-t-2 border-[#c99738] p-4 flex flex-col justify-between gap-3 transition"
          >
            <div>
              <h3 className="font-display text-xl text-[#c99738]">
                AUTOR
              </h3>
              <p className="text-xs text-[#9a968e] mt-1">
                Gabriel Yan (@gabrielyandev) · Desenvolvedor de Software.
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase text-[#f2efe9] underline underline-offset-4">
              PERFIL ↗
            </span>
          </a>
        </div>

        {/* Block 3: Technical Credits & Legal Disclaimer */}
        <div className="bg-[#060607] p-3 text-xs text-[#9a968e] space-y-1">
          <p>
            Desenvolvimento e interface:{' '}
            <span className="text-[#f2efe9] font-semibold">Gabriel Yan (@gabrielyandev)</span>.
            Documentação de protocolo BLE/SysEx da comunidade: Joel Victor (jvsobrinho) e mendong (blackboxctl).
          </p>
          <p className="opacity-70">
            Projeto independente, sem vínculo oficial com a M-VAVE.
          </p>
        </div>
      </div>
    </div>
  )
}
