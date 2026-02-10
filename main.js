import './config.js'

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import chalk from 'chalk'
import pino from 'pino'
import NodeCache from 'node-cache'
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

global.groupMetadata = new Map()

const SESSION_DIR = global.sessions || 'sessions'
const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
const { version } = await fetchLatestBaileysVersion()

const msgRetryCounterCache = new NodeCache({ stdTTL: 30 })
const userDevicesCache = new NodeCache({ stdTTL: 120 })

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
global.COMMAND_MAP = new Map()

function rebuildPluginIndex() {
  global.pluginCommandIndex.clear()
  global._customPrefixPlugins.length = 0
  global.COMMAND_MAP.clear()

  for (const plugin of Object.values(global.plugins)) {
    if (!plugin || plugin.disabled) continue

    if (plugin.customPrefix instanceof RegExp) {
      global._customPrefixPlugins.push(plugin)
    }

    let cmds = plugin.command
    if (!cmds) continue
    if (!Array.isArray(cmds)) cmds = [cmds]

    for (const c of cmds) {
      const cmd = c.toLowerCase()
      let arr = global.pluginCommandIndex.get(cmd)
      if (!arr) {
        arr = []
        global.pluginCommandIndex.set(cmd, arr)
      }
      arr.push(plugin)
      if (!global.COMMAND_MAP.has(cmd)) {
        global.COMMAND_MAP.set(cmd, plugin)
      }
    }
  }
}

async function loadPlugins(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    if (fs.statSync(full).isDirectory()) {
      await loadPlugins(full)
    } else if (f.endsWith('.js')) {
      const m = await import(`${full}?update=${Date.now()}`)
      global.plugins[full] = m.default || m
    }
  }
  rebuildPluginIndex()
}

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
    syncFullHistory: false,
    emitOwnEvents: false,
    generateHighQualityLinkPreview: false,
    msgRetryCounterCache,
    userDevicesCache,
    version,
    keepAliveIntervalMs: 55000,
    getMessage: async () => undefined
  })

  global.conn = sock
  store.bind(sock)

  let pairingRequested = false

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return
    if (!messages?.length) return
    handler.handler.call(sock, { messages })
  })

  sock.ev.on('groups.update', async updates => {
    for (const u of updates) {
      const meta = await sock.groupMetadata(u.id).catch(() => null)
      if (meta) global.groupMetadata.set(u.id, meta)
    }
  })

  sock.ev.on('group-participants.update', async u => {
    const meta = await sock.groupMetadata(u.id).catch(() => null)
    if (meta) global.groupMetadata.set(u.id, meta)
  })

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update
    const reason = lastDisconnect?.error?.output?.statusCode

    if (
      option === '2' &&
      !pairingRequested &&
      !fs.existsSync(`./${SESSION_DIR}/creds.json`) &&
      (connection === 'connecting' || connection === 'open')
    ) {
      pairingRequested = true
      console.log(chalk.cyanBright('\nIngresa tu número con código país'))
      phoneNumber = await question('--> ')
      const clean = phoneNumber.replace(/\D/g, '')
      const code = await sock.requestPairingCode(clean)
      console.log(chalk.greenBright('\nCódigo de vinculación:\n'))
      console.log(chalk.bold(code.match(/.{1,4}/g).join(' ')))
    }

    if (connection === 'open') {
      global.BOT_NUMBER = sock.user.id.replace(/\D/g, '')
      console.log(chalk.greenBright('✿ Conectado'))

      const groups = await sock.groupFetchAllParticipating()
      for (const jid in groups) {
        global.groupMetadata.set(jid, groups[jid])
      }
    }

    if (connection === 'close') {
      if (reason === DisconnectReason.loggedOut) process.exit(0)
      setTimeout(startSock, 2000)
    }
  })
}

await loadPlugins(pluginRoot)
await startSock()

process.on('uncaughtException', err => console.error(err))
process.on('unhandledRejection', err => console.error(err))