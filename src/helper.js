import {stat, mkdirSync, readFileSync, readdirSync, readSync, openSync, closeSync} from 'fs'
import https from 'https'
import axios from 'axios'
import moment from 'moment'
import jsonwebtoken from 'jsonwebtoken'
import {fileURLToPath} from 'url'
import path from 'path'
import SHA256 from 'crypto-js/sha256.js'
import {Op} from 'sequelize'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IS_SQL = Symbol('IS_SQL')
const IS_NOT_SQL = Symbol('IS_NOT_SQL')
const IS_MIDDLEWARE = Symbol('IS_MIDDLEWARE')
const IS_NOT_MIDDLEWARE = Symbol('IS_NOT_MIDDLEWARE')
const REQUIRES_CONDITION = Symbol('REQUIRES_CONDITION')
const REQUIRES_NO_CONDITION = Symbol('REQUIRES_NO_CONDITION')
const DATABASE_TYPE_SQLITE = Symbol('DATABASE_TYPE_SQLITE')
const DATABASE_TYPE_MONGODB = Symbol('DATABASE_TYPE_MONGODB')
const FILE_NAME_AS_KEY = Symbol('FILE_NAME_AS_KEY')
const FILE_PATH_AS_KEY = Symbol('FILE_PATH_AS_KEY')
const REPLACE_KEY = Symbol('REPLACE_KEY')
const REPLACE_VALUE = Symbol('REPLACE_VALUE')

/**
 * Api constants.
 * @type {Object}
 * @const
 */
export const constants = {
	IS_SQL,
	IS_NOT_SQL,
	IS_MIDDLEWARE,
	IS_NOT_MIDDLEWARE,
	REQUIRES_CONDITION,
	REQUIRES_NO_CONDITION,
	DATABASE_TYPE_SQLITE,
	DATABASE_TYPE_MONGODB,
	FILE_NAME_AS_KEY,
	FILE_PATH_AS_KEY,
	REPLACE_KEY,
	REPLACE_VALUE
}

/**
 * Get absolute path of file reletive to this file.
 *
 * @function getAbsolutePath
 * @param {String} filePath - relative path to file.
 * @returns {String}
 */
export const getAbsolutePath = filePath => path.join(__dirname, filePath)

/**
 * Get file stats
 *
 * @function fileStat
 * @param {String} filePath - absolute path to file.
 * @returns {Promise<Object>}
 */
export const fileStat = filePath => {
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
 * @async
 * @function fileExists
 * @param {String} filePath - absolute path to file.
 * @returns {Promise<Boolean>}
 */
export const fileExists = async filePath => {
	const stats = await fileStat(filePath)
	return stats.size && stats.size > 0
}

/**
 * Determine if directory exists
 *
 * @async
 * @function directoryExists
 * @param {String} directoryPath - absolute path to directory.
 * @returns {Promise<Boolean>}
 */
export const directoryExists = async directoryPath => {
	const stats = await fileStat(directoryPath)
	return stats.isDirectory && stats.isDirectory()
}

/**
 * Instantiate an https agent
 *
 * @function httpsAgent
 * @param {String} certificatePath - absolute path to ssl certificate.
 * @returns {Object}
 */
export const httpsAgent = certificatePath => {
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
 * Default token validity period in minutes.
 * @type {Number}
 * @const
 */
const defaultExpireToken = 3

/**
 * Default refresh token validity period in minutes.
 * @type {Number}
 * @const
 */
const defaultExpireRefresh = 5

/**
 * Generate JWT
 *
 * @function generateToken
 * @param {Object} user - a user object with at at least an id property.
 * @param {String} secret - the key used to encrypt the user.
 * @param {Number} [expireToken] - token validity period in minutes.
 * @param {Number} [expireRefresh] - refresh token validity period in minutes.
 * @returns {Object}
 */
export const generateToken = (
	user,
	secret,
	expireToken = defaultExpireToken,
	expireRefresh = defaultExpireRefresh
) => {
	const payload = {user}
	const expiresAfter = moment().add(expireToken, 'minutes')
	const expiresIn = parseInt((expiresAfter - moment()) / 1000)
	const token = jsonwebtoken.sign(payload, secret, {expiresIn})

	const refreshTokenExpiresAfter = moment().add(expireRefresh, 'minutes')
	const refreshTokenExpiresIn = parseInt((refreshTokenExpiresAfter - moment()) / 1000)
	const refreshToken = jsonwebtoken.sign(payload, secret, {
		expiresIn: refreshTokenExpiresIn
	})

	return {token, expiresAfter, refreshToken, refreshTokenExpiresAfter}
}

/**
 * Creates a directory recursively, creating
 * parent directories if they do not exist
 *
 * @function mkdir
 * @param {Srting} path - absolute path to directory.
 */
export const mkdir = path => {
	try {
		mkdirSync(path, {recursive: true})
	} catch (error) {
		console.error(`mkdir: ${error}`)
	}
}

/**
 * Opens a JSON file and parses string to JS
 *
 * @function readJsonFile
 * @param {Srting} path - absolute path to file.
 * @returns {Object|Array}
 */
export const readJsonFile = path => {
	try {
		const json = readFileSync(path, 'utf8')
		return JSON.parse(json)
	} catch (err) {
		console.log('[readJsonFile]', err)
		return {}
	}
}

/**
 * Opens a file and reads a number of bytes
 *
 * @function peekIntoFile
 * @param {Srting} path - absolute path to file.
 * @param {Number} [readNumberOfBytes] - number of bytes to read.
 * @returns {String}
 */
const peekIntoFile = (path, readNumberOfBytes = 1) => {
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
 * @function isJsonArrayFile
 * @param {Srting} path - absolute path to JSON file.
 * @returns {Boolean}
 */
export const isJsonArrayFile = path => {
	const data = peekIntoFile(path)
	return data.trim().substring(0, 1) === '['
}

/**
 * Generate random number
 *
 * @function randomSingleDigit
 * @returns {Number}
 */
const randomSingleDigit = () => Math.floor(Math.random() * Math.floor(10))

/**
 * Generate random string of numbers
 *
 * @function generateOTP
 * @param {Number} [length] - maximum length of random string.
 * @returns {String}
 */
export const generateOTP = (length = 5) => {
	const randomArray = Buffer.allocUnsafe(length)
		.toString('utf8', 0, length + 1)
		.split('')
	return randomArray.map(() => randomSingleDigit()).join('')
}

/**
 * Internal stdout development environment printer
 *
 * @function developerPrinter
 * @param {Any} data - warning message.
 */
export const developerPrinter = data => {
	const {NODE_ENV = 'development'} = process.env
	if (NODE_ENV === 'development') {
		console.info('\x1b[46m%s\x1b[0m', ' - INFO START ')
		console.info('\x1b[32m%s\x1b[0m', data)
		console.info('\x1b[46m%s\x1b[0m', ' - INFO END ')
	}
}

/**
 * Internal stdout warning printer
 *
 * @function warningPrinter
 * @param {String} data - warning message.
 */
export const warningPrinter = data => {
	console.info('\x1b[43m%s\x1b[0m', 'WARNING', data)
}

/**
 * Hash a string value
 *
 * @function hash
 * @param {String} value - string to hash.
 * @returns {String}
 */
export const hash = value => SHA256(value).toString()

/**
 * Determine whether one string is equal to another when hashed
 *
 * @function isSameHashed
 * @param {String} plainText - plain text string.
 * @param {String} hashedValue - hashed string.
 * @returns {Boolean}
 */
export const isSameHashed = (plainText, hashedValue) => hash(`${plainText}`) === `${hashedValue}`

/**
 * Replace a mongoose operator with sequelize operator
 *
 * @function sequelizeOpKeys
 * @param {String} key - A mongoose operator.
 * @returns {Symbol}
 */
const sequelizeOpKeys = key => {
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
 * @function replaceInObject
 * @param {Object} object - the object.
 * @param {Function} replacerFunction - the function used to replace the key or value.
 * @param {Symbol} [replaceWhat] - the symbol specifying key or value.
 * @returns {Object}
 */
export const replaceInObject = (object, replacerFunction, replaceWhat = REPLACE_KEY) => {
	if (object !== null && object !== undefined) {
		if (Array.isArray(object)) {
			return object.map(value => replaceInObject(value, replacerFunction, replaceWhat))
		}
		if (typeof object === 'object' && Object.keys(object).length > 0) {
			return Object.keys(object).reduce((builtObject, key) => {
				let value = object[key]
				if (typeof object[key] === 'object') {
					value = replaceInObject(object[key], replacerFunction, replaceWhat)
				}
				const newKey = replaceWhat === REPLACE_KEY ? replacerFunction(key) : key
				const newValue = replaceWhat === REPLACE_VALUE ? replacerFunction(value) : value
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
 * Format a database query condition object for safe usage if required.
 * @function gaurdedCondition
 * @param {object|null|undefined} [data] - Query condition.
 * @param {symbol} [isSql] - Whether used on SQL database.
 * @param {symbol} [requiresCondition] - Whether condition is required for safe operation.
 * @returns {object}
 */
export const gaurdedCondition = (
	data,
	isSql = IS_NOT_SQL,
	requiresCondition = REQUIRES_NO_CONDITION
) => {
	const hasNoConditions =
		!data || (data && typeof data === 'object' && Object.keys(data).length === 0)
	if (requiresCondition === REQUIRES_CONDITION && hasNoConditions) {
		return false
	}
	let where = isSql === IS_SQL ? {} : data
	if (data && isSql === IS_SQL) {
		where = {where: replaceInObject(data, sequelizeOpKeys)}
	}
	return where
}

/**
 * Sets KoaRouter response body
 *
 * @function formatedResponse
 * @param {Any} data - Response body.
 * @returns {String}
 */
export const formatedResponse = data =>
	JSON.stringify({
		tag: moment().valueOf(),
		data
	})

/**
 * Sets KoaRouter middleware or controller response
 *
 * @function middlewareHandler
 * @param {Object} ctx - KoaRouter controller object.
 * @param {Function} next - KoaRouter next function.
 * @param {Number} [status] - KoaRouter response status.
 * @param {Any} [body] - KoaRouter response body.
 * @param {Symbol} [handlerType] - set whether this function behaves like middleware or a controller.
 */
export const middlewareHandler = (
	ctx = {},
	next,
	status = 200,
	body,
	handlerType = IS_NOT_MIDDLEWARE
) => {
	ctx.status = status
	if (body) {
		ctx.body = ctx.helper.formatedResponse(body)
	}
	if (handlerType === IS_MIDDLEWARE && typeof next === 'function') {
		next()
	}
}

/**
 * Default private encryption key.
 * @type {String}
 * @const
 */
const defaultKey = 'ba21767ae494afe5a2165dcb3338c5323e9907050e34542c405d575cc31bf527'

/**
 * Default configuration object.
 * @type {Object}
 * @const
 */
const defaultConfig = {
	database: {
		type: DATABASE_TYPE_SQLITE,
		databaseFile: undefined,
		memoryOnly: false,
		defaultUser: {
			username: 'superuser',
			password: 'superpassword'
		},
		connectionString: undefined
	},
	server: {
		sessionKey: defaultKey,
		formatedResponse,
		httpsConfig: {
			key: undefined, // fs.readFileSync('/app/server-private-key.pem'),
			cert: undefined // fs.readFileSync('/app/server-certificate.pem')
		},
		uploadDir: '/tmp/dump',
		allowCors: false,
		port: 8000,
		proxy: undefined,
		morgan: ['common']
	},
	service: {
		otp: otp => developerPrinter({otp})
	},
	account: {
		secretKey: defaultKey,
		usernameField: 'username',
		jwtExpiresInMinutes: defaultExpireToken,
		jwtRefreshExpiresInMinutes: defaultExpireRefresh
	},
	system: {
		developerPrinter
	}
}

/**
 * Configuration warning message object.
 * @type {Object}
 * @const
 */
const configWarnings = {
	account: {
		secretKey: {
			message:
				'"account.secretKey" is set to the default value that is known all. Please change when deploying to production.',
			response: value => value === defaultKey
		}
	},
	server: {
		sessionKey: {
			message:
				'"server.sessionKey" is set to the default value that is known all. Please change when deploying to production.',
			response: value => value === defaultKey
		}
	}
}

/**
 * Set config object for a part of the app,
 * populating it with default values where absent.
 *
 * @function generateConfig
 * @param {String} key - key for the config section to be populated.
 * @param {Object} config - config object defined by the user.
 * @returns {Object}
 */
const generateConfig = (key, config) => {
	const configured = Object.keys(config).reduce(
		(cfg, currentKey) => ({...cfg, [currentKey]: config[currentKey]}),
		defaultConfig[key]
	)

	if (Object.prototype.hasOwnProperty.call(configWarnings, key)) {
		const configMessages = configWarnings[key]
		Object.keys(configMessages).forEach(configKey => {
			const {message, response} = configMessages[configKey]
			if (response(configured[configKey])) {
				warningPrinter(message)
			}
		})
	}

	return configured
}

/**
 * Set config object for the different parts of the app.
 *
 * @function setConfig
 * @param {Object} [config] - config object defined by the user.
 * @returns {Object}
 */
export const setConfig = (config = {}) => {
	const {database = {}, server = {}, service = {}, account = {}, system = {}} = config
	return {
		database: generateConfig('database', database),
		server: generateConfig('server', server),
		service: generateConfig('service', service),
		account: generateConfig('account', account),
		system: generateConfig('system', system)
	}
}

/**
 * Create an array of absolute file paths.
 *
 * @function createFileList
 * @param {String} directoryPath - The absolute path to directory.
 * @param {Array} extensions - An array will file extensions to include. Empty array includes all.
 * @param {Object} list - An exting list object to concatenate.
 * @returns {Object}
 */
export const createFileList = (
	directoryPath,
	extensions = [],
	keyValue = FILE_NAME_AS_KEY,
	list = {}
) => {
	const fileList = {...list}
	readdirSync(directoryPath).forEach(file => {
		const includeAll = extensions.length === 0
		const extensionName = path.extname(file).toLowerCase()
		if (includeAll || extensions.includes(extensionName)) {
			const name = path.basename(file, extensionName)
			const filePath = `${directoryPath}/${file}`
			const key = keyValue === FILE_NAME_AS_KEY ? name : filePath
			if (!Object.prototype.hasOwnProperty.call(fileList, name)) {
				fileList[key] = filePath
			}
		}
	})
	return fileList
}

/**
 * An http client.
 * @type {Object}
 * @const
 */
export const httpClient = {
	/**
	 * POST method http client.
	 *
	 * @async
	 * @function post
	 * @param {String} url - An absolute url.
	 * @param {Object} options - An Axios options object.
	 * @param {Object} inputData - The POST payload.
	 * @returns {Promise<Object>}
	 */
	post: (url, options, inputData) => {
		return new Promise(resolve => {
			axios
				.post(url, inputData, options)
				.then(({data}) => {
					resolve(data)
				})
				.catch(err => {
					console.error(err)
					resolve(null)
				})
		})
	},

	/**
	 * GET method http client.
	 *
	 * @async
	 * @function post
	 * @param {String} url - An absolute url.
	 * @param {Object} options - An Axios options object.
	 * @returns {Promise<Object>}
	 */
	get: (url, options) => {
		return new Promise(resolve => {
			axios
				.get(url, options)
				.then(({data}) => {
					resolve(data)
				})
				.catch(err => {
					console.error(err)
					resolve(null)
				})
		})
	},

	/**
	 * ANY method http client.
	 *
	 * @async
	 * @function any
	 * @param {String} method - The request method eg. POST, GET, etc.
	 * @param {String} url - An absolute url.
	 * @param {Object} [options] - An Axios options object.
	 * @returns {Promise<Object>}
	 */
	any: (method, url, options) => {
		return new Promise(resolve => {
			axios({
				method,
				url,
				...options
			})
				.then(({status, data}) => {
					resolve({status, data})
				})
				.catch((error = {}) => {
					const {response = {}} = error
					const {status, data} = response
					resolve({status, data})
				})
		})
	}
}

/**
 * Compare two objects to determine if both have the same keys.
 *
 * @function hasAllKeys
 * @param {Object} a - The left comparison object.
 * @param {Object} b - The right comparison object.
 * @param {Boolean} [recursively] - compare keys recursively.
 * @returns {Boolean}
 */
const hasAllKeys = (a, b, recursively = false) => {
	return Object.keys(a).every(key => {
		if (!Object.keys(b).includes(key)) {
			return false
		}
		if (!recursively || a[key] === null || typeof a[key] !== 'object') {
			return true
		}
		return hasAllKeys(a[key], b[key], true)
	})
}

/**
 * Compare two objects to determine if both have the same keys.
 *
 * @async
 * @function testRoute
 * @param {String} method - The http request method.
 * @param {String} url - An absolute url.
 * @param {Object} payload - The request headers and body.
 * @param {Number} expectedStatus - The expected http response code.
 * @param {Object} expectedBody - The expected http response body.
 * @returns {Promise<Object>}
 */
export const testRoute = async (method, url, payload, expectedStatus, expectedBody) => {
	const response = await httpClient.any(method, url, {
		data: payload.body,
		headers: payload.headers
	})
	const statusPassed = expectedStatus === response.status
	let bodyPassed = !expectedBody
	if (expectedBody) {
		bodyPassed = hasAllKeys(expectedBody, response.data)
	}
	return {passed: statusPassed && bodyPassed, response}
}

/**
 * Reduce an object to only one level of keys
 *
 * @function flattenObject
 * @param {Object} object - The object to flatten.
 * @param {Object} [flattenedObject] - The flattened object passed in through recursion.
 * @param {String} [prepend] - The key path to prepend current key.
 * @param {String} [delimeter] - The delimeter to add between keys.
 * @returns {Object}
 */
export const flattenObject = (object, flattenedObject = {}, prepend = '', delimeter = '') => {
	for (const key in object) {
		if (typeof object[key] !== 'object') {
			flattenedObject[`${prepend}${key}`] = object[key]
		} else {
			flattenObject(object[key], flattenedObject, `${prepend}${key}${delimeter}`, delimeter)
		}
	}
	return flattenedObject
}
