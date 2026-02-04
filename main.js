import './config.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import NodeCache from 'node-cache'
import yargs from 'yargs'

import * as baileys from '@whiskeysockets/baileys'
import store from './lib/store.js'

const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} = baileys

const __dirname = path.dirname(fileURLToPath(import.meta.url))

global.opts = yargs(process.argv.slice(2)).exitProcess(false).parse()
global.prefixes = Object.freeze(['.', '!', '#', '/'])

const sessions = global.sessions || 'sessions'
const { state, saveCreds } = await useMultiFileAuthState(sessions)
const { version } = await fetchLatestBaileysVersion()

const msgRetryCounterCache = new NodeCache()
const userDevicesCache = new NodeCache()

const conn = makeWASocket({
  logger: pino({ level: 'fatal' }),
  printQRInTerminal: false,
  browser: ['Android', 'Chrome', '13'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
  },
  markOnlineOnConnect: false,
  syncFullHistory: false,
  generateHighQualityLinkPreview: false,
  getMessage: async key => {
    try {
      const jid = jidNormalizedUser(key.remoteJid)
      const msg = await store.loadMessage(jid, key.id)
      return msg?.message || ''
    } catch {
      return ''
    }
  },
  msgRetryCounterCache,
  userDevicesCache,
  version,
  keepAliveIntervalMs: 60000
})

global.conn = conn

if (!fs.existsSync(`./${sessions}/creds.json`)) {
  const phone = String(global.botNumber || '').replace(/\D/g, '')
  if (!phone) {
    console.error('Falta global.botNumber')
    process.exit(1)
  }
  const code = await conn.requestPairingCode(phone)
  console.log(`Ingresa este código en el número global: ${code.match(/.{1,4}/g).join(' ')}`)
}

let handler = await import('./handler.js')
let isInit = true

async function connectionUpdate(update) {
  const { connection, lastDisconnect } = update
  const reason = lastDisconnect?.error?.output?.statusCode

  if (connection === 'open') {
    const restarterFile = './lastRestarter.json'
    if (fs.existsSync(restarterFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(restarterFile, 'utf-8'))
        if (data?.chatId && data?.key) {
          await conn.sendMessage(
            data.chatId,
            {
              text: `✅ *${global.namebot} está en línea nuevamente* 🚀`,
              edit: data.key
            }
          )
        }
        fs.unlinkSync(restarterFile)
      } catch {}
    }
  }

  if (connection === 'close') {
    if (reason !== DisconnectReason.loggedOut) {
      try {
        conn.ev.removeAllListeners()
      } catch {}
      await reloadHandler(true)
    }
  }
}

async function reloadHandler() {
  try {
    const mod = await import(`./handler.js?update=${Date.now()}`)
    handler = mod
  } catch {}

  if (!isInit) {
    conn.ev.removeAllListeners('messages.upsert')
    conn.ev.removeAllListeners('connection.update')
    conn.ev.removeAllListeners('creds.update')
  }

  conn.handler = handler.handler.bind(conn)
  conn.connectionUpdate = connectionUpdate.bind(conn)
  conn.credsUpdate = saveCreds.bind(conn)

  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    const msg = messages[0]
    if (!msg) return
    if (!msg.message) return
    if (msg.key.fromMe) return

    const jid = msg.key.remoteJid
    if (jid === 'status@broadcast') return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''

    if (!global.prefixes.some(p => text.startsWith(p))) return

    try {
      await conn.handler({ messages: [msg] })
    } catch {}
  })

  conn.ev.on('connection.update', conn.connectionUpdate)
  conn.ev.on('creds.update', conn.credsUpdate)

  isInit = false
}

await reloadHandler()

const pluginRoot = path.join(__dirname, 'plugins')
global.plugins = {}

async function loadPlugins(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    if (!f.endsWith('.js')) continue
    try {
      const m = await import(`${full}?update=${Date.now()}`)
      global.plugins[full] = m.default || m
    } catch {}
  }
}

await loadPlugins(pluginRoot)

const reloadTimers = new Map()

fs.watch(pluginRoot, (_, file) => {
  if (!file?.endsWith('.js')) return
  const full = path.join(pluginRoot, file)
  clearTimeout(reloadTimers.get(full))
  reloadTimers.set(
    full,
    setTimeout(async () => {
      if (!fs.existsSync(full)) {
        delete global.plugins[full]
        return
      }
      try {
        const m = await import(`${full}?update=${Date.now()}`)
        global.plugins[full] = m.default || m
      } catch {}
    }, 150)
  )
})

process.on('uncaughtException', () => {})