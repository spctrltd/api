import {EventEmitter} from 'node:events'
import prettier from 'prettier'
import Api from './api.class.js'
import Helper from './helper.class.js'

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
    this.config = Helper.setConfig({
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

  unitTestRoute = async (
    id,
    method,
    url,
    payload,
    expectedStatus,
    expectedBody,
    isSuccessTest = Helper.IS_SUCCESS_TEST
  ) => {
    const replacer = value => Helper.testConfigReplacer(value, this.routeStore)
    const newPayload = Helper.replaceInObject(payload, replacer, Helper.REPLACE_VALUE)
    const {passed, response} = await Helper.testRoute(
      method,
      url,
      newPayload,
      expectedStatus,
      expectedBody
    )
    if (
      response &&
      response.data &&
      typeof response.data === 'object' &&
      isSuccessTest === Helper.IS_SUCCESS_TEST
    ) {
      const flattenedResponse = Helper.flattenObject(
        JSON.parse(JSON.stringify(response.data)),
        {},
        `${id}$body$`,
        '$'
      )
      Object.keys(flattenedResponse).forEach(key => {
        this.emitter.emit('routes', key, flattenedResponse[key])
      })
    }
    return {passed, response}
  }

  unitTestDatabase = async (id, operation, payload, isSuccessTest = Helper.IS_SUCCESS_TEST) => {
    const replacer = value => Helper.testConfigReplacer(value, this.databaseStore)
    const newParameters = Helper.replaceInObject(payload.parameters, replacer, Helper.REPLACE_VALUE)
    const newExpectedOutput = Helper.replaceInObject(
      payload.response,
      replacer,
      Helper.REPLACE_VALUE
    )
    const {passed, response} = await Helper.testDatabase(
      operation,
      newParameters,
      newExpectedOutput
    )
    if (isSuccessTest === Helper.IS_SUCCESS_TEST) {
      if (response && typeof response === 'object') {
        const flattenedResponse = Helper.flattenObject(
          JSON.parse(JSON.stringify(response)),
          {},
          `${id}$`,
          '$'
        )
        Object.keys(flattenedResponse).forEach(key => {
          this.emitter.emit('database', key, flattenedResponse[key])
        })
      } else {
        this.emitter.emit('database', id, response)
      }
    }
    return {passed, response}
  }

  outputResult = ({passed, response}, label, data) => {
    const color = passed ? 42 : 41
    const resultText = passed ? 'PASSED' : 'FAILED'
    console.info(`\x1b[${color}m%s\x1b[0m`, ` TEST: ${label} - ${resultText}`, data)
    if (typeof response === 'object' && response !== null) {
      console.info(`\x1b[${color - 10}m%s\x1b[0m`, 'OUTPUT')
      console.log(prettier.format(JSON.stringify(response), {semi: false, parser: 'json'}))
      console.info(`\x1b[${color - 10}m%s\x1b[0m`, '-------------')
    } else {
      console.info(`\x1b[${color - 10}m%s\x1b[0m`, 'NO OUTPUT AVAILABLE')
    }
    this.emitter.emit('count', passed)
  }

  start = () => {
    const api = new Api(this.config)
    api
      .start()
      .then(async ({test: {routes, database}, port, DBO}) => {
        const modelList = []
        if (Object.keys(database).length > 0) {
          for (let a = 0; a < Object.keys(database).length; a++) {
            const {success, failure, label, operation, id: testId, model: modelName} = database[a]
            const modelOperation = DBO[modelName][operation]
            if (success) {
              const successResult = await this.unitTestDatabase(testId, modelOperation, success)
              this.outputResult(successResult, `"${label}" to Pass`, `${operation.toUpperCase()}`)
            }
            if (failure) {
              const failureResult = await this.unitTestDatabase(
                testId,
                modelOperation,
                failure,
                Helper.IS_FAILURE_TEST
              )
              this.outputResult(failureResult, `"${label}" to Fail`, `${operation.toUpperCase()}`)
            }
            if (success || failure) {
              modelList.push(modelName)
            }
          }
        }

        const baseUrl = `http://localhost:${port}`
        if (Object.keys(routes).length > 0) {
          for (let x = 0; x < Object.keys(routes).length; x++) {
            const testId = Object.keys(routes)[x]
            const {method, endpoint, success, failure, label} = routes[testId]
            const url = `${baseUrl}${endpoint}`
            if (success) {
              const successResult = await this.unitTestRoute(
                testId,
                method,
                url,
                success.payload,
                success.status,
                success.body
              )

              this.outputResult(successResult, `"${label}" to Pass`, `${method} ${endpoint}`)
            }
            if (failure) {
              const failureResult = await this.unitTestRoute(
                testId,
                method,
                url,
                failure.payload,
                failure.status,
                failure.body,
                Helper.IS_FAILURE_TEST
              )
              this.outputResult(failureResult, `"${label}" to Fail`, `${method} ${endpoint}`)
            }
          }
        }

        if (modelList.length > 0) {
          for (let z = 0; z < modelList.length; z++) {
            await DBO[modelList[z]].delete({id: {$ne: null}})
          }
        }

        console.info(`\x1b[47m%s\x1b[0m`, ` TOTAL: ${this.count} `)
        console.info(`\x1b[47m%s\x1b[0m`, ` FAILED: ${this.count - this.passed} `)
        console.info(`\x1b[47m%s\x1b[0m`, ` PASSED: ${this.passed} `)

        const shutdown = this.config.test.shutdown
          ? Helper.SHUTDOWN_SERVER
          : Helper.DONT_SHUTDOWN_SERVER
        api.stop(shutdown)
      })
      .catch(error => {
        console.error(error)
      })
  }
}
