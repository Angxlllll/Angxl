const handler = async (m, { conn, args }) => {
  const text = args.join(' ').trim()

  if (!text) {
    return m.reply('*𝖰𝗎𝖾 𝖭𝗈𝗆𝖻𝗋𝖾 𝖣𝖾𝗌𝖾𝖺𝗌 𝖯𝗈𝗇𝖾𝗋𝗆𝖾*')
  }

  try {
    conn.sendMessage(m.chat, {
      react: { text: '✏️', key: m.key }
    })

    await conn.updateProfileName(text)

    m.reply('*𝖭𝗈𝗆𝖻𝗋𝖾 𝖢𝖺𝗆𝖻𝗂𝖺𝖽𝗈 𝖤𝗑𝗂𝗍𝗈𝗌𝖺𝗆𝖾𝗇𝗍𝖾*')
  } catch (e) {
    console.error(e)

    conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    })

    m.reply('*𝖠𝗁 𝖮𝖼𝗎𝗋𝗋𝗂𝖽𝗈 𝖴𝗇 𝖤𝗋𝗋𝗈𝗋 𝖨𝗇𝖾𝗌𝗉𝖾𝗋𝖺𝖽𝗈*')
  }
}

handler.help = ['𝖲𝖾𝗍𝗇𝖺𝗆𝖾𝖻𝗈𝗍 <𝖳𝖾𝗑𝗍𝗈>']
handler.tags = ['𝖮𝖶𝖭𝖤𝖱']
handler.command = ['setnamebot', 'namebot', 'cambiarnamebot']
handler.owner = true
export default handler