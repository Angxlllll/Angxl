import { smsg, decodeJid } from './lib/simple.js'
import fs from 'fs'
import { fileURLToPath } from 'url'

const DIGITS = s => String(s || '').replace(/\D/g, '')

const OWNER_SET = new Set(
  (global.owner || []).map(v =>
    DIGITS(Array.isArray(v) ? v[0] : v)
  )
)

global.dfail = async (type, m, conn) => {
  const msg = {
    rowner: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋',
    owner: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋',
    mods: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝖽𝗈 𝖯𝗈𝗋 𝖣𝖾𝗌𝖺𝗋𝗋𝗈𝗅𝗅𝖺𝖽𝗈𝗋𝖾𝗌',
    premium: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖫𝗈 𝖯𝗎𝖾𝖽𝖾𝗇 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝗋 𝖴𝗌𝖺𝗋𝗂𝗈𝗌 𝖯𝗋𝖾𝗆𝗂𝗎𝗆',
    group: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖥𝗎𝗇𝖼𝗂𝗈𝗇𝖺 𝖤𝗇 𝖦𝗋𝗎𝗉𝖺𝗌',
    private: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖲𝖾 𝖯𝗎𝖾𝖽𝖾 𝖮𝖼𝗎𝗉𝖺𝗋 𝖤𝗇 𝖤𝗅 𝖯𝗋𝗂𝗏𝖺𝖽𝗈',
    admin: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝖽𝗈 𝖯𝗈𝗋 𝖠𝖽𝗆𝗂𝗌𝗍𝗋𝖺𝖽𝗈𝗋𝖾𝗌',
    botAdmin: '𝖭𝖾𝖼𝗌𝗂𝗍𝗈 𝗌𝖾𝗋 𝖠𝖽𝗆𝗂𝗇',
    restrict: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖧𝖺 𝖲𝗂𝖽𝗈 𝖣𝖾𝗌𝖺𝖻𝗂𝗅𝗂𝗍𝖺𝖽𝗈'
  }[type]
  if (msg) conn.sendMessage(m.chat, { text: msg }, { quoted: m })
}

Object.freeze(global.dfail)

global.groupAdmins ||= new Map()

const GROUP_META_CACHE = new Map()
const GROUP_META_TTL = 30000

export function bindGroupEvents(conn) {
  conn.ev.on('group-participants.update', ({ id, participants, action }) => {
    let admins = global.groupAdmins.get(id)
    if (!admins) return
    for (const p of participants) {
      const num = DIGITS(decodeJid(p))
      if (action === 'promote') admins.add(num)
      else if (action === 'demote') admins.delete(num)
    }
  })
}

export function handler(chatUpdate) {
  if (!chatUpdate?.messages) return
  for (const raw of chatUpdate.messages) {
    setImmediate(() => handleMessage.call(this, raw))
  }
}

async function handleMessage(raw) {
  const m = smsg(this, raw)
  if (!m || m.isBaileys || !m.text) return

  const text = m.text
  const prefix = text[0]
  if (prefix !== '.' && prefix !== '!') return

  this.botNum ||= DIGITS(decodeJid(this.user.id))
  m.senderNum ||= DIGITS(decodeJid(m.sender))

  const body = text.slice(1).trim()
  const space = body.indexOf(' ')
  const command = (space === -1 ? body : body.slice(0, space))
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')

  let plugin = global.COMMAND_MAP?.get(command)

  if (!plugin || plugin.disabled) return
  if (plugin.group && !m.isGroup) return

  const isROwner = OWNER_SET.has(m.senderNum)
  const isOwner = isROwner || m.fromMe

  if (plugin.rowner && !isROwner)
    return global.dfail('rowner', m, this)

  if (plugin.owner && !isOwner)
    return global.dfail('owner', m, this)

  let participants
  let groupMetadata
  let isAdmin = false
  let isBotAdmin = false

  if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
    let cached = GROUP_META_CACHE.get(m.chat)
    if (!cached || Date.now() - cached.time > GROUP_META_TTL) {
      const meta = await this.groupMetadata(m.chat)
      cached = { data: meta, time: Date.now() }
      GROUP_META_CACHE.set(m.chat, cached)
    }

    groupMetadata = cached.data
    participants = groupMetadata.participants

    let admins = global.groupAdmins.get(m.chat)
    if (!admins) {
      admins = new Set(
        participants
          .filter(p => p.admin)
          .map(p => DIGITS(decodeJid(p.id)))
      )
      global.groupAdmins.set(m.chat, admins)
    }

    isAdmin = admins.has(m.senderNum)
    isBotAdmin = admins.has(this.botNum)

    if (plugin.admin && !isAdmin)
      return global.dfail('admin', m, this)

    if (plugin.botAdmin && !isBotAdmin)
      return global.dfail('botAdmin', m, this)
  }

  const args = body.slice(command.length).trim().split(/\s+/).filter(Boolean)
  const exec = plugin.exec || plugin.default || plugin
  if (!exec) return

  Promise.resolve(
    exec.call(this, m, {
      conn: this,
      args,
      command,
      usedPrefix: prefix,
      participants,
      groupMetadata,
      isROwner,
      isOwner,
      isAdmin,
      isBotAdmin,
      chat: m.chat
    })
  ).catch(e => {
    m.reply(`❌ Error:\n${e.message}`)
  })
}

if (process.env.NODE_ENV === 'development') {
  const file = fileURLToPath(import.meta.url)
  fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log('handler.js actualizado')
  })
}