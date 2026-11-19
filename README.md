# M-VAVE BlackBox Web Editor (Linux / Web BLE & USB MIDI)

Editor Web moderno de código aberto para a pedaleira **M-VAVE ANN BlackBox**, desenvolvido em **React + Vite + Tailwind CSS** para funcionar diretamente no navegador no **Linux** (e também no Windows e macOS).

Pronto para deploy com 1 clique na **Vercel** ou **GitHub Pages**.

---

## 🎸 Funcionalidades

* **Conexão Híbrida (100% no Navegador):**
  * **Bluetooth (Web Bluetooth API):** Conecta via BLE ao serviço GATT proprietário da BlackBox (`ae40`) sem instalar drivers.
  * **Cabo USB (Web MIDI API):** Conecta via USB usando mensagens SysEx com compactação contínua **Base-128 (8-para-7 bits)**.
* **Ajuste em Tempo Real (Live RAM):**
  * Controle de knobs rotativos com rotação realista, sensibilidade vertical e suporte a scroll de mouse.
  * Chaves On/Off (Bypass) com LED brilhante para cada pedal.
  * Troca dinâmica de algoritmos/modelos (Noise Gate, Overdrive, Modulações, Delays, Reverbs, Amps NAM e IRs).
* **Roteamento de Sinal (Signal Chain):**
  * Visualize e reordene a ordem dos pedais na cadeia em tempo real (`FX -> AMP -> CAB -> MOD -> DLY -> REV`).
* **Gerenciamento de Presets:**
  * Navegação rápida pelos slots **P01 a P80**.
  * **Salvar no Pedal:** Gravação permanente direta na memória Flash do aparelho.
  * **Backup & Restore JSON:** Exporte seus timbres favoritos para compartilhar ou arquivar no computador.

---

## 🐧 Configuração Rápida no Linux

Para acessar o USB MIDI e o Bluetooth sem restrições de permissão no Linux:

1. **Permissão de Áudio/MIDI (Cabo USB):**
   ```bash
   sudo usermod -aG audio $USER
   ```
   *(Faça logoff e logon novamente para aplicar)*.

2. **Navegador recomendado:**
   * Google Chrome, Chromium, Brave ou Microsoft Edge (com suporte a Web Bluetooth e Web MIDI).

---

## 🚀 Rodando Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Compilar para produção
npm run build
```

---

## ☁️ Hospedagem na Vercel

O projeto já possui `vercel.json` pré-configurado:

### Opção 1: Pelo GitHub (Recomendado)
1. Suba esta pasta para um repositório no seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"**.
3. Importe o repositório. A Vercel detectará automaticamente o **Vite**, o comando `npm run build` e a pasta de saída `dist`.
4. Clique em **Deploy**.

### Opção 2: Pela CLI da Vercel
```bash
npx vercel
```

---

## 📚 Créditos do Protocolo

Este projeto utiliza as especificações de protocolo reversas desenvolvidas pela comunidade:
* **Joel Victor (`jvsobrinho`)**: Mapeamento do túnel BLE `ae40` e documentação de memória.
* **`mendong/blackboxctl`**: Codec Base-128 e validação de checksums.
