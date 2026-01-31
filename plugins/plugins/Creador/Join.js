const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i

const handler = async (m, { conn, args }) => {
  const text = args.join(' ').trim()

  if (!text) {
    return m.reply(
      '𝖨𝗇𝗀𝗋𝖾𝗌𝖺 𝖤𝗅 𝖤𝗇𝗅𝖺𝖼𝖾 𝖣𝖾𝗅 𝖦𝗋𝗎𝗉𝗈 𝖠𝗅 𝖰𝗎𝖾 𝖬𝖾 𝖴𝗇𝗂𝗋𝖾'
    )
  }

  const match = text.match(linkRegex)
  if (!match) {
    return m.reply('𝖤𝗇𝗅𝖺𝖼𝖾 𝖨𝗇𝗏𝖺𝗅𝗂𝖽𝗈')
  }

  try {
    await conn.groupAcceptInvite(match[1])
    m.reply('𝖬𝖾 𝖴𝗇𝗂 𝖤𝗑𝗂𝗍𝗈𝗌𝖺𝗆𝖾𝗇𝗍𝖾 𝖠𝗅 𝖦𝗋𝗎𝗉𝗈')
  } catch (e) {
    console.error(e)
    m.reply('𝖠𝗁 𝖮𝖼𝗎𝗋𝗋𝗂𝖽𝗈 𝖴𝗇 𝖤𝗋𝗋𝗈𝗋 𝖨𝗇𝖾𝗌𝗉𝖾𝗋𝖺𝖽𝗈')
  }
}

handler.help = ['𝖩𝗈𝗂𝗇 <𝖫𝗂𝗇𝗄>']
handler.tags = ['𝖮𝖶𝖭𝖤𝖱']
handler.command = ['join', 'entrar']
handler.owner = true
export default handler