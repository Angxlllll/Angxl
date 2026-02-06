const handler = async (m, { conn }) => {
  if (!m.isGroup) return

  try {
    const code = await conn.groupInviteCode(m.chat)
    const link = `https://chat.whatsapp.com/${code}`

    await conn.sendMessage(
      m.chat,
      { text: link },
      { quoted: m }
    )
  } catch (e) {
    await m.reply('❌ No pude obtener el link del grupo.')
  }
}

handler.customPrefix = /^\.?(link|damelink)$/i
handler.group = true

export default handler