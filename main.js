import './config.js'

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import chalk from 'chalk'
import pino from 'pino'
import NodeCache from 'node-cache'
import yargs from 'yargs'
import { fileURLToPath } from 'url'

import * as baileys from '@whiskeysockets/baileys'
import store from './lib/store.js'

const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = baileys

const __dirname = path.dirname(fileURLToPath(import.meta.url))
global.opts = yargs(process.argv.slice(2)).exitProcess(false).parse()

global.prefixes = Object.freeze(
  Array.isArray(global.prefixes)
    ? global.prefixes
    : ['.', '!', '#', '/']
)

const SESSION_DIR = global.sessions || 'sessions'
const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
const { version } = await fetchLatestBaileysVersion()

const msgRetryCounterCache = new NodeCache({ stdTTL: 60 })
const userDevicesCache = new NodeCache({ stdTTL: 300 })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
const question = q => new Promise(r => rl.question(q, r))

let option = process.argv.includes('qr') ? '1' : null
let phoneNumber = global.botNumber

if (!option && !phoneNumber && !fs.existsSync(`./${SESSION_DIR}/creds.json`)) {
  do {
    option = await question(
      chalk.bold.white('Seleccione una opción:\n') +
      chalk.blue('1. Código QR\n') +
      chalk.cyan('2. Código de texto\n--> ')
    )
  } while (!/^[12]$/.test(option))
}

const pluginRoot = path.join(__dirname, 'plugins')
global.plugins = Object.create(null)
global.pluginCommandIndex = new Map()
global._customPrefixPlugins = []

function rebuildPluginIndex() {
  global.pluginCommandIndex.clear()
  global._customPrefixPlugins.length = 0

  for (const plugin of Object.values(global.plugins)) {
    if (!plugin || plugin.disabled) continue

    if (plugin.customPrefix instanceof RegExp) {
      global._customPrefixPlugins.push(plugin)
    }

    let cmds = plugin.command
    if (!cmds) continue
    if (!Array.isArray(cmds)) cmds = [cmds]

    for (const c of cmds) {
      let arr = global.pluginCommandIndex.get(c)
      if (!arr) {
        arr = []
        global.pluginCommandIndex.set(c, arr)
      }
      arr.push(plugin)
    }
  }
}

async function loadPlugins(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    if (fs.statSync(full).isDirectory()) {
      await loadPlugins(full)
    } else if (f.endsWith('.js')) {
      try {
        const m = await import(`${full}?update=${Date.now()}`)
        global.plugins[full] = m.default || m
      } catch (e) {
        console.error('[PLUGIN LOAD ERROR]', f, e)
      }
    }
  }
  rebuildPluginIndex()
}

const reloadTimers = new Map()

fs.watch(pluginRoot, { recursive: true }, (_, file) => {
  if (!file?.endsWith('.js')) return
  const full = path.join(pluginRoot, file)

  clearTimeout(reloadTimers.get(full))
  reloadTimers.set(full, setTimeout(async () => {
    if (!fs.existsSync(full)) {
      delete global.plugins[full]
      rebuildPluginIndex()
      return
    }
    try {
      const m = await import(`${full}?update=${Date.now()}`)
      global.plugins[full] = m.default || m
      rebuildPluginIndex()
      console.log(chalk.yellowBright(`↻ Plugin recargado: ${file}`))
    } catch (e) {
      console.error('[PLUGIN RELOAD ERROR]', file, e)
    }
  }, 150))
})

let handler = await import('./handler.js')

async function startSock() {
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: option === '1',
    browser: option === '2'
      ? ['Android', 'Chrome', '13']
      : ['Desktop', 'Chrome', '120'],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'fatal' })
      )
    },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    getMessage: async () => undefined,
    msgRetryCounterCache,
    userDevicesCache,
    version,
    keepAliveIntervalMs: 55000
  })

  global.conn = sock
  store.bind(sock)

  sock.ev.on('creds.update', saveCreds)

  if (option === '2' && !fs.existsSync(`./${SESSION_DIR}/creds.json`)) {
    console.log(chalk.cyanBright('\nIngresa tu número con código país\n'))
    phoneNumber = await question('--> ')
    const clean = phoneNumber.replace(/\D/g, '')
    const code = await sock.requestPairingCode(clean)
    console.log(chalk.greenBright('\nIngresa este código:\n'))
    console.log(chalk.bold(code.match(/.{1,4}/g).join(' ')))
  }

  function onConnectionUpdate(update) {
    const { connection, lastDisconnect } = update
    const reason = lastDisconnect?.error?.output?.statusCode

    if (connection === 'open') {
      console.log(chalk.greenBright(`✿ Conectado a ${sock.user?.name || 'Bot'}`))
    }

    if (connection === 'close') {
      if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.red('Sesión cerrada'))
        process.exit(0)
      }
      setTimeout(startSock, 2000)
    }
  }

  function onMessagesUpsert({ messages, type }) {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (!msg?.message) continue
      if (msg.key?.fromMe) continue
      if (msg.key?.id?.startsWith('BAE5')) continue
      handler.handler.call(sock, { messages: [msg] })
    }
  }

  async function reloadHandler() {
    try {
      handler = await import(`./handler.js?update=${Date.now()}`)
    } catch {}

    if (sock._handler) sock.ev.off('messages.upsert', sock._handler)
    if (sock._connUpdate) sock.ev.off('connection.update', sock._connUpdate)

    sock._handler = onMessagesUpsert
    sock._connUpdate = onConnectionUpdate

    sock.ev.on('messages.upsert', sock._handler)
    sock.ev.on('connection.update', sock._connUpdate)
  }

  await reloadHandler()
}

await loadPlugins(pluginRoot)
await startSock()

process.on('uncaughtException', err => {
  console.error('[UNCAUGHT]', err)
})
process.on('unhandledRejection', err => {
  console.error('[UNHANDLED]', err)
})