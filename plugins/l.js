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

let handler = async (m) => {
  const id = m.sender.split('@')[0]
  const sessionPath = path.join(__dirname, '../jadibot', id)

  if (fs.existsSync(path.join(sessionPath, 'creds.json'))) {
    return m.reply('⚠️ Ya tienes una sesión activa')
  }

  fs.mkdirSync(sessionPath, { recursive: true })

  startSubBot(sessionPath)
}

handler.help = ['code']
handler.tags = ['serbot']
handler.command = ['code']

export default handler

async function startSubBot(sessionPath) {
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
        sock.user.id.split('@')[0]
      )
      await global.conn.sendMessage(
        global.conn.user.id,
        { text: `🔐 Código de vinculación\n\n${code.match(/.{1,4}/g).join('-')}` }
      )
    }

    if (connection === 'open' && sock.authState.creds.registered) {
      global.conns.push(sock)
      console.log(chalk.green(`[SUBBOT] ${sock.user.jid} conectado`))
    }

    if (connection === 'close') {
      global.conns = global.conns.filter(s => s !== sock)
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        try { sock.ws.close() } catch {}
      }
      console.log(chalk.red('[SUBBOT] Sesión cerrada'))
    }
  })

  sock.ev.on('messages.upsert', async chatUpdate => {
    global.conn.ev.emit('messages.upsert', chatUpdate)
  })
}