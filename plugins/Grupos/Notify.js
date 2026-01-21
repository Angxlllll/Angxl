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
    root?.audioMessage?.contextInfo ||
    root?.stickerMessage?.contextInfo ||
    root?.documentMessage?.contextInfo ||
    null

  return ctx?.quotedMessage
    ? unwrapMessage(ctx.quotedMessage)
    : null
}

const handler = async (m, { conn, args, participants = [] }) => {
  const quoted = getQuoted(m)
  const text = args.join(" ").trim()
  let msg = null

  // 🧠 CASO 1: Responde a algo
  if (quoted) {
    const type = getContentType(quoted)

    // 👉 Texto citado
    if (type === "conversation" || type === "extendedTextMessage") {
      msg = {
        text:
          quoted.conversation ||
          quoted.extendedTextMessage?.text
      }
    }

    // 👉 Media citada
    else {
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
  }

  // 🧠 CASO 2: .n texto
  if (!msg && text) {
    msg = { text }
  }

  // ❌ Uso incorrecto
  if (!msg) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          "❌ *Uso incorrecto*\n\n" +
          "• `.n texto`\n" +
          "• Responde a un mensaje con `.n texto`"
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
    { quoted: m }
  )
}

handler.command = ["n", "tag", "notify"]
handler.group = true
handler.admin = true

export default handler