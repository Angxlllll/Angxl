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
  makeCacheableSignalKeyStore
} = baileys

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SESSION_DIR = global.sessions || 'sessions'
const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

const version = [2, 2413, 1]

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
global.COMMAND_MAP = new Map()
global._customPrefixPlugins = []

function rebuildPluginIndex() {
  global.COMMAND_MAP.clear()
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
      const cmd = c.toLowerCase()
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
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    emitOwnEvents: false,
    getMessage: async () => undefined,
    msgRetryCounterCache,
    userDevicesCache,
    version,
    keepAliveIntervalMs: 60000
  })

  global.conn = sock

  sock.ev.on('creds.update', saveCreds)

  let pairingRequested = false

  sock.ev.on('connection.update', async update => {
    const { connection } = update

    if (connection === 'open') {
      global.BOT_NUMBER = sock.user.id.replace(/\D/g, '')
      console.log(chalk.greenBright('✿ Conectado'))

      const file = './lastRestarter.json'
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
          if (data?.chatId && data?.key) {
            await sock.sendMessage(
              data.chatId,
              {
                text: `✅ *${global.namebot} está en línea nuevamente* 🚀`,
                edit: data.key
              }
            )
          }
          fs.unlinkSync(file)
        } catch {}
      }
    }

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
  })

  function onConnectionUpdate(update) {
    const { connection, lastDisconnect } = update
    const reason = lastDisconnect?.error?.output?.statusCode

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
    if (!messages?.length) return
    if (!messages[0]?.message) return
    handler.handler.call(sock, { messages })
  }

  async function reloadHandler() {
    handler = await import(`./handler.js?update=${Date.now()}`)

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