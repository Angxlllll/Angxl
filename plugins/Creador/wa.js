import fetch from "node-fetch"

const handler = async (m, { conn, args }) => {
  const chatId = m.chat
  const text = args.join(" ").trim()

  if (!text) {
    return conn.sendMessage(
      chatId,
      {
        text:
          "✳️ Uso correcto:\n\n" +
          ".bancheck <número>\n\n" +
          "> Ejemplo: .wa 584125877491"
      },
      { quoted: m }
    )
  }

  const cleanNumber = text.replace(/\D/g, "")
  if (cleanNumber.length < 8) {
    return conn.sendMessage(
      chatId,
      { text: "❌ Número inválido. Debe tener al menos 8 dígitos." },
      { quoted: m }
    )
  }

  await conn.sendMessage(chatId, {
    react: { text: "⏳", key: m.key }
  })

  try {
    const res = await fetch(
      `https://io.tylarz.top/v1/bancheck?number=${cleanNumber}&lang=es`,
      {
        headers: {
          Accept: "application/json",
          "X-Api-Key": "nami"
        }
      }
    )

    const data = await res.json()
    if (!data?.status) throw new Error("API inválida")

    if (data.data?.isBanned) {
      return conn.sendMessage(
        chatId,
        { text: `wa.me/${cleanNumber} *Baneado de WhatsApp*` },
        { quoted: m }
      )
    }

    return conn.sendMessage(
      chatId,
      { text: "✅ Ese número NO está baneado" },
      { quoted: m }
    )

  } catch {
    await conn.sendMessage(
      chatId,
      { text: "❌ Error verificando el número." },
      { quoted: m }
    )
  }
}

handler.command = ["wa", "banverify", "checkban", "check"]
export default handler