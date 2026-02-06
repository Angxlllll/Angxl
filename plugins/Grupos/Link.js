const handler = async (m, { conn }) => {
  const chat = m.chat

  await conn.sendMessage(chat, {
    react: { text: "🔗", key: m.key }
  })

  try {
    const meta = await conn.groupMetadata(chat)
    const groupName = meta.subject || "Grupo"

    let inviteCode
    try {
      inviteCode = await conn.groupInviteCode(chat)
    } catch {
      return m.reply("❌ No pude obtener el enlace.")
    }

    const link = `https://chat.whatsapp.com/${inviteCode}`

    const pp =
      await conn.profilePictureUrl(chat, "image").catch(() => null)

    const message = {
      text: `*${groupName}*\n\n${link}`,
      footer: "🔗 Enlace del grupo",
      templateButtons: [
        {
          index: 1,
          urlButton: {
            displayText: "Abrir enlace",
            url: link
          }
        }
      ]
    }

    if (pp) message.image = { url: pp }

    await conn.sendMessage(chat, message, { quoted: m })
  } catch (e) {
    console.error(e)
    m.reply("⚠️ Error al generar el enlace.")
  }
}

handler.customPrefix = /^\.?(link|damelink)$/i
handler.group = true
handler.botAdmin = true
export default handler