import fs from 'fs'
import path from 'path'
import NodeCache from 'node-cache'
import pino from 'pino'
import {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import { makeWASocket } from '../lib/simple.js'

if (!global.conns) global.conns = []

const handler = async (m, { conn }) => {
  const id = m.sender.split('@')[0]
  const sessionPath = path.join('./jadibot', id)

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true })
  }

  await startSubBot(m, conn, sessionPath)
}

handler.command = ['code']
handler.tags = ['serbot']
handler.help = ['code']
export default handler

async function startSubBot(m, conn, sessionPath) {
  const { version } = await fetchLatestBaileysVersion()
  const msgRetryCounterCache = new NodeCache()

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Android', 'Chrome', '13'],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'fatal' })
      )
    },
    syncFullHistory: false,
    msgRetryCounterCache,
    version
  })

  sock.ev.on('creds.update', saveCreds)

  if (!state.creds.registered) {
    try {
      await delay(1500)
      let code = await sock.requestPairingCode(id)
      code = code.match(/.{1,4}/g).join('-')

      await conn.sendMessage(
        m.chat,
        {
          text:
            '❐ Vinculación por código\n\n' +
            'Ingresa este código en *Dispositivos vinculados*\n\n' +
            'Código:\n\n' +
            code +
            '\n\n⏱ Expira en 1 minuto'
        },
        { quoted: m }
      )
    } catch (e) {
      await m.reply('⚠️ No se pudo generar el código.')
      return
    }
  }

  sock.ev.on('connection.update', (update) => {
    const { connection } = update

    if (connection === 'open') {
      global.conns.push(sock)

      conn.sendMessage(
        m.chat,
        {
          text:
            '✅ *Sub-Bot vinculado correctamente*\n\n' +
            '@' + id,
          mentions: [m.sender]
        },
        { quoted: m }
      )
    }

    if (connection === 'close') {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true })
      } catch {}
    }
  })
}

const delay = ms => new Promise(r => setTimeout(r, ms))