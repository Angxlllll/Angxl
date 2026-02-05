import './config.js'

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import chalk from 'chalk'
import pino from 'pino'
import syntaxerror from 'syntax-error'
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
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  Browsers
} = baileys

const __dirname = path.dirname(fileURLToPath(import.meta.url))

global.opts = yargs(process.argv.slice(2)).exitProcess(false).parse()

global.prefixes = Object.freeze(
  Array.isArray(global.prefixes) ? global.prefixes : ['.', '!', '#', '/']
)

const SESSION_DIR = global.sessions || 'sessions'

const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
const { version } = await fetchLatestBaileysVersion()

const msgRetryCounterCache = new NodeCache()
const userDevicesCache = new NodeCache()

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

const socketOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: option === '1',
  browser: option === '2'
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
  generateHighQualityLinkPreview: false,
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

global.conn = makeWASocket(socketOptions)
conn.ev.on('creds.update', saveCreds)

await new Promise(resolve => {
  const wait = u => {
    if (u.connection === 'open' || u.connection === 'connecting') {
      conn.ev.off('connection.update', wait)
      resolve()
    }
  }
  conn.ev.on('connection.update', wait)
})

if (option === '2') {
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
      chalk.greenBright(`✿ Conectado a ${conn.user?.name || 'Bot'}`)
    )

    const file = './lastRestarter.json'
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
        if (data?.chatId && data?.key) {
          await conn.sendMessage(
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

  if (connection === 'close') {
    if (reason === DisconnectReason.loggedOut) {
      console.log(chalk.red('Sesión cerrada'))
      process.exit(0)
    }

    console.log(chalk.yellow('Reconectando...'))
  }
}

async function reloadHandler() {
  try {
    const mod = await import(`./handler.js?update=${Date.now()}`)
    handler = mod
  } catch {}

  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler)
    conn.ev.off('connection.update', conn.connectionUpdate)
    conn.ev.off('creds.update', conn.credsUpdate)
  }

  conn.handler = handler.handler.bind(conn)
  conn.connectionUpdate = connectionUpdate.bind(conn)
  conn.credsUpdate = saveCreds.bind(conn)

  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages || []) {
      if (!msg?.message) continue
      if (msg.key?.fromMe) continue
      try {
        conn.handler({ messages: [msg] })
      } catch (e) {
        console.error(e)
      }
    }
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
    if (fs.statSync(full).isDirectory()) {
      await loadPlugins(full)
    } else if (f.endsWith('.js')) {
      try {
        const m = await import(`${full}?update=${Date.now()}`)
        global.plugins[full] = m.default || m
      } catch {}
    }
  }
}

await loadPlugins(pluginRoot)

global.pluginCommandIndex = new Map()
global._customPrefixPlugins = []

for (const plugin of Object.values(global.plugins)) {
  if (!plugin || plugin.disabled) continue

  if (plugin.customPrefix instanceof RegExp) {
    global._customPrefixPlugins.push(plugin)
  }

  let cmds = plugin.command
  if (!cmds) continue

  if (cmds instanceof RegExp) continue

  if (!Array.isArray(cmds)) cmds = [cmds]

  for (const c of cmds) {
    if (!global.pluginCommandIndex.has(c))
      global.pluginCommandIndex.set(c, [])
    global.pluginCommandIndex.get(c).push(plugin)
  }
}

const reloadTimers = new Map()

fs.watch(pluginRoot, { recursive: true }, (_, file) => {
  if (!file || !file.endsWith('.js')) return

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
        console.log(chalk.yellowBright(`↻ Plugin recargado: ${file}`))
      } catch (e) {
        console.error(e)
      }
    }, 150)
  )
})

process.on('uncaughtException', err => {
  console.error(err)
})