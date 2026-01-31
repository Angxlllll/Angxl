const unwrapMessage = m => {
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

const getWA = (ctx, conn) =>
  ctx?.wa?.downloadContentFromMessage
    ? ctx.wa
    : conn?.wa?.downloadContentFromMessage
      ? conn.wa
      : global.wa?.downloadContentFromMessage
        ? global.wa
        : null

const handler = async (msg, ctx = {}) => {
  const { conn } = ctx
  const chat = msg.key.remoteJid
  const wa = getWA(ctx, conn)

  try {
    if (!wa) {
      return conn.sendMessage(
        chat,
        { text: "⚠️ Helper de medios no disponible. Reinicia el bot." },
        { quoted: msg }
      )
    }

    const quotedRaw =
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

    if (!quotedRaw) {
      return conn.sendMessage(
        chat,
        { text: "❌ Responde a una imagen, video o audio." },
        { quoted: msg }
      )
    }

    const q = unwrapMessage(quotedRaw)

    let type, content
    if (q.imageMessage) {
      type = "image"
      content = q.imageMessage
    } else if (q.videoMessage) {
      type = "video"
      content = q.videoMessage
    } else if (q.audioMessage) {
      type = "audio"
      content = q.audioMessage
    } else {
      return conn.sendMessage(
        chat,
        { text: "❌ El mensaje citado no es compatible." },
        { quoted: msg }
      )
    }

    await conn.sendMessage(chat, {
      react: { text: "⏳", key: msg.key }
    })

    const stream = await wa.downloadContentFromMessage(content, type)
    let buffer = Buffer.alloc(0)
    for await (const c of stream) buffer = Buffer.concat([buffer, c])

    const payload = {
      mimetype: content.mimetype
    }

    if (type === "image") {
      payload.image = buffer
    } else if (type === "video") {
      payload.video = buffer
    } else {
      payload.audio = buffer
      payload.ptt = content.ptt ?? true
    }

    await conn.sendMessage(chat, payload, { quoted: msg })

    await conn.sendMessage(chat, {
      react: { text: "✅", key: msg.key }
    })

  } catch (e) {
    console.error("Error en comando ver:", e)
    await conn.sendMessage(
      chat,
      { text: "❌ Error al procesar el archivo." },
      { quoted: msg }
    )
  }
}

handler.help = ["Reenviar"]
handler.tags = ["TOOLS"]
handler.command = ["ver", "reenviar"]

export default handler