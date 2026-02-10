"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const API_BASE_GLOBAL = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY_GLOBAL = global.APIKeys?.may || ""

const API_BASE_ENV = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY_ENV = process.env.API_KEY || "Angxll"

const MAX_MB = 200
const TIMEOUT_MS = 60000
const STREAM_TIMEOUT = 300000

function ensureTmp() {
const tmp = path.join(process.cwd(), "tmp")
if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
return tmp
}

function isSkyUrl(url = "") {
try {
return new URL(url).host === new URL(API_BASE_ENV).host
} catch {
return false
}
}

async function sendFast(conn, msg, video, caption, signal) {
const res = await axios.get(`${API_BASE_GLOBAL}/ytdl`, {
params: { url: video.url, type: "mp4", apikey: API_KEY_GLOBAL },
timeout: 20000,
signal
})
if (!res?.data?.status || !res.data.result?.url) throw new Error("fast")
await conn.sendMessage(
msg.chat,
{ video: { url: res.data.result.url }, mimetype: "video/mp4", caption },
{ quoted: msg }
)
}

async function sendSafe(conn, msg, video, caption, signal) {
const r = await axios.post(
`${API_BASE_ENV}/youtube/resolve`,
{ url: video.url, type: "video" },
{ headers: { apikey: API_KEY_ENV }, validateStatus: () => true, signal }
)
const data = r.data
if (!data?.result?.media) throw new Error("safe")
let dl = data.result.media.dl_download || data.result.media.direct
if (!dl) throw new Error("safe")
if (dl.startsWith("/")) dl = API_BASE_ENV + dl
const headers = isSkyUrl(dl) ? { apikey: API_KEY_ENV } : {}
await conn.sendMessage(
msg.chat,
{ video: { url: dl }, mimetype: "video/mp4", caption },
{ quoted: msg }
)
}

const savetube = {
key: Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex"),
decrypt: enc => {
const b = Buffer.from(enc.replace(/\s/g, ""), "base64")
const iv = b.subarray(0, 16)
const data = b.subarray(16)
const d = crypto.createDecipheriv("aes-128-cbc", savetube.key, iv)
return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString())
},
download: async (url, signal) => {
const random = await axios.get("https://media.savetube.vip/api/random-cdn", {
headers: {
origin: "https://save-tube.com",
referer: "https://save-tube.com/",
"User-Agent": "Mozilla/5.0"
},
signal
})
const cdn = random.data.cdn
const info = await axios.post(`https://${cdn}/v2/info`, { url }, {
headers: {
"Content-Type": "application/json",
origin: "https://save-tube.com",
referer: "https://save-tube.com/",
"User-Agent": "Mozilla/5.0"
},
signal
})
if (!info.data?.status) throw new Error("savetube")
const json = savetube.decrypt(info.data.data)
const format = json.video_formats.find(v => v.quality === 720) || json.video_formats[0]
const dlRes = await axios.post(`https://${cdn}/download`, {
id: json.id,
key: json.key,
downloadType: "video",
quality: String(format.quality)
}, {
headers: {
"Content-Type": "application/json",
origin: "https://save-tube.com",
referer: "https://save-tube.com/",
"User-Agent": "Mozilla/5.0"
},
signal
})
const downloadUrl = dlRes.data?.data?.downloadUrl
if (!downloadUrl) throw new Error("savetube")
return downloadUrl
}
}

async function sendSaveTube(conn, msg, video, caption, signal) {
const dl = await savetube.download(video.url, signal)
await conn.sendMessage(
msg.chat,
{ video: { url: dl }, mimetype: "video/mp4", caption },
{ quoted: msg }
)
}

const handler = async (msg, { conn, args, usedPrefix, command }) => {
const query = args.join(" ").trim()
if (!query) {
return conn.sendMessage(
msg.chat,
{ text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>` },
{ quoted: msg }
)
}

await conn.sendMessage(msg.chat, { react: { text: "🎬", key: msg.key } })

const search = await yts(query)
const video = search.videos?.[0]
if (!video) throw new Error("Sin resultados")

const caption = `🎬 *${video.title}*\n🎥 ${video.author?.name || "—"}\n⏱ ${video.timestamp || "--:--"}`

const controllers = [
new AbortController(),
new AbortController(),
new AbortController()
]

const tasks = [
sendFast(conn, msg, video, caption, controllers[0].signal),
sendSafe(conn, msg, video, caption, controllers[1].signal),
sendSaveTube(conn, msg, video, caption, controllers[2].signal)
]

let finished = false

await Promise.race([
Promise.any(tasks.map((p, i) =>
p.then(() => {
if (!finished) {
finished = true
controllers.forEach((c, idx) => idx !== i && c.abort())
}
})
)),
new Promise((_, r) => setTimeout(() => r(new Error("Tiempo de espera agotado")), TIMEOUT_MS))
]).catch(async e => {
await conn.sendMessage(
msg.chat,
{ text: `❌ Error: ${e.message}` },
{ quoted: msg }
)
})
}

handler.command = ["play2"]
handler.help = ["play2 <texto>"]
handler.tags = ["descargas"]

export default handler