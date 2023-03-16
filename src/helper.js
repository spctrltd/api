import {stat, mkdirSync, readFileSync} from 'fs'
import https from 'https'
import moment from 'moment'
import jsonwebtoken from 'jsonwebtoken'
import {fileURLToPath} from 'url'
import path from 'path'
import SHA256 from 'crypto-js/sha256.js'
import {Op} from 'sequelize'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

export const generateToken = (user, secret, expires = 24) => {
	const payload = {user}
	const expiresAfter = moment().add(expires, 'hours')
	const expiresIn = parseInt((expiresAfter - moment()) / 1000)
	const token = jsonwebtoken.sign(payload, secret, {expiresIn})

	const refreshTokenExpiresIn = parseInt((moment().add(6, 'months') - moment()) / 1000)
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

const sqlWhereFromObject = where => {
	return Object.keys(where).reduce((prev, curr) => {
		const value = where[curr].replace(/'/g, "''")
		return [
			...prev,
			`${curr} = '${value}'`
		]
	}, []).join(' AND ')
}

export const sqlWhere = where => {
	let whereColumns = ''
	if (where && typeof where === 'string') {
		whereColumns = `WHERE ${where}`
	}
	
	if (where && typeof where === 'object') {
		whereColumns = `WHERE ${sqlWhereFromObject(where)}`
	}

	return whereColumns
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

const randomSingleDigit = () => Math.floor(Math.random() * Math.floor(10))

export const generateOTP = (length = 5) => {
	const randomArray = Buffer.allocUnsafe(length).toString('utf8', 0, length + 1).split('')
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
export const hashCompare = (plainText, hashedValue) => hash(`${plainText}`) === `${hashedValue}`

const sequelizeOpKeys = key => {
	const keys = {
		$gt: Op.gt
	}
	if (keys.hasOwnProperty(key)) {
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