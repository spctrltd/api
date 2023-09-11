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
  }

  clearanceInterval = () => {
    setTimeout(() => {
      this.store = {}
    }, parseInt(this.clearAllAfterNMilliseconds))
  }

  /**
   * Update one or more documents.
   *
   * @memberof Cache
   * @async
   * @function put
   * @param {Any} key - The key to the stored value.
   * @param {Function} callback - The function to call if value is not in the store.
   * @returns {Promise<Any>}
   */
  put = async (key, callback) => {
    if (Object.prototype.hasOwnProperty.call(this.store, `${key}`)) {
      const {value, timestamp} = this.read(key)
      if (Helper.time() - timestamp <= this.updateEntryAfterNMilliseconds) {
        return value
      }
    }
    const returnValue = await callback()
    this.write(key, returnValue)
    return returnValue
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
