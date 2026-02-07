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

const GROUP_TTL = 60000
global.groupMetaCache ||= new Map()

async function getGroupInfo(conn, jid) {
  const now = Date.now()
  const cached = global.groupMetaCache.get(jid)
  if (cached && now - cached.ts < GROUP_TTL) return cached

  const meta = await conn.groupMetadata(jid)
  const admins = new Set(
    meta.participants
      .filter(p => p.admin)
      .map(p => DIGITS(p.id))
  )

  const data = { ts: now, meta, admins }
  global.groupMetaCache.set(jid, data)
  return data
}

export function handler(chatUpdate) {
  if (!chatUpdate?.messages) return
  for (const raw of chatUpdate.messages) handleMessage.call(this, raw)
}

async function handleMessage(raw) {
  const m = smsg(this, raw)
  if (!m || m.isBaileys || !m.text) return

  const text = m.text
  const c = text.charCodeAt(0)
  if (c !== 46 && c !== 33) return

  const space = text.indexOf(' ')
  const command = (space === -1 ? text.slice(1) : text.slice(1, space))
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')

  const plugin = global.COMMAND_MAP?.get(command)
  if (!plugin || plugin.disabled) return

  if (plugin.group && !m.isGroup)
    return global.dfail('group', m, this)

  const senderNum = DIGITS(m.sender)
  const isROwner = OWNER_SET.has(senderNum)
  const isOwner = isROwner || m.fromMe

  if (plugin.rowner && !isROwner)
    return global.dfail('rowner', m, this)

  if (plugin.owner && !isOwner)
    return global.dfail('owner', m, this)

  let isAdmin = false
  let isBotAdmin = false
  let participants = null
  let groupMetadata = null

  if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
    const info = await getGroupInfo(this, m.chat)
    isAdmin = info.admins.has(senderNum)
    isBotAdmin = info.admins.has(
      DIGITS(decodeJid(this.user.id))
    )
    participants = info.meta.participants
    groupMetadata = info.meta
  }

  if (plugin.admin && !isAdmin)
    return global.dfail('admin', m, this)

  if (plugin.botAdmin && !isBotAdmin)
    return global.dfail('botAdmin', m, this)

  const args = space === -1 ? [] : text.slice(space + 1).split(/\s+/)

  const exec = plugin.exec || plugin.default || plugin
  if (!exec) return

  try {
    await exec.call(this, m, {
      conn: this,
      args,
      command,
      usedPrefix: text[0],
      participants,
      groupMetadata,
      isROwner,
      isOwner,
      isAdmin,
      isBotAdmin,
      chat: m.chat
    })
  } catch (e) {
    if (process.env.NODE_ENV === 'development')
      console.error('[PLUGIN ERROR]', plugin.name, e)
  }
}

if (process.env.NODE_ENV === 'development') {
  const file = fileURLToPath(import.meta.url)
  fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log('handler.js actualizado')
  })
}