import Module from 'module'
import RegisterLoader from 'es-module-loader/core/register-loader.js'
import path from 'path'
import {Loader, ModuleNamespace} from 'es-module-loader/core/loader-polyfill.js'

export * from 'es-module-loader/core/loader-polyfill.js'
export {RegisterLoader}

const BASE_MODULE = Symbol()

let moduleIsRegistered = false
let rootModule = module

while (rootModule.parent != null) {
  rootModule = rootModule.parent
}

var hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty)

export class NodeLoader extends RegisterLoader {
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

    if (parentKey == null) {
      parentKey = baseKey
    }

    let module = baseModule

    if (parentKey !== baseKey) {
      if (hasOwnProperty(require, parentKey)) {
        module = require.cache[parentKey]
      } else {
        module = null
      }
    }

    if (module !== null) try {
      return Module._resolveFilename(key, module) || undefined
    } catch (e) { }

    // Local import
    if (key[0] === '.') {
      return path.resolve(path.dirname(parentKey), key)
    }

    // Global import
    return path.normalize(key)
  }

  [RegisterLoader.instantiate] (key, processAnonRegister) {
    let currentSystem = global.System
    let lastModuleIsRegistered = moduleIsRegistered
    let exports
    let isRegistered

    global.System = this

    try {
      moduleIsRegistered = false
      exports = rootModule.require(key)
    } finally {
      global.System = currentSystem

      isRegistered = moduleIsRegistered
      moduleIsRegistered = lastModuleIsRegistered
    }

    if (isRegistered) {
      processAnonRegister()
    } else {
      if (typeof exports !== 'object') {
        exports = {default: exports}
      }

      return new ModuleNamespace(exports)
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

export default NodeLoader
