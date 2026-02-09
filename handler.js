import { smsg, decodeJid } from './lib/simple.js'
import fs from 'fs'
import { fileURLToPath } from 'url'

const DIGITS = s => String(s || '').replace(/\D/g, '')

const OWNER_SET = new Set(
  (global.owner || []).map(v => DIGITS(Array.isArray(v) ? v[0] : v))
)

const DFAIL_MSG = {
  rowner: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝗋𝗋𝗋 𝗎𝗌𝗂𝗌𝗍𝗋𝗋𝗂𝗍𝗋𝗋𝗋𝗈',
  owner: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋',
  admin: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝗋𝗋𝗋 𝗎𝗌𝗂𝗌𝗍𝗋𝗋𝗂𝗍𝗋𝗋𝗋𝗈',
  botAdmin: '𝖭𝖾𝖼𝗌𝗂𝗍𝗈 𝗌𝖾𝗋 𝖠𝖽𝗆𝗂𝗇'
}

global.dfail = (type, m, conn) => {
  const msg = DFAIL_MSG[type]
  if (msg) conn.sendMessage(m.chat, { text: msg }, { quoted: m })
}

Object.freeze(global.dfail)

global.groupAdmins ||= new Map()

export function bindGroupEvents(conn) {
  conn.ev.on('group-participants.update', ({ id, participants, action }) => {
    let admins = global.groupAdmins.get(id)
    if (!admins) return
    for (const p of participants) {
      const n = DIGITS(decodeJid(p))
      action === 'promote' ? admins.add(n) : admins.delete(n)
    }
  })
}

export function handler(chatUpdate) {
  const messages = chatUpdate?.messages
  if (!messages) return
  for (const raw of messages) {
    handleMessage.call(this, raw)
  }
}

async function handleMessage(raw) {
  const m = smsg(this, raw)
  if (!m || m.isBaileys || !m.text) return

  this.botNum ||= DIGITS(decodeJid(this.user.id))
  const senderNum = DIGITS(decodeJid(m.sender))

  const isROwner = OWNER_SET.has(senderNum)
  const isOwner = isROwner || m.fromMe

  const text = m.text.trim()
  const c = text.charCodeAt(0)
  const hasPrefix = c === 46 || c === 33

  if (!hasPrefix && !global.sinprefix) return
  if (!global.COMMAND_MAP) return

  const usedPrefix = hasPrefix ? text[0] : ''
  const body = hasPrefix ? text.slice(1).trim() : text

  let command = body
  let args = []

  const i = body.indexOf(' ')
  if (i !== -1) {
    command = body.slice(0, i)
    args = body.slice(i + 1).trim().split(/\s+/)
  }

  command = command.toLowerCase()

  if (command === 'on' && args[0] === 'sinprefix') {
    if (!isOwner) return global.dfail('owner', m, this)
    global.sinprefix = true
    return this.sendMessage(m.chat, { text: 'sinprefix activado' }, { quoted: m })
  }

  if (command === 'off' && args[0] === 'sinprefix') {
    if (!isOwner) return global.dfail('owner', m, this)
    global.sinprefix = false
    return this.sendMessage(m.chat, { text: 'sinprefix desactivado' }, { quoted: m })
  }

  const plugin = global.COMMAND_MAP.get(command)
  if (!plugin || plugin.disabled) return

  if (plugin.rowner && !isROwner) return global.dfail('rowner', m, this)
  if (plugin.owner && !isOwner) return global.dfail('owner', m, this)

  let isAdmin = false
  let isBotAdmin = false
  let participants
  let groupMetadata

  if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
    let admins = global.groupAdmins.get(m.chat)

    if (!admins) {
      groupMetadata = await this.groupMetadata(m.chat)
      admins = new Set(
        groupMetadata.participants
          .filter(p => p.admin)
          .map(p => DIGITS(decodeJid(p.id)))
      )
      global.groupAdmins.set(m.chat, admins)
      participants = groupMetadata.participants
    }

    isAdmin = admins.has(senderNum)
    isBotAdmin = admins.has(this.botNum)

    if (plugin.admin && !isAdmin) return global.dfail('admin', m, this)
    if (plugin.botAdmin && !isBotAdmin) return global.dfail('botAdmin', m, this)
  }

  const exec = plugin.exec || plugin.default || plugin
  if (!exec) return

  const ctx = {
    conn: this,
    args,
    command,
    usedPrefix,
    participants,
    groupMetadata,
    isROwner,
    isOwner,
    isAdmin,
    isBotAdmin,
    chat: m.chat
  }

  setImmediate(() => {
  Promise.resolve(
    exec.call(this, m, ctx)
  ).catch(err => {
    console.error('Plugin error:', err)
  })
})
}

if (process.env.NODE_ENV === 'development') {
  const file = fileURLToPath(import.meta.url)
  fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log('handler.js actualizado')
  })
}