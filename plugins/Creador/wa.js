import fetch from "node-fetch"

const handler = async (msg, { conn }) => {
  const chatID = msg.key.remoteJid
  const text = msg.text?.trim()

  if (!text) {
    return conn.sendMessage(
      chatID,
      {
        text:
          "✳️ Uso correcto:\n\n" +
          ".bancheck <número>\n\n" +
          "> Ejemplo: .bancheck 584125877491"
      },
      { quoted: msg }
    )
  }

  const cleanNumber = text.replace(/\D/g, "")
  if (cleanNumber.length < 8) {
    return conn.sendMessage(
      chatID,
      { text: "❌ Número inválido. Debe tener al menos 8 dígitos." },
      { quoted: msg }
    )
  }

  await conn.sendMessage(chatID, {
    react: { text: "⏳", key: msg.key }
  })

  try {
    const res = await fetch(
      `https://io.tylarz.top/v1/bancheck?number=${cleanNumber}&lang=es`,
      {
        headers: {
          Accept: "application/json",
          "X-Api-Key": "nami"
        },
        timeout: 15000
      }
    )

    const data = await res.json()
    if (!data?.status) throw new Error("API inválida")

    if (data.data?.isBanned) {
      return conn.sendMessage(
        chatID,
        { text: `wa.me/${cleanNumber} *Baneado de WhatsApp*` },
        { quoted: msg }
      )
    }

    return conn.sendMessage(
      chatID,
      { text: "✅ Ese número NO está baneado" },
      { quoted: msg }
    )

  } catch (e) {
    await conn.sendMessage(
      chatID,
      { text: "❌ Error verificando el número." },
      { quoted: msg }
    )

    await conn.sendMessage(chatID, {
      react: { text: "❌", key: msg.key }
    })
  }
}

handler.command = ["wa"]
export default handler