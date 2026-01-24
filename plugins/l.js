import fs from 'fs'
import path from 'path'
import pino from 'pino'
import chalk from 'chalk'
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

global.conns ||= []

let handler = async (m, { conn }) => {
  const id = m.sender.split('@')[0]
  const sessionPath = path.join(__dirname, '../jadibot', id)

  if (fs.existsSync(path.join(sessionPath, 'creds.json'))) {
    return conn.reply(m.chat, '⚠️ Ya tienes una sesión activa', m)
  }

  fs.mkdirSync(sessionPath, { recursive: true })

  startSubBot(sessionPath, m, conn)
}

handler.help = ['code']
handler.tags = ['serbot']
handler.command = ['code']

export default handler

async function startSubBot(sessionPath, m, conn) {
  const { state, saveCreds } =
    await useMultiFileAuthState(sessionPath)

  const { version } =
    await fetchLatestBaileysVersion()

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

  let codeSent = false

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update

    if (
      connection === 'open' &&
      !sock.authState.creds.registered &&
      !codeSent
    ) {
      codeSent = true

      const code = await sock.requestPairingCode(
        m.sender.split('@')[0]
      )

      await conn.reply(
        m.chat,
        `🔐 Código de vinculación\n\n${code.match(/.{1,4}/g).join('-')}`,
        m
      )
    }

    if (connection === 'open' && sock.authState.creds.registered) {
      global.conns.push(sock)

      await conn.reply(
        m.chat,
        '✅ Sub-Bot conectado correctamente',
        m
      )

      console.log(
        chalk.green(`[SUBBOT] ${sock.user.jid} conectado`)
      )
    }

    if (connection === 'close') {
      global.conns = global.conns.filter(s => s !== sock)

      const reason =
        lastDisconnect?.error?.output?.statusCode

      if (reason !== DisconnectReason.loggedOut) {
        try { sock.ws.close() } catch {}
      }

      console.log(
        chalk.red('[SUBBOT] Sesión cerrada')
      )
    }
  })
}