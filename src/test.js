import {EventEmitter} from 'node:events'
import Api from './api.js'
import {testRoute, replaceInObject, constants, flattenObject} from './helper.js'

class TestCache extends EventEmitter {
	store = {}
	count = 0
	passed = 0
}

const testCache = new TestCache()
testCache.on('cache', function (key, value) {
	this.store[key] = value
})
testCache.on('count', function (passed) {
	this.count++
	if (passed) {
		this.passed++
	}
})

const unitTestRoute = async (id, method, url, payload, expectedStatus, expectedBody) => {
	const replacer = value => {
		if (typeof value === 'string') {
			const regex = /\[\$cache\$(.*?)\]/
			const cacheMatch = value.match(regex)
			if (cacheMatch) {
				const eventKey = cacheMatch[1]
				return value.replace(regex, testCache.store[eventKey])
			}
		}
		return value
	}
	const newPayload = replaceInObject(payload, replacer, constants.REPLACE_VALUE)
	const {passed, response} = await testRoute(method, url, newPayload, expectedStatus, expectedBody)
	if (response && response.data && typeof response.data === 'object') {
		const flattenedResponse = flattenObject(response.data, {}, `${id}$body$`, '$')
		Object.keys(flattenedResponse).forEach(key => {
			testCache.emit('cache', key, flattenedResponse[key])
		})
	}
	return passed
}

const outputResult = (result, label, data) => {
	const color = result ? '42' : '41'
	const resultText = result ? 'PASSED' : 'FAILED'
	console.info(`\x1b[${color}m%s\x1b[0m`, ` TEST: ${label} - ${resultText}`, data)
	testCache.emit('count', result)
}

const mongoDBConfig = {
	database: {
		type: Api.DATABASE_TYPE_MONGODB,
		connectionString: 'mongodb://localhost:27019/spctr-api-unit-test'
	},
	service: {
		otp: otp => testCache.emit('cache', 'otp', otp)
	},
	server: {
		morgan: null
	}
}
const api = new Api(mongoDBConfig)
api
	.start()
	.then(async ({test: {routes, database}, port}) => {
		const baseUrl = `http://localhost:${port}`
		if (Object.keys(routes).length > 0) {
			for (let x = 0; x < Object.keys(routes).length; x++) {
				const testId = Object.keys(routes)[x]
				const {method, endpoint, success, failure, label} = routes[testId]
				const url = `${baseUrl}${endpoint}`
				const successResult = await unitTestRoute(
					testId,
					method,
					url,
					success.payload,
					success.status,
					success.body
				)

				outputResult(successResult, `"${label}" to Pass`, `${method} ${endpoint}`)
				const failureResult = await unitTestRoute(
					testId,
					method,
					url,
					failure.payload,
					failure.status,
					failure.body
				)
				outputResult(failureResult, `"${label}" to Fail`, `${method} ${endpoint}`)
			}
		}

		// test database:

		console.info(`\x1b[47m%s\x1b[0m`, ` TOTAL: ${testCache.count} `)
		console.info(`\x1b[47m%s\x1b[0m`, ` FAILED: ${testCache.count - testCache.passed} `)
		console.info(`\x1b[47m%s\x1b[0m`, ` PASSED: ${testCache.passed} `)
	})
	.catch(error => {
		console.error(error)
	})
