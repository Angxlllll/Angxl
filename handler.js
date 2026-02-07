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

export function bindGroupEvents(conn) {
  conn.ev.on('group-participants.update', ({ id, participants, action }) => {
    const admins = global.groupAdmins.get(id)
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
    handleMessage.call(this, raw)
  }
}

async function handleMessage(raw) {
  const m = smsg(this, raw)
  if (!m || m.isBaileys || !m.text) return

  const text = m.text
  const first = text[0]

  if (first !== '.' && first !== '!') return

  this.botNum ||= DIGITS(decodeJid(this.user.id))
  m.senderNum ||= DIGITS(decodeJid(m.sender))

  let plugin = null
  let command = null
  let usedPrefix = first

  const body = text.slice(1).trim()
  const space = body.indexOf(' ')
  command = (space === -1 ? body : body.slice(0, space))
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')

  plugin = global.COMMAND_MAP?.get(command)

  if (!plugin && global._customPrefixPlugins?.length) {
    for (const p of global._customPrefixPlugins) {
      if (p.customPrefix?.test(text)) {
        plugin = p
        break
      }
    }
  }

  if (!plugin || plugin.disabled) return

  if (plugin.group && !m.isGroup)
    return global.dfail('group', m, this)

  const isROwner = OWNER_SET.has(m.senderNum)
  const isOwner = isROwner || m.fromMe

  if (plugin.rowner && !isROwner)
    return global.dfail('rowner', m, this)

  if (plugin.owner && !isOwner)
    return global.dfail('owner', m, this)

  let isAdmin = false
  let isBotAdmin = false
  let participants = null
  let groupMetadata = null

  if (m.isGroup) {
    const meta = await this.groupMetadata(m.chat)
    participants = meta.participants
    groupMetadata = meta

    let admins = global.groupAdmins.get(m.chat)

    if (!admins) {
      admins = new Set(
        meta.participants
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

  queueMicrotask(() => {
    exec.call(this, m, {
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
    }).catch(e => {
      m.reply(`❌ Error:\n${e.message}`)
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