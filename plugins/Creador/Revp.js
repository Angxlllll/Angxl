import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const PLUGINS_DIR = path.resolve(__dirname, "..") // apunta a /plugins

const handler = async (m, { conn }) => {
  let total = 0
  let ok = 0
  let errors = []

  const walk = dir => {
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file)
      if (fs.statSync(full).isDirectory()) {
        walk(full)
      } else if (file.endsWith(".js")) {
        total++
        try {
          const plugin = global.plugins?.[full]

          if (!plugin) {
            errors.push(`❌ *No cargado*\n📄 ${full}`)
            return
          }

          const exec =
            typeof plugin === "function"
              ? plugin
              : typeof plugin.default === "function"
                ? plugin.default
                : null

          if (!exec) {
            errors.push(`❌ *Sin función exportada*\n📄 ${full}`)
            return
          }

          if (!plugin.command) {
            errors.push(`⚠️ *Sin command*\n📄 ${full}`)
            return
          }

          if (plugin.disabled) {
            errors.push(`🚫 *Plugin deshabilitado*\n📄 ${full}`)
            return
          }

          ok++
        } catch (e) {
          errors.push(`💥 *Error al cargar*\n📄 ${full}\n🧨 ${e.message}`)
        }
      }
    }
  }

  walk(PLUGINS_DIR)

  let txt = `🧩 *REVISIÓN DE PLUGINS*\n\n`
  txt += `📦 Total encontrados: ${total}\n`
  txt += `✅ Funcionales: ${ok}\n`
  txt += `❌ Con problemas: ${errors.length}\n`

  if (errors.length) {
    txt += `\n──────────────\n`
    txt += errors.join("\n\n")
  }

  await m.reply(txt)
}

handler.command = ["revp"]
handler.owner = true
handler.tags = ["dev"]
handler.help = ["revp"]

export default handler