import { readFile, writeFile, access } from 'fs/promises'
import {
  initAuthCreds,
  BufferJSON,
  proto,
  jidNormalizedUser
} from '@whiskeysockets/baileys'

const jidCache = new Map()
const JID_LIMIT = 5000

function normalize(jid) {
  if (!jid) return null
  const cached = jidCache.get(jid)
  if (cached) return cached
  let v
  try {
    v = jidNormalizedUser(jid)
  } catch {
    v = null
  }
  if (v) {
    jidCache.set(jid, v)
    if (jidCache.size > JID_LIMIT) {
      jidCache.delete(jidCache.keys().next().value)
    }
  }
  return v
}

function bind(conn) {
  if (conn.__storeBound) return
  conn.__storeBound = true

  conn.chats ||= Object.create(null)

  const upsert = id => (conn.chats[id] ||= { id })

  conn.ev.on('groups.update', updates => {
    if (!updates) return
    for (const u of updates) {
      const id = normalize(u.id)
      if (!id || !id.endsWith('@g.us')) continue
      const chat = upsert(id)
      if (u.subject) chat.subject = u.subject
    }
  })
}

const KEY_MAP = {
  'pre-key': 'preKeys',
  session: 'sessions',
  'sender-key': 'senderKeys',
  'app-state-sync-key': 'appStateSyncKeys',
  'app-state-sync-version': 'appStateVersions',
  'sender-key-memory': 'senderKeyMemory'
}

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function useSingleFileAuthState(file, logger) {
  let creds
  let keys = Object.create(null)
  let dirty = false
  let saving = false
  let saveTimer

  const load = async () => {
    if (await fileExists(file)) {
      const raw = await readFile(file)
      const data = JSON.parse(raw, BufferJSON.reviver)
      creds = data.creds
      keys = data.keys || {}
    } else {
      creds = initAuthCreds()
    }
  }

  const scheduleSave = () => {
    dirty = true
    if (saving) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 500)
  }

  const save = async () => {
    if (!dirty || saving) return
    saving = true
    dirty = false
    try {
      await writeFile(
        file,
        JSON.stringify({ creds, keys }, BufferJSON.replacer)
      )
      logger?.trace?.('auth state saved')
    } finally {
      saving = false
    }
  }

  load()

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const store = keys[KEY_MAP[type]] || {}
          return Object.fromEntries(
            ids
              .map(id => {
                let v = store[id]
                if (!v) return null
                if (type === 'app-state-sync-key') {
                  v = proto.AppStateSyncKeyData.fromObject(v)
                }
                return [id, v]
              })
              .filter(Boolean)
          )
        },
        set: data => {
          for (const type in data) {
            const key = KEY_MAP[type]
            keys[key] ||= {}
            Object.assign(keys[key], data[type])
          }
          scheduleSave()
        }
      }
    },
    saveState: save
  }
}

export default {
  bind,
  useSingleFileAuthState
}