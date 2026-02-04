import fs from 'fs'
import path from 'path'

const handler = async (m, { conn }) => {
  const chatId = m.chat

  await conn.sendMessage(chatId, {
    react: { text: '🔄', key: m.key }
  })

  const msg = await conn.sendMessage(
    chatId,
    {
      text: `🔄 *${global.namebot} se reiniciará en unos segundos...*`
    },
    { quoted: m }
  )

  const restartPath = path.resolve('lastRestarter.json')
  fs.writeFileSync(
    restartPath,
    JSON.stringify(
      {
        chatId,
        key: msg.key
      },
      null,
      2
    )
  )

  setTimeout(() => process.exit(1), 3000)
}

handler.command = ['rest', 'restart']
handler.help = ['Restart']
handler.tags = ['OWNER']
handler.owner = true

export default handler