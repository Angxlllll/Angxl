import './config.js'

import cluster from 'cluster'
import fs, {
  watchFile,
  unwatchFile,
  readdirSync,
  statSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  watch
} from 'fs'

import path, { join, dirname } from 'path'
import { platform } from 'process'
import { spawn, execSync } from 'child_process'
import { tmpdir } from 'os'
import { format } from 'util'
import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from 'module'



import * as ws from 'ws'
import yargs from 'yargs'
import syntaxerror from 'syntax-error'
import readline from 'readline'
import NodeCache from 'node-cache'
import chalk from 'chalk'


import P from 'pino'
import pino from 'pino'
import Pino from 'pino'




import { makeWASocket } from './lib/simple.js'
import store from './lib/store.js'



import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg



const {
  DisconnectReason,
  useMultiFileAuthState,
  MessageRetryMap,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  Browsers
} = await import('@whiskeysockets/baileys')



import {
  downloadContentFromMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  generateWAMessageContent
} from '@whiskeysockets/baileys'



const { proto } = (await import('@whiskeysockets/baileys')).default



const phoneUtil = PhoneNumberUtil.getInstance()
const { CONNECTING } = ws



const PORT = process.env.PORT || process.env.SERVER_PORT || 3000



global.wa = {
  downloadContentFromMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  generateWAMessageContent
}



console.log('\nMejor Bot Do Momento Start...')

console.log(`
\x1b[95m█████╗ ███╗   ██╗ ██████╗ ███████╗██╗     
██╔══██╗████╗  ██║██╔════╝ ██╔════╝██║     
███████║██╔██╗ ██║██║  ███╗█████╗  ██║     
██╔══██║██║╚██╗██║██║   ██║██╔══╝  ██║     
██║  ██║██║ ╚████║╚██████╔╝███████╗███████╗
╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚══════╝
\x1b[0m
`)

console.log('\x1b[96mHecho y optimizado por Angel.xyz\x1b[0m')



if (!existsSync('./tmp')) {
  mkdirSync('./tmp')
}



global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix
    ? /file:\/\/\//.test(pathURL)
      ? fileURLToPath(pathURL)
      : pathURL
    : pathToFileURL(pathURL).toString()
}

global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true))
}

global.__require = function require(dir = import.meta.url) {
  return createRequire(dir)
}



global.timestamp = { start: new Date }
const __dirname = global.__dirname(import.meta.url)



global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = '.'
global.prefixes = ['.', '!', '#', '/']



const { state, saveState, saveCreds } = await useMultiFileAuthState(global.sessions)



const msgRetryCounterMap = new Map()
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })



const { version } = await fetchLatestBaileysVersion()



let phoneNumber = global.botNumber
const methodCodeQR = process.argv.includes('qr')
const methodCode = !!phoneNumber || process.argv.includes('code')



const colors = text => `\x1b[1m\x1b[37m${text}\x1b[0m`
const qrOption = text => `\x1b[94m${text}\x1b[0m`
const textOption = text => `\x1b[96m${text}\x1b[0m`



const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))



let opcion
if (methodCodeQR) opcion = '1'

const MethodMobile = opcion === '2' ? true : process.argv.includes('mobile')



if (!methodCodeQR && !methodCode && !fs.existsSync(`./${sessions}/creds.json`)) {
  do {
    opcion = await question(
      colors('Seleccione una opción:\n') +
      qrOption('1. Con código QR\n') +
      textOption('2. Con código de texto de 8 dígitos\n--> ')
    )

    if (!/^[1-2]$/.test(opcion)) {
      console.log(
        chalk.bold.redBright(
          'No se permiten numeros que no sean 1 o 2, tampoco letras o símbolos especiales.'
        )
      )
    }
  } while (opcion !== '1' && opcion !== '2' || fs.existsSync(`./${sessions}/creds.json`))
}

const filterStrings = [
  'Q2xvc2luZyBzdGFsZSBvcGVu',
  'Q2xvc2luZyBvcGVuIHNlc3Npb24=',
  'RmFpbGVkIHRvIGRlY3J5cHQ=',
  'U2Vzc2lvbiBlcnJvcg==',
  'RXJyb3I6IEJhZCBNQUM=',
  'RGVjcnlwdGVkIG1lc3NhZ2U='
]



const redefineConsoleMethod = (methodName, filterStrings) => {
  const original = console[methodName]

  console[methodName] = (...args) => {
    const text = args.join(' ')
    if (filterStrings.some(s => text.includes(s))) return
    original.apply(console, args)
  }
}

Object.freeze(redefineConsoleMethod)



console.info = () => { }
console.debug = () => { }

;['log', 'warn', 'error'].forEach(methodName =>
  redefineConsoleMethod(methodName, filterStrings)
)



const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion == '1' ? true : methodCodeQR ? true : false,
  mobile: MethodMobile,

 browser:
opcion === '2'
  ? ['Android', 'Chrome', '13']
  : Browsers.macOS('Desktop'),

  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(
      state.keys,
      Pino({ level: 'fatal' }).child({ level: 'fatal' })
    )
  },

  markOnlineOnConnect: false,
  generateHighQualityLinkPreview: true,
  syncFullHistory: false,

  getMessage: async (key) => {
    try {
      let jid = jidNormalizedUser(key.remoteJid)
      let msg = await store.loadMessage(jid, key.id)
      return msg?.message || ''
    } catch {
      return ''
    }
  },

  msgRetryCounterCache: msgRetryCounterCache || new Map(),
  userDevicesCache: userDevicesCache || new Map(),

  defaultQueryTimeoutMs: undefined,
  version,
  keepAliveIntervalMs: 55000,
  maxIdleTimeMs: 60000
}



global.conn = makeWASocket(connectionOptions)

await new Promise(resolve => {
  const wait = (u) => {
    if (u.connection === 'connecting' || u.connection === 'open') {
      conn.ev.off('connection.update', wait)
      resolve()
    }
  }
  conn.ev.on('connection.update', wait)
})

if (opcion === '2') {
  console.log(chalk.cyanBright('\nIngresa el número con código país (ej: +52XXXXXXXXXX)\n'))
  phoneNumber = await question('--> ')

  const cleanNumber = phoneNumber.replace(/\D/g, '')
const code = await conn.requestPairingCode(cleanNumber)

  console.log(chalk.greenBright('\nIngresa este código en WhatsApp\n'))
  console.log(chalk.bold(code.match(/.{1,4}/g).join(' ')))
}



conn.isInit = false
conn.well = false
conn.logger.info('[♠] Hecho exitosamente...\n')



if (!opts['test']) {
  setInterval(async () => {
    if (opts['autocleartmp']) {
      ;([tmpdir(), 'tmp']).forEach((filename) =>
        spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete'])
      )
    }
  }, 30000)
}



async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin } = update

  global.stopped = connection
  if (isNewLogin) conn.isInit = true

  const code =
    lastDisconnect?.error?.output?.statusCode ||
    lastDisconnect?.error?.output?.payload?.statusCode

  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error)
    global.timestamp.connect = new Date()
  }

  if (update.qr != 0 && update.qr != undefined || methodCodeQR) {
    if (opcion == '1' || methodCodeQR) {
      console.log(chalk.green.bold('[ ✿ ]  Escanea este código QR'))
    }
  }
if (opcion === '2' && update.qr === undefined) {
  console.log(chalk.greenBright('\nIngresa este código en WhatsApp\n'))
}

  if (connection === 'open') {
    const userName = conn.user.name || conn.user.verifiedName || 'Desconocido'
console.log(`\x1b[1m\x1b[92m[ ✿ ]  Conectado a: ${userName}\x1b[0m`)
  }

  let reason = lastDisconnect?.error?.output?.statusCode 
          || lastDisconnect?.error?.statusCode
          || lastDisconnect?.error?.code

  if (connection === 'close') {
    if (
      reason === DisconnectReason.connectionClosed ||
      reason === DisconnectReason.connectionLost ||
      reason === DisconnectReason.loggedOut ||
      reason === DisconnectReason.restartRequired ||
      reason === DisconnectReason.timedOut
    ) {
      await global.reloadHandler(true).catch(console.error)
    }
  }
}



process.on('uncaughtException', console.error)



let isInit = true
let handler = await import('./handler.js')



global.reloadHandler = async function (restatConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`)
    if (Object.keys(Handler || {}).length) handler = Handler
  } catch (e) {
    console.error(e)
  }

  if (restatConn) {
    const oldChats = global.conn.chats
    try { global.conn.ws.close() } catch { }
    conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions, { chats: oldChats })
    isInit = true
  }

  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler)
    conn.ev.off('connection.update', conn.connectionUpdate)
    conn.ev.off('creds.update', conn.credsUpdate)
  }

  conn.handler = handler.handler.bind(global.conn)
  conn.connectionUpdate = connectionUpdate.bind(global.conn)
  conn.credsUpdate = saveCreds.bind(global.conn, true)

  conn.ev.on('messages.upsert', conn.handler)
  conn.ev.on('connection.update', conn.connectionUpdate)
  conn.ev.on('creds.update', conn.credsUpdate)

  isInit = false
  return true
}



const pluginRoot = join(__dirname, './plugins/')
const pluginFilter = (filename) => filename.endsWith('.js')
global.plugins = {}



function getAllPluginFiles(dir) {
  let results = []

  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file)

    if (statSync(fullPath).isDirectory()) {
      results = results.concat(getAllPluginFiles(fullPath))
    } else if (pluginFilter(file)) {
      results.push(fullPath)
    }
  }

  return results
}



async function filesInit() {
  for (const fullPath of getAllPluginFiles(pluginRoot)) {
    try {
      const module = await import(`${path.resolve(fullPath)}?update=${Date.now()}`)
      const keyName = fullPath.replace(pluginRoot, '')
      global.plugins[keyName] = module.default || module
    } catch { }
  }

  global.plugins = Object.fromEntries(
    Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b))
  )
}

filesInit()



global.reload = async (_ev, file) => {
  if (!file.endsWith('.js')) return

  const fullPath = path.resolve(join(pluginRoot, file))

  if (!existsSync(fullPath)) {
    delete global.plugins[file]
    return
  }

  const err = syntaxerror(readFileSync(fullPath), file, {
    sourceType: 'module',
    allowAwaitOutsideFunction: true
  })

  if (err) return

  try {
    const module = await import(`${fullPath}?update=${Date.now()}`)
    global.plugins[file] = module.default || module
  } catch { }

  global.plugins = Object.fromEntries(
    Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b))
  )
}

Object.freeze(global.reload)
watch(pluginRoot, global.reload)



await global.reloadHandler()



setInterval(async () => {
  if (stopped === 'close' || !conn || !conn.user) return
  const tmpDir = join(__dirname, 'tmp')
  readdirSync(tmpDir).forEach(file => unlinkSync(join(tmpDir, file)))
}, 1000 * 60 * 4)



setInterval(async () => {
  if (stopped === 'close' || !conn || !conn.user) return
  const directorio = readdirSync(`./${sessions}`)
  directorio
    .filter(file => file.startsWith('pre-key-'))
    .forEach(file => unlinkSync(`./${sessions}/${file}`))
}, 1000 * 60 * 10)



async function isValidPhoneNumber(number) {
  try {
    number = number.replace(/\s+/g, '')
    if (number.startsWith('+521')) number = number.replace('+521', '+52')
    const parsedNumber = phoneUtil.parseAndKeepRawInput(number)
    return phoneUtil.isValidNumber(parsedNumber)
  } catch {
    return false
  }
}