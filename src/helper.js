import {stat, mkdirSync, readFileSync, readdirSync, readSync, openSync, closeSync} from 'fs'
import https from 'https'
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
	FILE_PATH_AS_KEY
}

export const getAbsolutePath = filepath => path.join(__dirname, filepath)

export const fileStat = file => {
	return new Promise((resolve, reject) => {
		stat(file, (error, stats) => {
			if (error) {
				resolve({})
			}
			resolve(stats)
		})
	})
}

export const fileExists = async file => {
	const stats = await fileStat(file)
	return stats.size && stats.size > 0
}

export const directoryExists = async dir => {
	const stats = await fileStat(dir)
	return stats.isDirectory && stats.isDirectory()
}

export const httpsAgent = cert => {
	if (cert) {
		return new https.Agent({
			requestCert: true,
			rejectUnauthorized: false,
			cert
		})
	}

	return null
}

const defaultExpireToken = 3
const defaultExpireRefresh = 5

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

	const refreshTokenExpiresIn = parseInt((moment().add(expireRefresh, 'minutes') - moment()) / 1000)
	const refreshToken = jsonwebtoken.sign(payload, secret, {
		expiresIn: refreshTokenExpiresIn
	})

	return {token, expiresAfter, refreshToken}
}

export const mkdir = dirPath => {
	try {
		mkdirSync(dirPath, {recursive: true})
	} catch (error) {
		console.error(`mkdir: ${error}`)
	}
}

export const readJsonFile = path => {
	try {
		const json = readFileSync(path, 'utf8')
		return JSON.parse(json)
	} catch (err) {
		console.log('[readJsonFile]', err)
		return {}
	}
}

const readLine = (path, readNumberOfBytes = 1) => {
	const fd = openSync(path, 'r')
	const buffer = Buffer.alloc(readNumberOfBytes)
	readSync(fd, buffer, 0, readNumberOfBytes, null)
	closeSync(fd)
	return buffer.toString('utf8', 0, readNumberOfBytes)
}

export const isJsonArrayFile = path => {
	const data = readLine(path)
	return data.trim().substring(0, 1) === '['
}

const randomSingleDigit = () => Math.floor(Math.random() * Math.floor(10))

export const generateOTP = (length = 5) => {
	const randomArray = Buffer.allocUnsafe(length)
		.toString('utf8', 0, length + 1)
		.split('')
	return randomArray.map(() => randomSingleDigit()).join('')
}

export const developerPrinter = data => {
	const {NODE_ENV = 'development'} = process.env
	if (NODE_ENV === 'development') {
		console.info('------------------| >')
		console.info(data)
		console.info('------------------| <')
	}
}

export const hash = value => SHA256(value).toString()
export const isSameHashed = (plainText, hashedValue) => hash(`${plainText}`) === `${hashedValue}`

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

export const sequelizeOps = query => {
	if (query !== null && query !== undefined) {
		if (Array.isArray(query)) {
			return query.map(value => sequelizeOps(value))
		}
		if (typeof query === 'object' && Object.keys(query).length > 0) {
			return Object.keys(query).reduce((builtQuery, key) => {
				let value = query[key]
				if (typeof query[key] === 'object') {
					value = sequelizeOps(query[key])
				}
				const newKey = sequelizeOpKeys(key)
				return {
					...builtQuery,
					[newKey]: value
				}
			}, {})
		}
	}
	return query
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
		where = {where: sequelizeOps(data)}
	}
	return where
}

export const formatedResponse = data =>
	JSON.stringify({
		tag: moment().valueOf(),
		data
	})

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

const defaultKey = 'ba21767ae494afe5a2165dcb3338c5323e9907050e34542c405d575cc31bf527'

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
		proxy: undefined
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

const generateConfig = (key, config) =>
	Object.keys(config).reduce(
		(cfg, currentKey) => ({...cfg, [currentKey]: config[currentKey]}),
		defaultConfig[key]
	)

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
