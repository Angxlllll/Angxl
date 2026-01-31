import fs from 'fs'
import path from 'path'

const handler = async (m, { conn }) => {
  const sessionPath = path.join('./', global.sessions)

  m.reply('🏞️ Iniciando limpieza completa de sesiones (excepto creds.json)...')

  if (!fs.existsSync(sessionPath)) {
    return m.reply('🏞️ La carpeta de sesiones no existe.')
  }

  let eliminados = 0

  try {
    const files = fs.readdirSync(sessionPath)

    for (const file of files) {
      if (file === 'creds.json') continue

      const fullPath = path.join(sessionPath, file)

      if (fs.lstatSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true })
      } else {
        fs.unlinkSync(fullPath)
      }

      eliminados++
    }

    if (!eliminados) {
      return m.reply('🏞️ No había sesiones para eliminar.')
    }

    m.reply(
      `🏞️ Se eliminaron correctamente *${eliminados}* sesiones.\n` +
      `📁 creds.json fue conservado.\n\n` +
      `🏞️ *¿Hola? ¿Ya me ves activo?*`
    )

  } catch (e) {
    console.error(e)
    m.reply('🏞️ Ocurrió un error limpiando las sesiones.')
  }
}

handler.help = ['𝖣𝗌𝗈𝗐𝗇𝖾𝗋']
handler.tags = ['𝖮𝖶𝖭𝖤𝖱']
handler.command = ['delai', 'dsowner', 'ds']
handler.owner = true
export default handler