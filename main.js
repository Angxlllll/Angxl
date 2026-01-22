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
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
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