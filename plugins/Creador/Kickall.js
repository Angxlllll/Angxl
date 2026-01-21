let handler = async (m, { conn, participants }) => {
  const botJid = conn.user.jid

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
  } catch {
    await m.reply('*⚠️ WhatsApp bloqueó la acción*')
  }
}

handler.help = ['𝖪𝗂𝖼𝗄𝖺𝗅𝗅']
handler.tags = ['𝖮𝖶𝖭𝖤𝖱']
handler.command = ['kickall']
handler.owner = true
handler.group = true

export default handler