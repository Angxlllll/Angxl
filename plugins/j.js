import {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import pino from "pino"
import fs from "fs"
import path from "path"
import { makeWASocket } from "../lib/simple.js"

const __dirname = process.cwd()
const SUBBOT_PATH = path.join(__dirname, "jadibot")

if (!global.conns) global.conns = []

let handler = async (m, { conn }) => {

  const id = m.sender.split("@")[0]
  const sessionPath = path.join(SUBBOT_PATH, id)

  if (!fs.existsSync(sessionPath))
    fs.mkdirSync(sessionPath, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: "silent" })
      )
    },
    version,
    browser: ["SubBot", "Chrome", "110"]
  })

  // Guardar credenciales
  sock.ev.on("creds.update", saveCreds)

  // 🔐 Pairing Code (solo si no está registrado)
  if (!state.creds.registered) {
    let code = await sock.requestPairingCode(id)
    code = code.match(/.{1,4}/g).join("-")

    await m.reply(
      m.chat,
      `*╭─❒ VINCULACIÓN SUB-BOT*\n` +
      `*│*\n` +
      `*│* WhatsApp → Dispositivos vinculados\n` +
      `*│* Vincular con código\n` +
      `*│*\n` +
      `*│* *CÓDIGO:*\n` +
      `*│* ${code}\n` +
      `*╰─❒*`,
      m
    )
  }

  // Estado de conexión
  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") {
      global.conns.push(sock)
    }
  })
}

handler.help = ["code"]
handler.tags = ["jadibot"]
handler.command = ["code"]

export default handler