import axios from "axios"

const handler = async (msg, { conn, args }) => {
  const chatID = msg.chat
  const text = args.join(" ").trim()

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
    const { data } = await axios.get(
      "https://io.tylarz.top/v1/bancheck",
      {
        params: {
          number: cleanNumber,
          lang: "es"
        },
        headers: {
          Accept: "application/json",
          "X-Api-Key": "nami"
        },
        timeout: 15000
      }
    )

    if (!data?.status) throw "API inválida"

    if (data.data?.isBanned) {
      return conn.sendMessage(
        chatID,
        { text: `wa.me/${cleanNumber}\n\n𝖥𝗈𝗂 𝖡𝖺𝗇𝗂𝖽𝗈 𝖣𝗈 𝖶𝗁𝖺𝗍𝗌𝖠𝗉𝗉. 𝖥𝖺𝗅𝖾 𝖢𝗈𝗇𝗈𝗌𝖼𝗈 𝖯𝖺𝗋𝖺 𝖮𝖻𝗍𝖾𝗋 𝖠𝗃𝗎𝖽𝖺.` },
        { quoted: msg }
      )
    }

    return conn.sendMessage(
      chatID,
      { text: "𝖳𝗁𝖺𝗍 𝖯𝗁𝗈𝗇𝖾 𝖭𝗎𝗆𝖻𝖾𝗋 𝗂𝗌 𝖲𝗍𝗂𝗅𝗅 𝖠𝖼𝗍𝗂𝗏𝖾, 𝖡𝖺𝗇 𝗂𝗍 𝗊𝗎𝗂𝖼𝗄𝗅𝗒" },
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

handler.command = ["wa", "banverify", "checkban", "check"]
export default handler