import {extname, resolve} from 'path'
import {readdirSync} from 'fs'
import {directoryExists, getAbsolutePath, readJsonFile, fileExists} from '../helper.js'

const AsyncFunction = async function () {}.constructor

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

const createConfigList = async (routePath, list = {}) => {
	const configPath = `${routePath}/config`
	const handlerPath = `${routePath}/handler`
	const middlewarePath = `${routePath}/middleware`
	const handlerPathExists = await directoryExists(handlerPath)
	const middlewarePathExists = await directoryExists(middlewarePath)
	const fileList = readdirSync(configPath)
	const configDataList = fileList.map(file => {
		if (extname(file).toLowerCase() === '.json') {
			const configData = readJsonFile(`${configPath}/${file}`)
			if (Array.isArray(configData)) {
				return configData
			}
		}
		return null
	})
	.filter(configData => configData !== null)
	.reduce((prev, cur) => ([
		...prev,
		...cur
	]), [])

	const configList = configDataList.reduce(async (configered, config) => {
		const {
			method,
			path,
			middleware: middlewareName,
			handler: handlerName,
			role
		} = config
		if (method && path) {
			const middleware = await getMiddleware(middlewarePath, middlewareName, middlewarePathExists)
			const handler = await getMiddleware(handlerPath, handlerName, handlerPathExists)

			const configeredResolved = await configered

			return {
				...configeredResolved,
				[path]: {
					...(configeredResolved.hasOwnProperty(path) ? configeredResolved[path] : {}),
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
			const {middleware, handler, role} = pathConfig[method]

			router[method.toLowerCase()](...[path, middleware, handler].filter(param => param !== null))
		})
	})
}