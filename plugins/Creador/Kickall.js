const handler = async (m, { conn }) => {
  if (!m.isGroup) return

  const botJid = conn.user.jid
  const metadata = await conn.groupMetadata(m.chat)
  const participants = metadata.participants

  const expulsar = participants
    .filter(p => p.id !== botJid)
    .map(p => p.id)

  if (!expulsar.length) {
    return m.reply('*✅ No hay miembros para expulsar*')
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, expulsar, 'remove')
    await m.reply(`💣 *${expulsar.length} miembros expulsados*`)
    await conn.groupLeave(m.chat)
  } catch (e) {
    await m.reply('*⚠️ WhatsApp bloqueó la acción*')
  }
}

handler.help = ['𝖪𝗂𝖼𝗄𝖺𝗅𝗅']
handler.tags = ['𝖮𝖶𝖭𝖤𝖱']
handler.command = ['kickall']
handler.group = true
handler.owner = true
export default handler