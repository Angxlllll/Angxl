const handler = async (m, { conn }) => {
  conn.sendMessage(
    m.chat,
    { text: '🔥 TEST OK, EL HANDLER FUNCIONA' },
    { quoted: m }
  )
}

handler.command = ['test']
handler.group = true
handler.admin = false

export default handler