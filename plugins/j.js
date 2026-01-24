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

const handler = async (m, { conn, command }) => {
  if (command !== 'code') return

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

  setTimeout(() => {
    if (!sock.user) {
      try { fs.rmSync(sessionPath, { recursive: true, force: true }) } catch {}
      try { sock.ws.close() } catch {}
      sock.ev.removeAllListeners()
      const i = global.conns.indexOf(sock)
      if (i >= 0) global.conns.splice(i, 1)
    }
  }, 60000)

  sock.ev.on('connection.update', async (update) => {
    const { connection } = update

    if (!sock.user && connection === 'connecting') {
      try {
        await delay(2000)
        let code = await sock.requestPairingCode(
          m.sender.split('@')[0]
        )
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
      }
    }

    if (connection === 'open') {
      global.conns.push(sock)

      await conn.sendMessage(
        m.chat,
        {
          text:
            '✅ *Sub-Bot vinculado correctamente*\n\n' +
            '@' + m.sender.split('@')[0],
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

  sock.ev.on('creds.update', saveCreds)
}

const delay = ms => new Promise(r => setTimeout(r, ms))