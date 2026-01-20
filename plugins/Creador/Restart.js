import fs from 'fs'
import path from 'path'

const handler = async (m, { conn }) => {
  const chatId = m.chat

  await conn.sendMessage(chatId, {
    react: { text: '🔄', key: m.key }
  })

  await conn.sendMessage(
    chatId,
    {
      text: `🔄 *${global.namebot} se reiniciará en unos segundos...*`,
      ...global.rcanal
    },
    { quoted: m }
  )

  const restartPath = path.resolve('lastRestarter.json')
  fs.writeFileSync(restartPath, JSON.stringify({ chatId }, null, 2))

  setTimeout(() => process.exit(1), 3000)
}

handler.command = ["rest", "restart"];
handler.help = ['𝖱𝖾𝗌𝗍𝖺𝗋𝗍']
handler.tags = ['𝖮𝖶𝖭𝖤𝖱']
handler.owner = true
export default handler;