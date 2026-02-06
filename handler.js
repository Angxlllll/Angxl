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
    mods: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝖽𝗈 𝖯𝗈𝗋 𝖽𝖾𝗌𝖺𝗋𝗋𝗈𝗅𝗅𝖺𝖽𝗈𝗋𝖾𝗌',
    premium: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖫𝗈 𝖯𝗎𝖾𝖽𝖾𝗇 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝗋 𝖴𝗌𝖺𝗋𝗂𝗈𝗌 𝖯𝗋𝖾𝗆𝗂𝗎𝗆',
    group: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖥𝗎𝗇𝖼𝗂𝗈𝗇𝖺 𝖤𝗇 𝖦𝗋𝗎𝗉𝖺𝗌',
    private: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖲𝖾 𝖯𝗎𝖾𝖽𝖾 𝖮𝖼𝗎𝗉𝖺𝗋 𝖤𝗇 𝖤𝗅 𝖯𝗋𝗂𝗏𝖺𝖽𝗈',
    admin: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝖽𝗈 𝖯𝗈𝗋 𝖠𝖽𝗆𝗂𝗌𝗍𝗋𝖺𝖽𝗈𝗋𝖾𝗌',
    botAdmin: '𝖭𝖾𝖼𝗌𝗂𝗍𝗈 𝗌𝖾𝗋 𝖠𝖽𝗆𝗂𝗇',
    restrict: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖧𝖺 𝖲𝗂𝖽𝗈 𝖣𝖾𝗌𝖺𝖻𝗂𝗅𝗂𝗍𝖺𝖽𝗈'
  }[type]
  if (msg) await conn.sendMessage(m.chat, { text: msg }, { quoted: m })
}

global.groupMetaCache ||= new Map()
const GROUP_TTL = 15_000

async function loadGroupContext(conn, jid) {
  const now = Date.now()
  let cached = global.groupMetaCache.get(jid)

  if (!cached || now - cached.ts > GROUP_TTL) {
    const meta = await conn.groupMetadata(jid)
    const adminNums = new Set()
    for (const p of meta.participants || []) {
      if (p.admin) adminNums.add(DIGITS(p.id || p.jid))
    }
    cached = { ts: now, meta, adminNums }
    global.groupMetaCache.set(jid, cached)
  }

  return cached
}

const PREFIX_CACHE = { raw: null, list: null }

function getPrefixes() {
  if (PREFIX_CACHE.raw !== global.prefixes) {
    PREFIX_CACHE.raw = global.prefixes
    PREFIX_CACHE.list = Object.freeze(
      Array.isArray(global.prefixes)
        ? global.prefixes
        : [global.prefix || '.']
    )
  }
  return PREFIX_CACHE.list
}

function parseCommandFast(text, prefixes) {
  const first = text[0]
  if (!prefixes.includes(first)) return null

  const body = text.slice(1).trim()
  if (!body) return null

  const i = body.indexOf(' ')
  const cmd = (i === -1 ? body : body.slice(0, i))
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')

  return {
    usedPrefix: first,
    command: cmd,
    args: i === -1 ? [] : body.slice(i + 1).split(/\s+/)
  }
}

export function handler(chatUpdate) {
  if (!chatUpdate?.messages) return
  for (const raw of chatUpdate.messages) {
    handleMessage.call(this, raw)
  }
}

async function handleMessage(raw) {
  const m = smsg(this, raw)
if (!m || m.isBaileys) return

const text = m.text
if (!text) return

const parsed = parseCommandFast(text, getPrefixes())

if (!parsed && !global._customPrefixPlugins?.length) return

  const { command, args, usedPrefix } = parsed || {}

  const senderNum = DIGITS(m.sender)
  const isROwner = OWNER_SET.has(senderNum)
  const isOwner = isROwner || m.fromMe

  let candidates = null

  if (command && global.pluginCommandIndex?.has(command)) {
    candidates = global.pluginCommandIndex.get(command)
  }

  if (global._customPrefixPlugins?.length) {
    for (const p of global._customPrefixPlugins) {
      if (p.customPrefix?.test(m.text)) {
        candidates ||= []
        candidates.push(p)
      }
    }
  }

  if (!candidates?.length) return

  let groupMetadata, participants, isAdmin, isBotAdmin

  for (const plugin of candidates) {
    if (!plugin || plugin.disabled) continue

    if (plugin.group && !m.isGroup)
      return global.dfail('group', m, this)

    if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
      const cached = await loadGroupContext(this, m.chat)
      groupMetadata = cached.meta
      participants = cached.meta.participants
      isAdmin = cached.adminNums.has(senderNum)
      isBotAdmin = cached.adminNums.has(
        DIGITS(decodeJid(this.user?.id))
      )
    }

    if (plugin.rowner && !isROwner)
      return global.dfail('rowner', m, this)
    if (plugin.owner && !isOwner)
      return global.dfail('owner', m, this)
    if (plugin.admin && !isAdmin)
      return global.dfail('admin', m, this)
    if (plugin.botAdmin && !isBotAdmin)
      return global.dfail('botAdmin', m, this)

    const exec =
      typeof plugin === 'function'
        ? plugin
        : plugin.default
    if (!exec) continue

    try {
      await exec.call(this, m, {
        conn: this,
        args,
        usedPrefix,
        command,
        participants,
        groupMetadata,
        isROwner,
        isOwner,
        isAdmin,
        isBotAdmin,
        chat: m.chat
      })
    } catch (e) {
      console.error('[PLUGIN ERROR]', plugin?.name || command, e)
    }
    return
  }
}

if (process.env.NODE_ENV === 'development') {
  const file = fileURLToPath(import.meta.url)
  fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log('handler.js actualizado')
  })
}