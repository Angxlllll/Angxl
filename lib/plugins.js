import { readdirSync, existsSync, readFileSync, watch } from 'fs'
import { join, resolve } from 'path'
import { format } from 'util'
import syntaxerror from 'syntax-error'
import importFile from './import.js'
import Helper from './helper.js'

const __dirname = Helper.__dirname(import.meta)
const pluginFolder = Helper.__dirname(join(__dirname, '../plugins'))
const pluginFilter = file => /\.(mc)?js$/i.test(file)

const plugins = Object.create(null)
const watchers = Object.create(null)
const reloadQueue = new Map()

function getAllPluginFiles(dir) {
  let files = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (!existsSync(full)) continue
    try {
      if (readdirSync(full)) {
        files.push(...getAllPluginFiles(full))
      }
    } catch {
      if (pluginFilter(name)) files.push(full)
    }
  }
  return files
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

function reloadPlugin(file, conn) {
  if (!existsSync(file)) {
    delete plugins[file]
    return conn?.logger?.warn(`deleted plugin '${file}'`)
  }

  let data
  try {
    data = readFileSync(file)
  } catch {
    return
  }

  const err = syntaxerror(data, file, {
    sourceType: 'module',
    allowAwaitOutsideFunction: true
  })

  if (err) {
    return conn?.logger?.error(`syntax error in '${file}'\n${format(err)}`)
  }

  loadPlugin(file, conn)
}

function watchPlugin(file, conn) {
  if (watchers[file]) return

  watchers[file] = watch(file, () => {
    if (reloadQueue.has(file)) clearTimeout(reloadQueue.get(file))
    reloadQueue.set(
      file,
      setTimeout(() => {
        reloadQueue.delete(file)
        reloadPlugin(file, conn)
      }, 250)
    )
  })
}

async function filesInit(folder = pluginFolder, conn) {
  const base = resolve(folder)
  const files = getAllPluginFiles(base)

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