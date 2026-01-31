const handler = async (m, { conn, isAdmin }) => {
  if (isAdmin) {
    return m.reply('*𝖸𝖺 𝖤𝗋𝖾𝗌 𝖠𝖽𝗆𝗂𝗇 𝖩𝖾𝖿𝖾*')
  }

  conn.sendMessage(m.chat, {
    react: { text: '⚙️', key: m.key }
  })

  try {
    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'promote')

    conn.sendMessage(m.chat, {
      react: { text: '⭐', key: m.key }
    })

    m.reply('*𝖠𝗁𝗈𝗋𝖺 𝖤𝗋𝖾𝗌 𝖠𝖽𝗆𝗂𝗇 𝖩𝖾𝖿𝖾*')
  } catch {
    conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    })

    m.reply('*𝖭𝗈 𝗉𝗎𝖽𝗈 𝖽𝖺𝗋𝗍𝖾 𝖺𝖽𝗆𝗂𝗇*')
  }
}

handler.help = ['𝖠𝗎𝗍𝗈𝖺𝖽𝗆𝗂𝗇']
handler.tags = ['𝖮𝖶𝖭𝖤𝖱']
handler.command = ['autoadmin'];
handler.owner = true;
handler.group = true;
export default handler;