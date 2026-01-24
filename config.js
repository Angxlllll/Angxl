import { fileURLToPath } from 'url'

global.owner = Object.freeze([
  '5714222810',
  '159606034665538',
  '525542690330',
  '205819731832938'
])

global.bot = Object.freeze({
  name: '𝖠𝗇𝗀𝖾𝗅 𝖡𝗈𝗍',
  alias: '𝖠𝗇𝗀𝖾𝗅 𝖡𝗈𝗍',
  packname: '𝖠𝗇𝗀𝖾𝗅 𝖡𝗈𝗍',
  author: '𝖠𝗇𝗀𝖾𝗅',
  session: '𝖠𝗇𝗀𝖾𝗅𝖡𝗈𝗍',
  banner: 'https://files.catbox.moe/dkw6yn.jpg'
})

global.namebot = global.bot.name
global.botname = global.bot.alias
global.packname = global.bot.packname
global.author = global.bot.author
global.sessions = global.bot.session
global.banner = global.bot.banner

global.APIs = Object.freeze({
  may: 'https://mayapi.ooguy.com'
})

global.APIKeys = Object.freeze({
  may: process.env.MAY_API_KEY ?? 'may-684934ab'
})

global.__filename = path => fileURLToPath(path)