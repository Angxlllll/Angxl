import { smsg, decodeJid } from './lib/simple.js'
import fs from 'fs'
import { fileURLToPath } from 'url'

const normalizeId = jid => {
  if (!jid) return ''
  jid = decodeJid(jid)
  return jid.split('@')[0].split(':')[0]
}

const OWNER_SET = new Set(
  (global.owner || []).map(v =>
    normalizeId(Array.isArray(v) ? v[0] : v)
  )
)

const DFAIL_MSG = {
  rowner: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝗈 𝖱𝖾𝗌𝗍𝗋𝗂𝗇𝗀𝗂𝖽𝗈',
  owner: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋',
  admin: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝗈 𝖣𝖾 𝖠𝖽𝗆𝗂𝗇',
  botAdmin: '𝖭𝖾𝖼𝖾𝗌𝗂𝗍𝗈 𝖲𝖾𝗋 𝖠𝖽𝗆𝗂𝗇'
}

global.dfail = (type, m, conn) => {
  const msg = DFAIL_MSG[type]
  if (msg) conn.sendMessage(m.chat, { text: msg }, { quoted: m })
}

Object.freeze(global.dfail)

global.groupAdmins ||= new Map()
global.chatQueues ||= new Map()

export function bindGroupEvents(conn) {
  conn.ev.on('group-participants.update', ({ id, participants, action }) => {
    const admins = global.groupAdmins.get(id)
    if (!admins) return
    for (const p of participants) {
      const n = normalizeId(p)
      action === 'promote' ? admins.add(n) : admins.delete(n)
    }
  })
}

export function handler(chatUpdate) {
  const messages = chatUpdate?.messages
  if (!messages) return
  for (const raw of messages) handleMessage.call(this, raw)
}

function enqueue(chat, fn) {
  let q = global.chatQueues.get(chat)
  if (!q) {
    q = []
    global.chatQueues.set(chat, q)
  }
  q.push(fn)
  if (q.length === 1) runQueue(chat)
}

async function runQueue(chat) {
  const q = global.chatQueues.get(chat)
  if (!q) return
  while (q.length) {
    try {
      await q[0]()
    } catch {}
    q.shift()
  }
}

function handleMessage(raw) {
  const m = smsg(this, raw)
  if (!m || m.isBaileys || !m.text) return

  this.botNum ||= normalizeId(this.user.id)
  const senderNum = normalizeId(m.sender)

  const isROwner = OWNER_SET.has(senderNum)
  const isOwner = isROwner || m.fromMe

  const text = m.text.trim()
  const c = text.charCodeAt(0)
  const hasPrefix = c === 46 || c === 33

  if (!hasPrefix && !global.sinprefix) return
  const map = global.COMMAND_MAP
  if (!map) return

  const usedPrefix = hasPrefix ? text[0] : ''
  const body = hasPrefix ? text.slice(1).trim() : text

  let command, args
  const i = body.indexOf(' ')
  if (i === -1) {
    command = body
    args = []
  } else {
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

  const plugin = map.get(command)
  if (!plugin || plugin.disabled) return

  if (plugin.rowner && !isROwner) return global.dfail('rowner', m, this)
  if (plugin.owner && !isOwner) return global.dfail('owner', m, this)

  enqueue(m.chat, async () => {
    let isAdmin = false
    let isBotAdmin = false
    let participants
    let groupMetadata

    if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
      let admins = global.groupAdmins.get(m.chat)
      if (!admins) {
        groupMetadata = await this.groupMetadata(m.chat)
        admins = new Set()
        for (const p of groupMetadata.participants) {
          if (p.admin) admins.add(normalizeId(p.id))
        }
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

    await exec.call(this, m, {
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
    })
  })
}

if (process.env.NODE_ENV === 'development') {
  const file = fileURLToPath(import.meta.url)
  fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log('handler actualizado')
  })
}