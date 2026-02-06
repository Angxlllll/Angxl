import fs from 'fs'
import path from 'path'

const handler = async (m, { conn }) => {
  const pluginRoot = path.join(process.cwd(), 'plugins')

  let total = 0
  let errores = []

  function revisar(dir) {
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file)

      if (fs.statSync(full).isDirectory()) {
        revisar(full)
      } else if (file.endsWith('.js')) {
        total++

        const err = syntaxerror(
          fs.readFileSync(full),
          file,
          { sourceType: 'module', allowAwaitOutsideFunction: true }
        )

        if (err) {
          errores.push(`✗ ${path.relative(pluginRoot, full)}\n${err.message}`)
        }
      }
    }
  }

  revisar(pluginRoot)

  let text = `📦 *REVISIÓN DE PLUGINS*\n\n`
  text += `• Total encontrados: *${total}*\n`
  text += `• Con errores: *${errores.length}*\n\n`

  if (errores.length) {
    text += `⚠️ *Errores detectados:*\n\n`
    text += errores.join('\n\n')
  } else {
    text += `✅ No se detectaron errores de sintaxis`
  }

  m.reply(text)
}

handler.command = ['revp']
handler.owner = true
handler.help = ['𝖱𝖾𝗏𝗉']
handler.tags = ['𝖮𝖶𝖭𝖤𝖱']
export default handler