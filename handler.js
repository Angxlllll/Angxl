import { smsg, decodeJid } from './lib/simple.js'
import fs from 'fs'
import { fileURLToPath } from 'url'

const DIGITS = s => String(s || '').replace(/\D/g, '')

const OWNER_SET = new Set(
  (global.owner || []).map(v =>
    DIGITS(Array.isArray(v) ? v[0] : v)
  )
)

global.groupMetaCache ||= new Map()

const PREFIX_CACHE = {
  raw: null,
  list: null
}

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
  const fc = text[0]
  if (!prefixes.includes(fc)) return null
  const body = text.slice(1).trim()
  if (!body) return null
  const sp = body.indexOf(' ')
  const cmd =
    sp === -1 ? body : body.slice(0, sp)
  return {
    usedPrefix: fc,
    command: cmd
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, ''),
    args: sp === -1 ? [] : body.slice(sp + 1).split(/\s+/)
  }
}

export function handler(chatUpdate) {
  if (!chatUpdate?.messages) return
  for (const raw of chatUpdate.messages) {
    handleMessage.call(this, raw)
  }
}

async function handleMessage(raw) {
  let m = smsg(this, raw)
  if (!m || m.isBaileys || !m.text) return

  const prefixes = getPrefixes()
  const parsed = parseCommandFast(m.text, prefixes)
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

  const loadGroup = async () => {
    let cached = global.groupMetaCache.get(m.chat)
    if (!cached || Date.now() - cached.ts > 15000) {
      const meta = await this.groupMetadata(m.chat)
      const adminNums = new Set()
      for (const p of meta.participants || []) {
        if (p.admin) adminNums.add(DIGITS(p.id || p.jid))
      }
      cached = { ts: Date.now(), meta, adminNums }
      global.groupMetaCache.set(m.chat, cached)
    }
    groupMetadata = cached.meta
    participants = groupMetadata.participants
    isAdmin = cached.adminNums.has(senderNum)
    const botJid = DIGITS(decodeJid(this.user?.id))
    isBotAdmin = cached.adminNums.has(botJid)
  }

  for (const plugin of candidates) {
    if (!plugin || plugin.disabled) continue

    if (plugin.group && !m.isGroup)
      return global.dfail('group', m, this)

    if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
      if (!groupMetadata) await loadGroup()
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