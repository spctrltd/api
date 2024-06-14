import Helper from './helper.class.js'

/**
 * Cache class
 *
 * @class Cache
 * @classdesc A simple in-memory cache.
 */
export default class {
  store = {}
  updateEntryAfterNMilliseconds = 300000 // 5 minutes
  clearAllAfterNMilliseconds = 600000 // 10 minutes
  storageType = 'MEMORY'
  constructor(config = {}) {
    const {
      updateEntryAfterNMilliseconds = this.updateEntryAfterNMilliseconds,
      clearAllAfterNMilliseconds = this.clearAllAfterNMilliseconds
    } = config
    this.updateEntryAfterNMilliseconds = parseInt(updateEntryAfterNMilliseconds)
    this.clearAllAfterNMilliseconds = parseInt(clearAllAfterNMilliseconds)
    this.clearanceInterval()
    const sab = new SharedArrayBuffer(4)
    this.lock = new Int32Array(sab)
    this.lock[0] = 0
  }

  clearanceInterval = () => {
    setTimeout(() => {
      this.store = {}
    }, parseInt(this.clearAllAfterNMilliseconds))
  }

  writeCallback = async (key, callback) => {
    const returnValue = await callback()
    this.write(key, returnValue)
    return returnValue
  }

  /**
   * Update one or more documents.
   *
   * @memberof Cache
   * @async
   * @function put
   * @param {Any} key - The key to the stored value.
   * @param {Function} callback - The function to call if value is not in the store.
   * @param {Boolean} [forceUpdate] - Skips the cached value and uses the callback.
   * @param {Boolean} [shouldBlock] - Blocks other calls to the key until new value has been set.
   * @returns {Promise<Any>}
   */
  put = async (key, callback, forceUpdate = false, shouldBlock = false) => {
    if (!forceUpdate && Object.prototype.hasOwnProperty.call(this.store, `${key}`)) {
      const {value, timestamp} = this.read(key)
      if (Helper.time() - timestamp <= this.updateEntryAfterNMilliseconds) {
        return value
      }
    }
    if (shouldBlock) {
      if (Atomics.load(this.lock, 0) === 1) {
        const {value} = Atomics.waitAsync(this.lock, 0, 1)
        await value
        return await this.put(key, callback, shouldBlock)
      } else {
        Atomics.store(this.lock, 0, 1)
        const returnValue = await this.writeCallback(key, callback)
        Atomics.store(this.lock, 0, 0)
        Atomics.notify(this.lock, 0)
        return returnValue
      }
    }
    return await this.writeCallback(key, callback)
  }

  /**
   * Write/Overwrite a value to the cache
   *
   * @memberof Cache
   * @function write
   * @param {Any} key - The key to the stored value.
   * @param {Any} value - The value to store.
   */
  write = (key, value) => {
    this.store[`${key}`] = {
      value,
      timestamp: Helper.time()
    }
  }

  /**
   * Retrieve a stored value
   *
   * @memberof Cache
   * @function read
   * @param {Any} key - The key to the stored value.
   * @returns {Any}
   */
  read = key => {
    return this.store[`${key}`]
  }
}
