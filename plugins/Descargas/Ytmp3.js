import { exec } from "child_process"
import fs from "fs"
import path from "path"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const url = args[0]
  if (!url)
    return m.reply(`Uso: ${usedPrefix + command} <link de YouTube>`)


  const out = path.join("./tmp", `${Date.now()}.mp3`)

  try {
    exec(
      `yt-dlp -x --audio-format mp3 -o "${out}" "${url}"`,
      async (err) => {
        if (err) {
          return m.reply(`❌ yt-dlp falló:\n${err.message}`)
        }

        await conn.sendMessage(
          m.chat,
          {
            audio: fs.readFileSync(out),
            mimetype: "audio/mpeg",
            fileName: "audio.mp3"
          },
          { quoted: m }
        )

        fs.unlinkSync(out)
      }
    )
  } catch (e) {
    m.reply(`Error:\n${e.message}`)
  }
}

handler.command = /^ytmp3$/i
export default handler