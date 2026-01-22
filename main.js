import './config.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'
import NodeCache from 'node-cache'
import chalk from 'chalk'
import pino from 'pino'
import yargs from 'yargs'
import syntaxerror from 'syntax-error'

import { makeWASocket } from './lib/simple.js'
import store from './lib/store.js'

import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg

const {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  Browsers
} = await import('@whiskeysockets/baileys')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const phoneUtil = PhoneNumberUtil.getInstance()

global.opts = yargs(process.argv.slice(2)).exitProcess(false).parse()
global.prefixes = ['.', '!', '#', '/']

const sessions = global.sessions
const { state, saveCreds } = await useMultiFileAuthState(sessions)
const { version } = await fetchLatestBaileysVersion()

const msgRetryCounterCache = new NodeCache()
const userDevicesCache = new NodeCache()

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = q => new Promise(r => rl.question(q, r))

let opcion = process.argv.includes('qr') ? '1' : null
let phoneNumber = global.botNumber

if (!opcion && !phoneNumber && !fs.existsSync(`./${sessions}/creds.json`)) {
  do {
    opcion = await question(
      chalk.bold.white('Seleccione una opción:\n') +
      chalk.blue('1. Código QR\n') +
      chalk.cyan('2. Código de texto\n--> ')
    )
  } while (!/^[12]$/.test(opcion))
}

const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion === '1',
  browser: opcion === '2'
    ? ['Android', 'Chrome', '13']
    : Browsers.macOS('Desktop'),
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(
      state.keys,
      pino({ level: 'fatal' })
    )
  },
  markOnlineOnConnect: false,
  generateHighQualityLinkPreview: true,
  syncFullHistory: false,
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
  keepAliveIntervalMs: 55000
}

global.conn = makeWASocket(connectionOptions)

await new Promise(resolve => {
  const wait = u => {
    if (u.connection === 'open' || u.connection === 'connecting') {
      conn.ev.off('connection.update', wait)
      resolve()
    }
  }
  conn.ev.on('connection.update', wait)
})

if (opcion === '2') {
  console.log(chalk.cyanBright('\nIngresa tu número con código país\n'))
  phoneNumber = await question('--> ')
  const clean = phoneNumber.replace(/\D/g, '')

  const code = await conn.requestPairingCode(clean)

  console.log(chalk.greenBright('\nIngresa este código:\n'))
  console.log(chalk.bold(code.match(/.{1,4}/g).join(' ')))
}

let handler = await import('./handler.js')
let isInit = true

async function connectionUpdate(update) {
  const { connection, lastDisconnect } = update
  const reason = lastDisconnect?.error?.output?.statusCode

  if (connection === 'open') {
    console.log(
      chalk.greenBright(`[ ✿ ] Conectado a ${conn.user?.name || 'Bot'}`)
    )
  }

  if (connection === 'close') {
    if (reason !== DisconnectReason.loggedOut) {
      await reloadHandler(true)
    }
  }
}

async function reloadHandler(restart) {
  try {
    const mod = await import(`./handler.js?update=${Date.now()}`)
    handler = mod
  } catch {}

  if (restart) {
    try { conn.ws.close() } catch {}
    conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions)
    isInit = true
  }

  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler)
    conn.ev.off('connection.update', conn.connectionUpdate)
    conn.ev.off('creds.update', conn.credsUpdate)
  }

  conn.handler = handler.handler.bind(conn)
  conn.connectionUpdate = connectionUpdate.bind(conn)
  conn.credsUpdate = saveCreds.bind(conn)

  conn.ev.on('messages.upsert', conn.handler)
  conn.ev.on('connection.update', conn.connectionUpdate)
  conn.ev.on('creds.update', conn.credsUpdate)

  isInit = false
}

await reloadHandler()

const pluginRoot = path.join(__dirname, 'plugins')
global.plugins = {}

function loadPlugins(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    if (fs.statSync(full).isDirectory()) loadPlugins(full)
    else if (f.endsWith('.js')) {
      import(`${full}?update=${Date.now()}`)
        .then(m => global.plugins[full] = m.default || m)
        .catch(() => {})
    }
  }
}

loadPlugins(pluginRoot)

fs.watch(pluginRoot, async (_, file) => {
  if (!file?.endsWith('.js')) return
  const full = path.join(pluginRoot, file)
  if (!fs.existsSync(full)) return delete global.plugins[file]

  const err = syntaxerror(
    fs.readFileSync(full),
    file,
    { sourceType: 'module', allowAwaitOutsideFunction: true }
  )

  if (err) return

  try {
    const m = await import(`${full}?update=${Date.now()}`)
    global.plugins[file] = m.default || m
  } catch {}
})

process.on('uncaughtException', err => {
  console.error(err)
})