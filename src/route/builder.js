import {resolve} from 'path'
import {
	directoryExists,
	getAbsolutePath,
	readJsonFile,
	fileExists,
	createFileList,
	isJsonArrayFile,
	constants
} from '../helper.js'

const AsyncFunction = async function () {}.constructor

/**
 * Opens and reads in JSON config file.
 *
 * @async
 * @function getMiddleware
 * @param {String} middlewarePath - Absolute path to directory.
 * @param {String} middlewareName - Name of file.
 * @param {Boolean} middlewarePathExists - Does directory exist.
 * @returns {Promise<Function|null>}
 */
const getMiddleware = async (middlewarePath, middlewareName, middlewarePathExists) => {
	if (middlewareName && middlewarePathExists) {
		const middlewareFilePath = `${middlewarePath}/${middlewareName}.js`
		const middlewareExists = await fileExists(middlewareFilePath)
		if (middlewareExists) {
			const middlewareFunction = await import(middlewareFilePath)
			return async (ctx, next) => {
				if (middlewareFunction.default instanceof AsyncFunction) {
					return await middlewareFunction.default(ctx, next)
				} else {
					return middlewareFunction.default(ctx, next)
				}
			}
		}
	}
	return null
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
	const handlerPathExists = await directoryExists(handlerPath)
	const middlewarePathExists = await directoryExists(middlewarePath)
	const fileList = createFileList(configPath, ['.json'], constants.FILE_NAME_AS_KEY)

	const configDataList = Object.values(fileList)
		.filter(file => isJsonArrayFile(file))
		.map(file => readJsonFile(file))
		.reduce((prev, cur) => [...prev, ...cur], [])

	const configList = configDataList.reduce(async (configered, config) => {
		const {method, path, middleware: middlewareName, handler: handlerName, role} = config
		if (method && path) {
			const middleware = await getMiddleware(middlewarePath, middlewareName, middlewarePathExists)
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
						role
					}
				}
			}
		}
		return configered
	}, list)

	return configList
}

/**
 * Find, load and build routes from config files.
 *
 * @async
 * @param {KoaRouter} router - KoaRouter instance.
 */
export default async router => {
	const routePath = getAbsolutePath('./route')
	let configList = await createConfigList(routePath)
	const userRoutePath = `${resolve('.')}/route`
	const doesExist = await directoryExists(`${userRoutePath}/config`)
	if (doesExist) {
		configList = await createConfigList(userRoutePath, configList)
	}

	Object.keys(configList).forEach(path => {
		const pathConfig = configList[path]
		Object.keys(pathConfig).forEach(method => {
			const {middleware, handler} = pathConfig[method]

			router[method.toLowerCase()](...[path, middleware, handler].filter(param => param !== null))
		})
	})
}
