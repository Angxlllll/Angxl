import { readdirSync, existsSync, readFile, watch } from 'fs'
import { join, resolve } from 'path'
import { format } from 'util'
import syntaxerror from 'syntax-error'
import importFile from './import.js'
import Helper from './helper.js'

const __dirname = Helper.__dirname(import.meta)
const pluginFolder = Helper.__dirname(join(__dirname, '../plugins'))
const pluginFilter = file => /\.(mc)?js$/.test(file)

let plugins = Object.create(null)
let watchers = Object.create(null)
let reloadQueue = new Map()

function getAllPluginFiles(dir) {
  let results = []
  for (const file of readdirSync(dir)) {
    const full = join(dir, file)
    if (existsSync(full) && readdirSync) {
      try {
        if (readdirSync(full)) {
          results.push(...getAllPluginFiles(full))
        }
      } catch {
        if (pluginFilter(file)) results.push(full)
      }
    }
  }
  return results
}

async function loadPlugin(file, conn) {
  try {
    const mod = await importFile(`${global.__filename(file)}?update=${Date.now()}`)
    plugins[file] = mod.default || mod
    conn?.logger?.info(`loaded plugin '${file}'`)
  } catch (e) {
    delete plugins[file]
    conn?.logger?.error(`error loading plugin '${file}'\n${format(e)}`)
  }
}

function watchPlugin(file, conn) {
  if (watchers[file]) return
  watchers[file] = watch(file, async () => {
    if (reloadQueue.has(file)) clearTimeout(reloadQueue.get(file))
    reloadQueue.set(file, setTimeout(async () => {
      reloadQueue.delete(file)
      if (!existsSync(file)) {
        delete plugins[file]
        return conn?.logger?.warn(`deleted plugin '${file}'`)
      }
      readFile(file, (err, data) => {
        if (err) return
        const syntax = syntaxerror(data, file, {
          sourceType: 'module',
          allowAwaitOutsideFunction: true
        })
        if (syntax) {
          return conn?.logger?.error(`syntax error in '${file}'\n${format(syntax)}`)
        }
        loadPlugin(file, conn)
      })
    }, 300))
  })
}

async function filesInit(folder = pluginFolder, conn) {
  const resolved = resolve(folder)
  const files = getAllPluginFiles(resolved)
  for (const file of files) {
    await loadPlugin(file, conn)
    watchPlugin(file, conn)
  }
  return plugins
}

export {
  pluginFolder,
  pluginFilter,
  plugins,
  filesInit
}