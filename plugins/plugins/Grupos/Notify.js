import {
  getContentType,
  downloadContentFromMessage
} from "@whiskeysockets/baileys"

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
    root?.audioMessage?.contextInfo ||
    root?.stickerMessage?.contextInfo ||
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

    if (directType === "audioMessage") {
      msg = {
        audio: buffer,
        mimetype: direct.audioMessage?.mimetype || "audio/mpeg",
        ptt: false
      }
    } else {
      msg = {
        [directType.replace("Message", "")]: buffer,
        caption: text || undefined
      }
    }
  }

  else if (quoted) {
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

      if (type === "audioMessage") {
        msg = {
          audio: buffer,
          mimetype: quoted.audioMessage?.mimetype || "audio/mpeg",
          ptt: false
        }
      } else {
        msg = {
          [type.replace("Message", "")]: buffer,
          caption: text || undefined
        }
      }
    }
  }

  else if (text) {
    msg = { text }
  }

  if (!msg) {
    return m.reply(
      "❌ *Uso incorrecto*\n\n" +
      "• `.n texto`\n" +
      "• Responde a un mensaje con `.n`"
    )
  }

  await conn.sendMessage(
  m.chat,
  {
    ...msg,
    contextInfo: {
      mentionedJid: participants.map(p => p.id),
      forwardingScore: 1,
      isForwarded: true
    }
  },
  { quoted: m }
)
}

handler.command = ["n", "tag", "notify"]
handler.group = true
handler.admin = true
handler.help = ["𝖭𝗈𝗍𝗂𝖿𝗒"];
handler.tags = ["𝖦𝖱𝖴𝖯𝖮𝖲"];
export default handler