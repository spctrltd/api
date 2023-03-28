import {EventEmitter} from 'node:events'
import Api from './api.class.js'
import {
  testRoute,
  replaceInObject,
  constants,
  flattenObject,
  setConfig,
  testConfigReplacer,
  testDatabase
} from './helper.js'

/**
 * Test class
 *
 * @class Test
 * @classdesc Initialises the Api server and run tests.
 */
export default class {
  emitter = new EventEmitter()
  routeStore = {}
  databaseStore = {}
  count = 0
  passed = 0
  constructor(config) {
    this.config = setConfig({
      ...config,
      server: {
        ...(config.server || {}),
        morgan: null
      },
      service: {
        ...(config.service || {}),
        otp: otp => this.emitter.emit('routes', 'otp', otp)
      }
    })
    this.emitter.on('routes', (key, value) => {
      this.routeStore[key] = value
    })
    this.emitter.on('database', (key, value) => {
      this.databaseStore[key] = value
    })
    this.emitter.on('count', passed => {
      this.count++
      if (passed) {
        this.passed++
      }
    })
  }

  unitTestRoute = async (id, method, url, payload, expectedStatus, expectedBody) => {
    const replacer = value => testConfigReplacer(value, this.routeStore)
    const newPayload = replaceInObject(payload, replacer, constants.REPLACE_VALUE)
    const {passed, response} = await testRoute(
      method,
      url,
      newPayload,
      expectedStatus,
      expectedBody
    )
    if (response && response.data && typeof response.data === 'object') {
      const flattenedResponse = flattenObject(response.data, {}, `${id}$body$`, '$')
      Object.keys(flattenedResponse).forEach(key => {
        this.emitter.emit('routes', key, flattenedResponse[key])
      })
    }
    return passed
  }

  unitTestDatabase = async (id, operation, payload) => {
    const replacer = value => testConfigReplacer(value, this.databaseStore)
    const newParameters = replaceInObject(payload.parameters, replacer, constants.REPLACE_VALUE)
    const newExpectedOutput = replaceInObject(payload.response, replacer, constants.REPLACE_VALUE)
    const {passed, response} = await testDatabase(operation, newParameters, newExpectedOutput)
    console.info({passed, response})
    if (response && typeof response === 'object') {
      const flattenedResponse = flattenObject(response, {}, `${id}$`, '$')
      Object.keys(flattenedResponse).forEach(key => {
        this.emitter.emit('database', key, flattenedResponse[key])
      })
    } else {
      this.emitter.emit('database', id, response)
    }
    return passed
  }

  outputResult = (result, label, data) => {
    const color = result ? '42' : '41'
    const resultText = result ? 'PASSED' : 'FAILED'
    console.info(`\x1b[${color}m%s\x1b[0m`, ` TEST: ${label} - ${resultText}`, data)
    this.emitter.emit('count', result)
  }

  start = () => {
    const api = new Api(this.config)
    api
      .start()
      .then(async ({test: {routes, database}, port, DBO}) => {
        console.info(database)
        if (Object.keys(database).length > 0) {
          for (let x = 0; x < Object.keys(database).length; x++) {
            const modelName = Object.keys(database)[x]
            const modelTests = database[modelName]
            if (modelTests && typeof modelTests === 'object') {
              for (let y = 0; y < Object.keys(modelTests).length; y++) {
                const testId = Object.keys(modelTests)[y]
                const {success, failure, label, operation} = modelTests[testId]
                const modelOperation = DBO[modelName][operation]
                const successResult = await this.unitTestDatabase(testId, modelOperation, success)
                this.outputResult(successResult, `"${label}" to Pass`, `${operation.toUpperCase()}`)
                const failureResult = await this.unitTestDatabase(testId, modelOperation, failure)
                this.outputResult(failureResult, `"${label}" to Fail`, `${operation.toUpperCase()}`)
              }
            }
          }
        }

        const baseUrl = `http://localhost:${port}`
        if (Object.keys(routes).length > 0) {
          for (let x = 0; x < Object.keys(routes).length; x++) {
            const testId = Object.keys(routes)[x]
            const {method, endpoint, success, failure, label} = routes[testId]
            const url = `${baseUrl}${endpoint}`
            const successResult = await this.unitTestRoute(
              testId,
              method,
              url,
              success.payload,
              success.status,
              success.body
            )

            this.outputResult(successResult, `"${label}" to Pass`, `${method} ${endpoint}`)
            const failureResult = await this.unitTestRoute(
              testId,
              method,
              url,
              failure.payload,
              failure.status,
              failure.body
            )
            this.outputResult(failureResult, `"${label}" to Fail`, `${method} ${endpoint}`)
          }
        }

        console.info(`\x1b[47m%s\x1b[0m`, ` TOTAL: ${this.count} `)
        console.info(`\x1b[47m%s\x1b[0m`, ` FAILED: ${this.count - this.passed} `)
        console.info(`\x1b[47m%s\x1b[0m`, ` PASSED: ${this.passed} `)

        const shutdown = this.config.test.shutdown
          ? constants.SHUTDOWN_SERVER
          : constants.DONT_SHUTDOWN_SERVER
        api.stop(shutdown)
      })
      .catch(error => {
        console.error(error)
      })
  }
}
