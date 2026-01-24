import fs from 'fs'
import path from 'path'
import pino from 'pino'
import chalk from 'chalk'
import qrcode from 'qrcode'
import NodeCache from 'node-cache'
import { fileURLToPath } from 'url'

import {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys'

import { makeWASocket } from '../lib/simple.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ───── GLOBAL SUBBOTS ───── */
global.conns ||= []

const isSubBotConnected = jid =>
  global.conns.some(
    sock => sock?.user?.jid?.split('@')[0] === jid.split('@')[0]
  )

/* ───── HANDLER ───── */
let handler = async (m, { conn, args, usedPrefix, command }) => {
  const id = m.sender.split('@')[0]
  const base = path.join(__dirname, '../jadibot', id)

  fs.mkdirSync(base, { recursive: true })

  yukiJadiBot({
    pathSession: base,
    m,
    conn,
    args,
    usedPrefix,
    command
  })
}

handler.help = ['qr', 'code']
handler.tags = ['serbot']
handler.command = ['qr', 'code']

export default handler

/* ───── JADIBOT ───── */
async function yukiJadiBot({ pathSession, m, conn, args, command }) {
  const useCode = args.includes('code')

  const { state, saveCreds } =
    await useMultiFileAuthState(pathSession)

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'silent' })
      )
    },
    browser: ['Android', 'Chrome', '13'],
    version,
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async update => {
    const { connection, qr, lastDisconnect } = update

    if (qr && !useCode) {
      const img = await qrcode.toBuffer(qr, { scale: 8 })
      await conn.sendMessage(
        m.chat,
        { image: img, caption: '📱 Escanea este QR (45s)' },
        { quoted: m }
      )
    }

    if (qr && useCode) {
      const code = await sock.requestPairingCode(
        m.sender.split('@')[0]
      )
      await conn.reply(
        m.chat,
        `🔑 Código:\n${code.match(/.{1,4}/g).join('-')}`,
        m
      )
    }

    if (connection === 'open') {
      global.conns.push(sock)

      await conn.sendMessage(
        m.chat,
        {
          text: isSubBotConnected(m.sender)
            ? '⚠️ Ya estás conectado'
            : '✅ Sub-Bot conectado correctamente'
        },
        { quoted: m }
      )

      console.log(
        chalk.green(
          `[SUBBOT] ${sock.user?.jid} conectado`
        )
      )
    }

    if (connection === 'close') {
      const reason =
        lastDisconnect?.error?.output?.statusCode

      if (reason !== DisconnectReason.loggedOut) {
        try { sock.ws.close() } catch {}
      }

      global.conns = global.conns.filter(
        s => s !== sock
      )

      console.log(
        chalk.red(
          `[SUBBOT] Sesión cerrada (${reason})`
        )
      )
    }
  })
}