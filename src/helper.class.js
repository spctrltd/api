'use strict'
import {stat, mkdirSync, readFileSync, readdirSync, readSync, openSync, closeSync, rmSync} from 'fs'
import https from 'https'
import http from 'http'
import jsonwebtoken from 'jsonwebtoken'
import {fileURLToPath} from 'url'
import path from 'path'
import SHA256 from 'crypto-js/sha256.js'
import {Op} from 'sequelize'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
/**
 * Helper class
 *
 * @class Helper
 * @classdesc Collection of helper functions and constants.
 */
export default class Helper {
  static IS_SQL = Symbol('IS_SQL')
  static IS_NOT_SQL = Symbol('IS_NOT_SQL')
  static IS_MIDDLEWARE = Symbol('IS_MIDDLEWARE')
  static IS_NOT_MIDDLEWARE = Symbol('IS_NOT_MIDDLEWARE')
  static REQUIRES_CONDITION = Symbol('REQUIRES_CONDITION')
  static REQUIRES_NO_CONDITION = Symbol('REQUIRES_NO_CONDITION')
  static DATABASE_TYPE_SQLITE = Symbol('DATABASE_TYPE_SQLITE')
  static DATABASE_TYPE_MONGODB = Symbol('DATABASE_TYPE_MONGODB')
  static FILE_NAME_AS_KEY = Symbol('FILE_NAME_AS_KEY')
  static FILE_PATH_AS_KEY = Symbol('FILE_PATH_AS_KEY')
  static REPLACE_KEY = Symbol('REPLACE_KEY')
  static REPLACE_VALUE = Symbol('REPLACE_VALUE')
  static SHUTDOWN_SERVER = Symbol('SHUTDOWN_SERVER')
  static DONT_SHUTDOWN_SERVER = Symbol('DONT_SHUTDOWN_SERVER')
  static IS_FAILURE_TEST = Symbol('IS_FAILURE_TEST')
  static IS_SUCCESS_TEST = Symbol('IS_SUCCESS_TEST')
  static DROP_TEST_DATABASE = Symbol('DROP_TEST_DATABASE')
  static DONT_DROP_TEST_DATABASE = Symbol('DONT_DROP_TEST_DATABASE')
  static MATCH_NONE = Symbol('MATCH_NONE')
  static MATCH_KEY = Symbol('MATCH_KEY')
  static MATCH_VALUE = Symbol('MATCH_VALUE')
  static MATCH_BOTH = Symbol('MATCH_BOTH')
  static RECURSIVELY = Symbol('RECURSIVELY')
  static NOT_RECURSIVELY = Symbol('NOT_RECURSIVELY')

  /**
   * Default token validity period in minutes.
   *
   * @memberof Helper
   * @type {Number}
   * @const
   */
  static defaultExpireToken = 3

  /**
   * Default refresh token validity period in minutes.
   *
   * @memberof Helper
   * @type {Number}
   * @const
   */
  static defaultExpireRefresh = 5

  /**
   * Get absolute path of file reletive to this file.
   *
   * @memberof Helper
   * @function getAbsolutePath
   * @param {String} filePath - relative path to file.
   * @returns {String}
   */
  static getAbsolutePath = filePath => path.join(__dirname, filePath)

  /**
   * Get file stats
   *
   * @memberof Helper
   * @function fileStat
   * @param {String} filePath - absolute path to file.
   * @returns {Promise<Object>}
   */
  static fileStat = (filePath = '') => {
    return new Promise(resolve => {
      stat(filePath, (error, stats) => {
        if (error) {
          resolve({})
        }
        resolve(stats)
      })
    })
  }

  /**
   * Determine if file exists
   *
   * @memberof Helper
   * @async
   * @function fileExists
   * @param {String} filePath - absolute path to file.
   * @returns {Promise<Boolean>}
   */
  static fileExists = async filePath => {
    const stats = await Helper.fileStat(filePath)
    return stats.size && stats.size > 0
  }

  /**
   * Determine if directory exists
   *
   * @memberof Helper
   * @async
   * @function directoryExists
   * @param {String} directoryPath - absolute path to directory.
   * @returns {Promise<Boolean>}
   */
  static directoryExists = async directoryPath => {
    const stats = await Helper.fileStat(directoryPath)
    return stats.isDirectory && stats.isDirectory()
  }

  /**
   * Delete a file
   *
   * @memberof Helper
   * @async
   * @function deleteFile
   * @param {String} path - absolute path to file.
   * @returns {Promise<Boolean>}
   */
  static deleteFile = async path => {
    rmSync(path)
    return await Helper.fileExists(path)
  }

  /**
   * Instantiate an https agent
   *
   * @memberof Helper
   * @function httpsAgent
   * @param {String} certificatePath - absolute path to ssl certificate.
   * @returns {Object}
   */
  static httpsAgent = certificatePath => {
    if (certificatePath) {
      return new https.Agent({
        requestCert: true,
        rejectUnauthorized: false,
        cert: certificatePath
      })
    }

    return null
  }

  /**
   * Generate JWT
   *
   * @memberof Helper
   * @function generateToken
   * @param {Object} payload - a object to encrypt.
   * @param {String} secret - the key used to encrypt the payload.
   * @param {Number} [expireToken] - token validity period in minutes.
   * @param {Number} [expireRefresh] - refresh token validity period in minutes.
   * @returns {Object}
   */
  static generateToken = (
    payload,
    secret,
    expireToken = Helper.defaultExpireToken,
    expireRefresh = Helper.defaultExpireRefresh
  ) => {
    const expiresAfter = Helper.time(expireToken, 'minutes')
    const expiresIn = parseInt((expiresAfter - Helper.time()) / 1000)
    const token = jsonwebtoken.sign(payload, secret, {expiresIn})

    const refreshTokenExpiresAfter = Helper.time(expireRefresh, 'minutes')
    const refreshTokenExpiresIn = parseInt((refreshTokenExpiresAfter - Helper.time()) / 1000)
    const refreshToken = jsonwebtoken.sign(payload, secret, {
      expiresIn: refreshTokenExpiresIn
    })

    return {token, expiresAfter, refreshToken, refreshTokenExpiresAfter}
  }

  /**
   * verify JWT
   *
   * @memberof Helper
   * @function verifyToken
   * @param {Object} token - the JWT to verify.
   * @param {String} secret - the key used to decrypt the JWT data.
   * @returns {Object}
   */
  static verifyToken = (token, secret) => {
    try {
      return jsonwebtoken.verify(token, secret)
    } catch (error) {
      Helper.errorPrinter(`verifyToken: ${error}`)
      return null
    }
  }

  /**
   * Creates a directory recursively, creating
   * parent directories if they do not exist
   *
   * @memberof Helper
   * @function mkdir
   * @param {Srting} path - absolute path to directory.
   */
  static mkdir = path => {
    try {
      mkdirSync(path, {recursive: true})
    } catch (error) {
      Helper.errorPrinter(`mkdir: ${error}`)
    }
  }

  /**
   * Opens a JSON file and parses string to JS
   *
   * @memberof Helper
   * @function readJsonFile
   * @param {Srting} path - absolute path to file.
   * @returns {Object|Array}
   */
  static readJsonFile = path => {
    try {
      const json = readFileSync(path, 'utf8')
      return JSON.parse(json)
    } catch (error) {
      Helper.errorPrinter(`readJsonFile: ${error}`)
      return {}
    }
  }

  /**
   * Opens a file and reads a number of bytes
   *
   * @memberof Helper
   * @function peekIntoFile
   * @param {Srting} path - absolute path to file.
   * @param {Number} [readNumberOfBytes] - number of bytes to read.
   * @returns {String}
   */
  static peekIntoFile = (path, readNumberOfBytes = 1) => {
    const fd = openSync(path, 'r')
    const buffer = Buffer.alloc(readNumberOfBytes)
    readSync(fd, buffer, 0, readNumberOfBytes, null)
    closeSync(fd)
    return buffer.toString('utf8', 0, readNumberOfBytes)
  }

  /**
   * Opens a JSON file and reads a number of bytes to determine
   * if the JSON data is an array.
   *
   * @memberof Helper
   * @function isJsonArrayFile
   * @param {Srting} path - absolute path to JSON file.
   * @returns {Boolean}
   */
  static isJsonArrayFile = path => {
    const data = Helper.peekIntoFile(path)
    return data.trim().substring(0, 1) === '['
  }

  /**
   * Generate random number
   *
   * @memberof Helper
   * @function randomSingleDigit
   * @returns {Number}
   */
  static randomSingleDigit = () => Math.floor(Math.random() * Math.floor(10))

  /**
   * Generate random string of numbers
   *
   * @memberof Helper
   * @function generateOTP
   * @param {Number} [length] - maximum length of random string.
   * @returns {String}
   */
  static generateOTP = (length = 5) => {
    const randomArray = Buffer.allocUnsafe(length)
      .toString('utf8', 0, length + 1)
      .split('')
    return randomArray.map(() => Helper.randomSingleDigit()).join('')
  }

  /**
   * Internal stdout development environment printer
   *
   * @memberof Helper
   * @function developerPrinter
   * @param {Any} data - warning message.
   */
  static developerPrinter = data => {
    const {NODE_ENV = 'development', DEBUG = false} = process.env
    if (NODE_ENV === 'development' || DEBUG) {
      console.info('\x1b[46m%s\x1b[0m', ' - INFO START ')
      console.info('\x1b[32m%s\x1b[0m', data)
      console.info('\x1b[46m%s\x1b[0m', ' - INFO END ')
    }
  }

  /**
   * Internal stdout warning printer
   *
   * @memberof Helper
   * @function warningPrinter
   * @param {String} data - warning message.
   */
  static warningPrinter = data => {
    const {NODE_ENV = 'development', PRINT_WARNINGS = false} = process.env
    if (NODE_ENV === 'development' || PRINT_WARNINGS) {
      console.info('\x1b[43m%s\x1b[0m', 'WARNING', data)
    }
  }

  /**
   * Internal stdout error printer
   *
   * @memberof Helper
   * @function errorPrinter
   * @param {String} data - error message.
   */
  static errorPrinter = data => {
    const {NODE_ENV = 'development', PRINT_ERRORS = false} = process.env
    if (NODE_ENV === 'development' || PRINT_ERRORS) {
      console.info('\x1b[41m%s\x1b[0m', 'ERROR', data)
    }
  }

  /**
   * Hash a string value
   *
   * @memberof Helper
   * @function hash
   * @param {String} value - string to hash.
   * @returns {String}
   */
  static hash = value => SHA256(value).toString()

  /**
   * Determine whether one string is equal to another when hashed
   *
   * @memberof Helper
   * @function isSameHashed
   * @param {String} plainText - plain text string.
   * @param {String} hashedValue - hashed string.
   * @returns {Boolean}
   */
  static isSameHashed = (plainText, hashedValue) => Helper.hash(`${plainText}`) === `${hashedValue}`

  /**
   * Replace a mongoose operator with sequelize operator
   *
   * @memberof Helper
   * @function sequelizeOpKeys
   * @param {String} key - A mongoose operator.
   * @returns {Symbol}
   */
  static sequelizeOpKeys = key => {
    const keys = {
      // Comparison
      $eq: Op.eq,
      $ne: Op.ne,
      $gt: Op.gt,
      $gte: Op.gte,
      $in: Op.in,
      $nin: Op.notIn,
      $lt: Op.lt,
      $lte: Op.lte,
      // Logical
      $and: Op.and,
      $not: Op.not,
      $or: Op.or,
      // Evaluation
      $regex: Op.regexp
    }
    const incompatibleKeys = [
      '$nor',
      '$exists',
      '$type',
      '$expr',
      '$jsonSchema',
      '$mod',
      '$text',
      '$where',
      '$geoIntersects',
      '$geoWithin',
      '$near',
      '$nearSphere',
      '$box',
      '$center',
      '$centerSphere',
      '$geometry',
      '$maxDistance',
      '$minDistance',
      '$polygon',
      '$elemMatch',
      '$size',
      '$bitsAllClear',
      '$bitsAllSet',
      '$bitsAnyClear',
      '$bitsAnySet',
      '$slice',
      '$comment',
      '$rand',
      '$natural',
      '$currentDate',
      '$inc',
      '$min',
      '$max',
      '$mul',
      '$rename',
      '$set',
      '$setOnInsert',
      '$unset',
      '$addToSet',
      '$pop',
      '$pull',
      '$push',
      '$pullAll',
      '$each',
      '$position',
      '$slice',
      '$sort',
      '$bit'
    ]
    if (incompatibleKeys.includes(key) || key.includes('.$')) {
      throw Error(`This operator is not compatible with SQL: ${key}`)
    }
    if (Object.prototype.hasOwnProperty.call(keys, key)) {
      return keys[key]
    }
    return key
  }

  /**
   * Replace a key or value within an object
   *
   * @memberof Helper
   * @function replaceInObject
   * @param {Object} object - the object.
   * @param {Function} replacerFunction - the function used to replace the key or value.
   * @param {Symbol} [replaceWhat] - the symbol specifying key or value.
   * @param {Boolean} [replaceObjects] - whether to replace object type as well.
   * @returns {Object}
   */
  static replaceInObject = (
    object,
    replacerFunction,
    replaceWhat = Helper.REPLACE_KEY,
    replaceObjects = false
  ) => {
    if (object !== null && object !== undefined) {
      if (Array.isArray(object)) {
        return object.map(value =>
          Helper.replaceInObject(value, replacerFunction, replaceWhat, replaceObjects)
        )
      }
      if (typeof object === 'object' && Object.keys(object).length > 0) {
        return Object.keys(object).reduce((builtObject, key) => {
          let value = object[key]
          if (replaceObjects) {
            value = replacerFunction(key, value)
          }
          if (typeof value === 'object') {
            value = Helper.replaceInObject(value, replacerFunction, replaceWhat, replaceObjects)
          }
          const newKey =
            !replaceObjects && replaceWhat === Helper.REPLACE_KEY ? replacerFunction(key) : key
          const newValue =
            !replaceObjects && replaceWhat === Helper.REPLACE_VALUE
              ? replacerFunction(value)
              : value
          return {
            ...builtObject,
            [newKey]: newValue
          }
        }, {})
      }
    }
    return object
  }

  /**
   * Populate a key or value within an object
   *
   * @memberof Helper
   * @function populateObject
   * @param {Object} object - the object.
   * @param {Object} [defaults] - a template of the object with default values.
   * @returns {Object}
   */
  static populateObject = (object, defaults) => {
    if (object !== null && object !== undefined) {
      if (Array.isArray(object)) {
        return object.map(value => Helper.populateObject(value, defaults[0]))
      }
      if (typeof object === 'object') {
        return Object.keys(object).reduce((builtObject, key) => {
          let value = object[key]
          if (typeof value === 'object' && value !== [] && value !== {}) {
            value = Helper.populateObject(value, defaults[key])
          } else if (Helper.isEmpty(value)) {
            return builtObject
          }
          return {
            ...builtObject,
            [key]: value
          }
        }, defaults)
      }
    }
    return object
  }

  /**
   * Check if value is empty
   *
   * @memberof Helper
   * @function isEmpty
   * @param {any} element - The value to test.
   * @returns {boolean}
   */
  static isEmpty = element => {
    if (typeof element === 'string') {
      return element.trim().length === 0
    }
    if (Array.isArray(element)) {
      return element.length === 0
    }
    if (typeof element === 'object' && element !== null) {
      return Object.keys(element).length === 0
    }
    if (element === null || element === undefined) {
      return true
    }
    return false
  }

  /**
   * Format a database query condition object for safe usage if required.
   *
   * @memberof Helper
   * @function gaurdedCondition
   * @param {object|null|undefined} [data] - Query condition.
   * @param {symbol} [isSql] - Whether used on SQL database.
   * @param {symbol} [requiresCondition] - Whether condition is required for safe operation.
   * @returns {object}
   */
  static gaurdedCondition = (
    data,
    isSql = Helper.IS_NOT_SQL,
    requiresCondition = Helper.REQUIRES_NO_CONDITION
  ) => {
    const hasNoConditions =
      !data || (data && typeof data === 'object' && Object.keys(data).length === 0)
    if (requiresCondition === Helper.REQUIRES_CONDITION && hasNoConditions) {
      return false
    }
    let where = isSql === Helper.IS_SQL ? {} : data
    if (data && isSql === Helper.IS_SQL) {
      where = {where: Helper.replaceInObject(data, Helper.sequelizeOpKeys)}
    }
    return where
  }

  /**
   * Sets KoaRouter response body
   *
   * @memberof Helper
   * @function formatedResponse
   * @param {Any} data - Response body.
   * @returns {String}
   */
  static formatedResponse = data =>
    JSON.stringify({
      tag: Helper.time(),
      data
    })

  /**
   * Sets KoaRouter middleware or controller response
   *
   * @memberof Helper
   * @async
   * @function middlewareHandler
   * @param {Object} ctx - KoaRouter controller object.
   * @param {Function} next - KoaRouter next function.
   * @param {Number} [status] - KoaRouter response status.
   * @param {Any} [body] - KoaRouter response body.
   * @param {Symbol} [handlerType] - set whether this function behaves like middleware or a controller.
   */
  static middlewareHandler = async (
    ctx = {},
    next,
    status = 200,
    body,
    handlerType = Helper.IS_NOT_MIDDLEWARE
  ) => {
    ctx.status = status
    if (body) {
      ctx.body = ctx.helper.formatedResponse(body)
    }
    if (handlerType === Helper.IS_MIDDLEWARE && typeof next === 'function') {
      await next()
    }
  }

  /**
   * Default private encryption key.
   *
   * @memberof Helper
   * @type {String}
   * @const
   */
  static defaultKey = 'ba21767ae494afe5a2165dcb3338c5323e9907050e34542c405d575cc31bf527'

  /**
   * Default configuration object.
   *
   * @memberof Helper
   * @type {Object}
   * @const
   */
  static defaultConfig = {
    database: {
      type: Helper.DATABASE_TYPE_SQLITE, // currently only MongoDB and SQLite type
      databaseFile: undefined, // if SQLite, creates file in project's root directory if undefined
      memoryOnly: false, // SQLite only
      defaultUser: {
        username: 'superuser',
        password: 'superpassword'
      },
      connectionString: undefined, // MongoDB Only
      connectionOptions: {autoIndex: false}, // MongoDB Only
      userDataModelPath: undefined, // Absolute path to user-defined models
      initialiseUserAccount: false,
      /*
      create default database data for user authentication. If true, this will create
      default user (at defaultUser property) and otp database tables/collections 
      for use with the default authentication routes
      */
      addConnection: false
      /*
      when creating the database class make this a seperate
      database connection to the server's
      */
    },
    server: {
      sessionKey: Helper.defaultKey, // server token encryption hash
      formatedResponse: Helper.formatedResponse, // a function that formats the http response data
      httpsConfig: {
        key: undefined, // fs.readFileSync('/app/server-private-key.pem'),
        cert: undefined // fs.readFileSync('/app/server-certificate.pem')
      },
      uploadDir: '/tmp/dump',
      allowCors: false,
      port: 8000,
      proxy: undefined,
      morgan: ['common'],
      userRoutePath: undefined // Absolute path to user-defined routes (see docs for more details)
    },
    service: {
      otp: otp => Helper.developerPrinter({otp}) // a function for sending the otp code. arguments = (otp, databaseObject) (see docs for example)
    },
    account: {
      secretKey: Helper.defaultKey, // encrypting JWT
      usernameField: 'username', // the formfield when logging in (see docs for example)
      jwtExpiresInMinutes: Helper.defaultExpireToken, // 3 minutes
      jwtRefreshExpiresInMinutes: Helper.defaultExpireRefresh // 5 minutes
    },
    system: {
      developerPrinter: Helper.developerPrinter // a function that prints to STDOUT in dev enironment or debug mode (see docs for example)
    },
    test: {
      shutdown: false, // exit the running server after testing completes
      dropDatabase: false // drop the test database
    }
  }

  /**
   * Configuration warning message object.
   *
   * @memberof Helper
   * @type {Object}
   * @const
   */
  static configWarnings = {
    account: {
      secretKey: {
        message:
          '"account.secretKey" is set to the default value that is known all. Please change when deploying to production.',
        response: value => value === Helper.defaultKey
      }
    },
    server: {
      sessionKey: {
        message:
          '"server.sessionKey" is set to the default value that is known all. Please change when deploying to production.',
        response: value => value === Helper.defaultKey
      }
    }
  }

  /**
   * Set config object for a part of the app,
   * populating it with default values where absent.
   *
   * @memberof Helper
   * @function generateConfig
   * @param {String} key - key for the config section to be populated.
   * @param {Object} config - config object defined by the user.
   * @returns {Object}
   */
  static generateConfig = (key, config) => {
    const configured = Object.keys(config).reduce((cfg, currentKey) => {
      let currentCfg = config[currentKey]
      if (typeof currentCfg === 'object' && !Array.isArray(currentCfg) && currentCfg !== null) {
        currentCfg = {
          ...cfg[currentKey],
          ...currentCfg
        }
      }
      return {
        ...cfg,
        [currentKey]: currentCfg
      }
    }, Helper.defaultConfig[key])

    if (Object.prototype.hasOwnProperty.call(Helper.configWarnings, key)) {
      const configMessages = Helper.configWarnings[key]
      Object.keys(configMessages).forEach(configKey => {
        const {message, response} = configMessages[configKey]
        if (response(configured[configKey])) {
          Helper.warningPrinter(message)
        }
      })
    }

    return configured
  }

  /**
   * Set config object for the different parts of the app.
   *
   * @memberof Helper
   * @function setConfig
   * @param {Object} [config] - config object defined by the user.
   * @returns {Object}
   */
  static setConfig = (config = {}) => {
    const {database = {}, server = {}, service = {}, account = {}, system = {}, test = {}} = config
    return {
      database: Helper.generateConfig('database', database),
      server: Helper.generateConfig('server', server),
      service: Helper.generateConfig('service', service),
      account: Helper.generateConfig('account', account),
      system: Helper.generateConfig('system', system),
      test: Helper.generateConfig('test', test)
    }
  }

  /**
   * Create an array of absolute file paths.
   *
   * @memberof Helper
   * @function createFileList
   * @param {String} directoryPath - The absolute path to directory.
   * @param {Array} extensions - An array will file extensions to include. Empty array includes all.
   * @param {Object} list - An exting list object to concatenate.
   * @returns {Object}
   */
  static createFileList = (
    directoryPath,
    extensions = [],
    keyValue = Helper.FILE_NAME_AS_KEY,
    list = {}
  ) => {
    const fileList = {...list}
    readdirSync(directoryPath).forEach(file => {
      const includeAll = extensions.length === 0
      const extensionName = path.extname(file).toLowerCase()
      if (includeAll || extensions.includes(extensionName)) {
        const name = path.basename(file, extensionName)
        const filePath = `${directoryPath}/${file}`
        const key = keyValue === Helper.FILE_NAME_AS_KEY ? name : filePath
        if (!Object.prototype.hasOwnProperty.call(fileList, name)) {
          fileList[key] = filePath
        }
      }
    })
    return fileList
  }

  /**
   * An http client.
   *
   * Params should be in the following order:
   * url, payload, options
   * unless http method is 'any', then: method, url, payload, options
   *
   * url is only optional without payload
   * payload and options is always optional
   *
   * @name httpClient
   * @memberof Helper
   * @type {Object}
   * @const
   */
  static httpClient = {
    get: (...params) => Helper.httpAction('get', ...params),
    head: (...params) => Helper.httpAction('head', ...params),
    post: (...params) => Helper.httpAction('post', ...params),
    put: (...params) => Helper.httpAction('put', ...params),
    delete: (...params) => Helper.httpAction('delete', ...params),
    connect: (...params) => Helper.httpAction('connect', ...params),
    options: (...params) => Helper.httpAction('options', ...params),
    trace: (...params) => Helper.httpAction('trace', ...params),
    patch: (...params) => Helper.httpAction('patch', ...params),
    any: (...params) => Helper.httpAction('any', ...params)
  }

  /**
   * the http action.
   * Params should be in the following order:
   * action, url, payload, options
   * unless action is 'any', then: action, method, url, payload, options
   *
   * url is only optional without payload: action, options
   * payload and options is always optional
   *
   * @memberof httpClient
   * @async
   * @function httpAction
   * @param {String} action - represents the http method/verb.
   * @param {String} [method] - Provide the http method if using 'any'.
   * @param {String} [url] - An absolute url.
   * @param {String} [payload] - The request body.
   * @param {Object} [options] - nodejs http|https request options object.
   * @returns {Promise<Object|String>}
   */
  static httpAction = (action, ...params) => {
    return new Promise(resolve => {
      let url, payload, options, responseType
      if (params.length === 0 || (action.toLowerCase() === 'any' && params.length < 2)) {
        Helper.errorPrinter('No Parameters passed or Too few parameters passed to Any')
        resolve(null)
        return
      }

      const [param1, param2, param3] = params

      let method
      if (action.toLowerCase() === 'any') {
        method = param1
        url = typeof param2 === 'string' || param3 !== undefined ? param2 : url
        options = typeof param2 === 'object' && !param3 ? param2 : param3
      } else {
        method = action
        url = typeof param1 === 'string' ? param1 : undefined
        payload = typeof param2 === 'string' ? param2 : undefined
        options = typeof param1 === 'object' ? param1 : typeof param2 === 'object' ? param2 : param3
      }
      if (options) {
        responseType = options.responseType
      }
      Helper.httpRequest({
        url,
        payload,
        method: typeof method === 'string' ? method.toUpperCase() : undefined,
        ...options
      })
        .then(({responseBuffer, originalResponse}) => {
          if (responseType && responseType === 'json') {
            const json = JSON.parse(responseBuffer.toString())
            resolve(json)
          } else if (responseType && responseType === 'string') {
            resolve(responseBuffer.toString())
          } else {
            resolve({responseBuffer, originalResponse})
          }
        })
        .catch(err => {
          Helper.errorPrinter(err)
          resolve(null)
        })
    })
  }

  /**
   * http request.
   *
   * @memberof Helper
   * @async
   * @function httpRequest
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  static httpRequest = (options = {}) => {
    return new Promise((resolve, reject) => {
      const {
        method: methodName,
        hostname: hostName,
        path: pathName,
        url,
        protocol: protocolName = 'http',
        payload = undefined,
        ...remainingOptions
      } = options
      if (typeof methodName !== 'string' || methodName.length < 3) {
        reject({
          errorMessage: `Method: ${methodName} must be a string and at least 3 characters long`,
          cause: methodName
        })
      }

      let requestFunction = protocolName === 'http' ? http : https
      let path = pathName
      let hostname = hostName
      if (typeof url === 'string' && url.length > 0) {
        const protocolRegex = /^((https|http)(:\/\/)|)([a-z0-9-.@:]+)(\?|\/|#|)(.*)/i
        const protocolMatch = url.match(protocolRegex)
        if (protocolMatch !== null) {
          const [_fullMatch, _scheme, protocolString, _colon, hostString, delimeter, pathString] =
            protocolMatch
          requestFunction = protocolString === 'http' ? http : https
          path = `${delimeter === '/' ? '' : '/'}${delimeter}${pathString}`
          hostname = hostString
        }
      }

      const method = methodName.toUpperCase()
      const request = requestFunction.request(
        {
          method,
          hostname,
          path,
          ...remainingOptions
        },
        originalResponse => {
          const {statusCode, statusMessage} = originalResponse

          if (statusCode >= 400) {
            reject({errorMessage: statusMessage, cause: statusCode})
          } else {
            let chunks = []

            originalResponse.on('data', chunk => {
              chunks = [...chunks, chunk]
            })

            originalResponse.on('end', () => {
              const responseBuffer = Buffer.concat(chunks)
              resolve({responseBuffer, originalResponse})
            })

            originalResponse.on('error', error => {
              reject({errorMessage: 'httpRequest Response Error', cause: error})
            })
          }
        }
      )

      request.on('error', error => {
        reject({errorMessage: 'httpRequest Request Error', cause: error})
      })

      if (
        typeof payload === 'string' &&
        payload.length > 0 &&
        (method === 'POST' || method === 'PUT' || method === 'PATCH')
      ) {
        request.write(payload)
      }
      request.end()
    })
  }

  /**
   * Compare two objects to determine if both have the same keys.
   *
   * @memberof Helper
   * @function hasAllKeys
   * @param {Object} a - The left comparison object.
   * @param {Object} b - The right comparison object.
   * @param {Symbol} [recursively] - compare keys recursively.
   * @param {Symbol} [matchOn] - how to match the two data types.
   * @returns {Boolean}
   */
  static hasAllKeys = (a, b, recursively = Helper.NOT_RECURSIVELY, matchOn = Helper.MATCH_KEY) => {
    if (!a || !b) {
      return false
    }
    if (matchOn === Helper.MATCH_VALUE) {
      return a === b
    }
    if (Array.isArray(a)) {
      if (a.length !== b.length) {
        return false
      }
      const hasAllKeysFiltered = a.filter((currentA, index) =>
        Helper.hasAllKeys(currentA, b[index], recursively, matchOn)
      )
      return hasAllKeysFiltered.length === a.length
    }
    return Object.keys(a).every(key => {
      if (!Object.keys(b).includes(key)) {
        return false
      }
      const matchNonObject = matchOn === Helper.MATCH_BOTH && typeof a[key] !== 'object'
      const matchNull = matchOn === Helper.MATCH_BOTH && a[key] === null
      let bValue = b[key]
      if (typeof bValue !== typeof a[key]) {
        if (bValue instanceof Date) {
          bValue = bValue.toISOString()
        } else {
          bValue = `${bValue}`
        }
      }
      if ((matchNonObject || matchNull) && a[key] !== bValue) {
        return false
      }
      if (recursively === Helper.NOT_RECURSIVELY || a[key] === null || typeof a[key] !== 'object') {
        return true
      }
      return Helper.hasAllKeys(a[key], b[key], recursively, matchOn)
    })
  }

  /**
   * Get the match Symbol for the passed string value.
   *
   * @memberof Helper
   * @function getMatchSymbol
   * @param {String} matchName - The string name for the symbol.
   * @returns {Symbol}
   */
  static getMatchSymbol = async matchName => {
    switch (matchName) {
      case 'value':
        return Helper.MATCH_VALUE
      case 'key':
        return Helper.MATCH_KEY
      case 'both':
        return Helper.MATCH_BOTH
      case 'none':
      default:
        return Helper.MATCH_NONE
    }
  }

  /**
   * Test an http method with a certain payload to match a predetermined output.
   *
   * @memberof Helper
   * @async
   * @function testRoute
   * @param {String} method - The http request method.
   * @param {String} url - An absolute url.
   * @param {Object} payload - The request headers and body.
   * @param {Number} expectedStatus - The expected http response code.
   * @param {Object} expectedBody - The expected http response body.
   * @param {Object} expectedBody - The expected http response body.
   * @returns {Promise<Object>}
   */
  static testRoute = async (
    method,
    url,
    payload,
    expectedStatus,
    expectedBody,
    matchResponseOn = Helper.MATCH_NONE
  ) => {
    const response = await Helper.httpClient.any(method, url, {
      data: payload.body,
      headers: payload.headers
    })
    const statusPassed = expectedStatus === response.status
    let bodyPassed = !expectedBody
    const checkResponse = matchResponseOn !== Helper.MATCH_NONE
    if (expectedBody && checkResponse) {
      bodyPassed = Helper.hasAllKeys(
        expectedBody,
        response.data,
        Helper.RECURSIVELY,
        matchResponseOn
      )
    }
    return {passed: statusPassed && bodyPassed, response}
  }

  /**
   * Reduce an object to only one level of keys
   *
   * @memberof Helper
   * @function flattenObject
   * @param {Object} object - The object to flatten.
   * @param {Object} [flattenedObject] - The flattened object passed in through recursion.
   * @param {String} [prepend] - The key path to prepend current key.
   * @param {String} [delimeter] - The delimeter to add between keys.
   * @returns {Object}
   */
  static flattenObject = (object, flattenedObject = {}, prepend = '', delimeter = '') => {
    for (const key in object) {
      if (typeof object[key] === 'object') {
        flattenedObject = Helper.flattenObject(
          object[key],
          flattenedObject,
          `${prepend}${key}${delimeter}`,
          delimeter
        )
      } else {
        flattenedObject[`${prepend}${key}`] = object[key]
      }
    }
    return flattenedObject
  }

  /**
   * Replace templated keywords in config
   *
   * @memberof Helper
   * @function testConfigReplacer
   * @param {String|Any} value - The value to replace.
   * @param {Object} store - The object to get the replacement value from.
   * @returns {String|Any}
   */
  static testConfigReplacer = (value, store) => {
    if (typeof value === 'string') {
      const regexCache = /\[\$cache\$(.*?)\]/
      const cacheMatch = value.match(regexCache)
      if (cacheMatch) {
        const eventKey = cacheMatch[1]
        return value.replace(regexCache, store[eventKey])
      }
      const regexFunction = /\[\$function\$(.*?)\$(.*?)\]/
      const functionMatch = value.match(regexFunction)
      if (functionMatch) {
        const functionName = functionMatch[1]
        const functionParam = functionMatch[2].split('$')
        return Helper[functionName](...functionParam)
      }
    }
    return value
  }

  /**
   * Test a certain database operation with a certain payload to match a predetermined output.
   *
   * @memberof Helper
   * @async
   * @function testDatabase
   * @param {Function} operation - The database operation.
   * @param {Array} parameters - The parameters passed to the operation.
   * @param {Any} expectedOutput - The expected response from the operation.
   * @returns {Promise<Object>}
   */
  static testDatabase = async (
    operation,
    parameters,
    expectedOutput,
    matchResponseOn = Helper.MATCH_NONE
  ) => {
    const response = await operation(...parameters)
    const typeOfPassed = typeof response === typeof expectedOutput
    const matchResponse = matchResponseOn !== Helper.MATCH_NONE
    let passed = typeOfPassed && (response === expectedOutput || !matchResponse)

    if (typeof response === 'object' && matchResponse) {
      passed = Helper.hasAllKeys(expectedOutput, response, Helper.RECURSIVELY, matchResponseOn)
    }
    return {passed, response}
  }

  /**
   * Convert a string to camel case
   *
   * @memberof Helper
   * @function toCamelcase
   * @param {String} text - The string to convert.
   * @param {String} delimeter - The character used to split the word.
   * @returns {String}
   */
  static toCamelcase = (text, delimeter = ' ') => {
    const value = text.toLowerCase()
    if (value.includes(delimeter)) {
      return value
        .split(delimeter)
        .map((word, index) =>
          index > 0 ? `${word.charAt(0).toUpperCase()}${word.substring(1)}` : word
        )
        .join('')
    }
    return value
  }

  /**
   * Time in milliseconds
   *
   * @memberof Helper
   * @function time
   * @param {Integer} value - The interval to add to the current time.
   * @param {String} units - The unit for the interval, i.e seconds, minutes, hours.
   * @returns {Integer}
   */
  static time = (value, units = 'seconds') => {
    const now = Date.now()
    if (typeof value !== 'number' || parseInt(value) === 0) {
      return now
    }
    let unit = 0
    switch (units) {
      case 'seconds':
        unit = 1000 * value
        break
      case 'minutes':
        unit = 1000 * 60 * value
        break
      case 'hours':
        unit = 1000 * 60 * 60 * value
        break
      case 'days':
        unit = 1000 * 60 * 60 * 24 * value
        break
      case 'weeks':
        unit = 1000 * 60 * 60 * 24 * 7 * value
        break
      default:
        unit = 0
    }
    return now + unit
  }
}
