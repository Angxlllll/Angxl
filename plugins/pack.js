const handler = async (m, { conn }) => {
  const txt = '👋 Hola, elige una opción:'
  const dev = 'Angel Bot'
  const img = 'https://i.imgur.com/9QpZK0K.jpeg'

  await conn.sendMessage(m.chat, {
    image: { url: img },
    caption: txt,
    footer: dev,
    buttons: [
      {
        buttonId: '.menu',
        buttonText: { displayText: 'Menu' }
      },
      {
        buttonId: '.owner',
        buttonText: { displayText: 'Owner' }
      }
    ],
    viewOnce: true,
    headerType: 4
  }, { quoted: m })
}

handler.command = ['hola']
export default handler