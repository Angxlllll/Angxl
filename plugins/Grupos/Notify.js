import {
  getContentType,
  downloadContentFromMessage
} from "@whiskeysockets/baileys"
import fetch from 'node-fetch'

let thumb = null
fetch('https://files.catbox.moe/cfrof9.jpg')
  .then(r => r.arrayBuffer())
  .then(buf => thumb = Buffer.from(buf))
  .catch(() => null)

const fkontak = {
  key: {
    participants: '0@s.whatsapp.net',
    fromMe: false,
    id: 'Angel'
  },
  message: {
    locationMessage: {
      name: '𝖧𝗈𝗅𝖺, 𝖲𝗈𝗒 𝖠𝗇𝗀𝖾𝗅 𝖡𝗈𝗍',
      jpegThumbnail: thumb
    }
  },
  participant: '0@s.whatsapp.net'
}

function unwrapMessage(m) {
  let n = m
  while (
    n?.viewOnceMessage?.message ||
    n?.viewOnceMessageV2?.message ||
    n?.viewOnceMessageV2Extension?.message ||
    n?.ephemeralMessage?.message
  ) {
    n =
      n.viewOnceMessage?.message ||
      n.viewOnceMessageV2?.message ||
      n.viewOnceMessageV2Extension?.message ||
      n.ephemeralMessage?.message
  }
  return n
}

function getQuoted(msg) {
  const root = unwrapMessage(msg.message) || {}
  const ctx =
    root?.extendedTextMessage?.contextInfo ||
    root?.imageMessage?.contextInfo ||
    root?.videoMessage?.contextInfo ||
    root?.documentMessage?.contextInfo ||
    null

  return ctx?.quotedMessage
    ? unwrapMessage(ctx.quotedMessage)
    : null
}

const handler = async (m, { conn, args, participants = [] }) => {
  const text = args.join(" ").trim()
  const quoted = getQuoted(m)

  let msg = null

  const direct = unwrapMessage(m.message)
  const directType = getContentType(direct)

  if (
    directType &&
    directType !== "conversation" &&
    directType !== "extendedTextMessage"
  ) {
    const stream = await downloadContentFromMessage(
      direct[directType],
      directType.replace("Message", "")
    )

    let buffer = Buffer.alloc(0)
    for await (const c of stream) buffer = Buffer.concat([buffer, c])

    msg = {
      [directType.replace("Message", "")]: buffer,
      caption: text || undefined
    }
  } else if (quoted) {
    const type = getContentType(quoted)

    if (type === "conversation" || type === "extendedTextMessage") {
      msg = {
        text:
          quoted.conversation ||
          quoted.extendedTextMessage?.text
      }
    } else {
      const stream = await downloadContentFromMessage(
        quoted[type],
        type.replace("Message", "")
      )

      let buffer = Buffer.alloc(0)
      for await (const c of stream) buffer = Buffer.concat([buffer, c])

      msg = {
        [type.replace("Message", "")]: buffer,
        caption: text || undefined
      }
    }
  } else if (text) {
    msg = { text }
  }

  if (!msg) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          "❌ *Uso incorrecto*\n\n" +
          "• Envía una imagen/video con `.n texto`\n" +
          "• O responde a un mensaje con `.n texto`"
      },
      { quoted: m }
    )
  }

  await conn.sendMessage(
    m.chat,
    {
      ...msg,
      mentions: participants.map(p => p.id)
    },
    { quoted: fkontak }
  )
}

handler.command = ["n", "tag", "notify"]
handler.group = true
handler.admin = true

export default handler