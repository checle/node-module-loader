import Module from 'module'
import RegisterLoader from 'es-module-loader/core/register-loader.js'
import path from 'path'
import {ModuleNamespace} from 'es-module-loader/core/loader-polyfill.js'

const BASE_MODULE = Symbol()

let moduleIsRegistered = false

export default class Loader extends RegisterLoader {
  constructor (baseKey) {
    let baseModule

    if (baseKey == null) {
      baseModule = module

      do {
        baseModule = baseModule.parent
      } while (baseModule.parent)
    } else {
      let id = require.resolve(baseKey)

      baseModule = require.cache[id]
    }

    super(baseKey)

    this[BASE_MODULE] = baseModule
  }

  [RegisterLoader.resolve] (key, parentKey) {
    let baseModule = this[BASE_MODULE]
    let baseKey = baseModule.id

    if (parentKey == null) parentKey = baseKey

    let module = baseModule

    if (parentKey !== baseKey) {
      if (require.cache.hasOwnProperty(parentKey)) {
        module = require.cache[parentKey]
      } else {
        module = null
      }
    }

    if (module !== null) try {
      return Module._resolveFilename(key, module)
    } catch (e) { }

    if (key[0] === '.') return path.resolve(key, parentKey)
    else return path.resolve(key)
  }

  [RegisterLoader.instantiate] (key) {
    let currentSystem = global.System

    global.System = this

    let lastModuleIsRegistered = moduleIsRegistered
    let defaultExport
    let isRegistered

    try {
      moduleIsRegistered = false
      defaultExport = require(key)
    } finally {
      global.System = currentSystem
      isRegistered = moduleIsRegistered
      moduleIsRegistered = lastModuleIsRegistered
    }

    if (!isRegistered) {
      return new ModuleNamespace({default: defaultExport})
    }
  }

  register () {
    let result = super.register(...arguments)

    moduleIsRegistered = true

    return result
  }

  registerDynamic () {
    let result = super.register(...arguments)

    moduleIsRegistered = true

    return result
  }
}