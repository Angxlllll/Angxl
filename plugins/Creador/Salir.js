const handler = async (m, { conn }) => {
  const mensaje =
    `𝖥𝗎𝖾 𝖴𝗇 𝖦𝗎𝗌𝗍𝗈 𝖤𝗌𝗍𝖺𝗋 𝖠𝗊𝗎𝗂,\n` +
    `*${global.namebot}* 𝖲𝖾 𝖣𝖾𝗌𝗉𝗂𝖽𝖾`

  await conn.sendMessage(
    m.chat,
    { text: mensaje },
    { quoted: m }
  )

  await conn.groupLeave(m.chat)
}

handler.command = /^salir$/i
handler.group = true
handler.owner = true

export default handler