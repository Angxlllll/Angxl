const handler = async (m, { conn }) => {
  const txt = '👋 Hola, elige una opción:'
  const dev = 'Angel Bot'
  const img = 'https://files.catbox.moe/xr2m6u.jpg'

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