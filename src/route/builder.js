/**
 * Facilitates the loading of api routes.
 *
 * @module route/builder
 */
import Helper from '../helper.class.js'

/**
 * Opens and reads in JSON config file.
 *
 * @async
 * @function getMiddleware
 * @param {String} middlewarePath - Absolute path to directory.
 * @param {String} middlewareName - Name of file.
 * @param {Boolean} middlewarePathExists - Does directory exist.
 * @param {Symbol} isMiddleware - Is this a middleware processing.
 * @returns {Promise<Function|null>}
 */
const getMiddleware = async (
  middlewarePath,
  middlewareName,
  middlewarePathExists,
  isMiddleware = Helper.IS_NOT_MIDDLEWARE
) => {
  if (middlewareName && middlewarePathExists) {
    if (isMiddleware === Helper.IS_MIDDLEWARE) {
      const middleware = Array.isArray(middlewareName) ? middlewareName : [middlewareName]
      const middlewareArray = middleware.map(
        async name => await getMiddleware(middlewarePath, name, middlewarePathExists)
      )
      return Promise.all(middlewareArray)
    }
    const middlewareFilePath = `${middlewarePath}/${middlewareName}.js`
    const middlewareExists = await Helper.fileExists(middlewareFilePath)
    if (middlewareExists) {
      const middlewareFunction = await import(middlewareFilePath)
      return middlewareFunction.default
    }
  }
  return isMiddleware === Helper.IS_MIDDLEWARE ? [null] : null
}

/**
 * Opens and reads in JSON config file.
 *
 * @async
 * @function createConfigList
 * @param {String} routePath - Absolute path to directory.
 * @param {Object} [list] - A previous config to merge.
 * @returns {Promise<Object>}
 */
const createConfigList = async (routePath, list = {}) => {
  const configPath = `${routePath}/config`
  const handlerPath = `${routePath}/handler`
  const middlewarePath = `${routePath}/middleware`
  const handlerPathExists = await Helper.directoryExists(handlerPath)
  const middlewarePathExists = await Helper.directoryExists(middlewarePath)
  const fileList = Helper.createFileList(configPath, ['.json'], Helper.FILE_NAME_AS_KEY)

  const configDataList = Object.values(fileList)
    .filter(file => Helper.isJsonArrayFile(file))
    .map(file => Helper.readJsonFile(file))
    .reduce((prev, cur) => [...prev, ...cur], [])

  const configList = configDataList.reduce(async (configered, config) => {
    const {method, path, middleware: middlewareName, handler: handlerName, test} = config
    if (method && path) {
      const middleware = await getMiddleware(
        middlewarePath,
        middlewareName,
        middlewarePathExists,
        Helper.IS_MIDDLEWARE
      )
      const handler = await getMiddleware(handlerPath, handlerName, handlerPathExists)

      const configeredResolved = await configered

      return {
        ...configeredResolved,
        [path]: {
          ...(Object.prototype.hasOwnProperty.call(configeredResolved, path)
            ? configeredResolved[path]
            : {}),
          [method]: {
            middleware,
            handler,
            test
          }
        }
      }
    }
    return configered
  }, list)

  return configList
}

const ctxMiddleware = async (ctx, next) => {
  ctx.send = response => {
    ctx.body = ctx.helper.formatedResponse(response)
  }
  await next()
}

/**
 * Find, load and build routes from config files.
 *
 * @name routeBuilder
 * @async
 * @param {KoaRouter} router - KoaRouter instance.
 * @param {String} userRoutePath - Absolute path to user-defined routes.
 */
export default async (router, userRoutePath) => {
  const routePath = Helper.getAbsolutePath('./route')
  let configList = await createConfigList(routePath)
  const doesExist = await Helper.directoryExists(`${userRoutePath}/config`)
  if (doesExist) {
    configList = await createConfigList(userRoutePath, configList)
  }

  let tests = {}

  Object.keys(configList).forEach(path => {
    const pathConfig = configList[path]
    Object.keys(pathConfig).forEach(method => {
      const {middleware, handler, test} = pathConfig[method]
      const methodName = method.toLowerCase()
      router[methodName](
        ...[path, ctxMiddleware, ...middleware, handler].filter(param => param !== null)
      )

      if (test) {
        const currentTests = Object.keys(test).reduce((accTests, currentTestKey) => {
          return {
            ...accTests,
            [currentTestKey]: {
              ...test[currentTestKey],
              method: methodName,
              endpoint: path
            }
          }
        }, {})
        tests = {
          ...tests,
          ...currentTests
        }
      }
    })
  })

  return tests
}
