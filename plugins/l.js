import { useMultiFileAuthState, makeWASocket, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

let handler = async (m, { conn }) => {
  let id = m.sender.split('@')[0]

  let sessionPath = path.join('./sessions', id)
  if (fs.existsSync(sessionPath)) {
    return m.reply('⚠️ Ya existe una sesión activa para este número')
  }

  await m.reply('⏳ Generando código de vinculación...')

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  let code = await sock.requestPairingCode(id)

  await conn.sendMessage(m.chat, {
    text: `🔐 *CÓDIGO DE VINCULACIÓN*\n\n📱 Número: ${id}\n\n🧾 Código:\n${code}\n\n⏱ Válido por unos minutos`
  })
}

handler.help = ['code']
handler.tags = ['serbot']
handler.command = ['code']

export default handler