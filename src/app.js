import Koa from 'koa'
import KoaRouter from '@koa/router'
import Cors from '@koa/cors'
import {koaBody} from 'koa-body'
import passport from 'koa-passport'
import session from 'koa-session'
import https from 'https'
import {mkdirSync} from 'fs'
import {
	httpsAgent,
	getAbsolutePath,
	fileExists,
	directoryExists,
	readJsonFile,
	mkdir,
	generateToken,
	generateOTP,
	developerPrinter
} from './helper.js'
import authentication from './authentication.js'
import routeBuilder from './route/builder.js'
import databaseBuilder from './database/builder.js'

const {APP_PORT = 8000} = process.env

export default async (configuration = {database: {}}) => {
	const {
		database: {
			type: databaseType = 'sqlite'
		},
		httpsConfig = {},
		uploadDir = '/tmp/dump',
		allowCors = false,
		proxy,
		sessionKey = 'ba21767ae494afe5a2165dcb3338c5323e9907050e34542c405d575cc31bf527',
		otpService = (otp) => developerPrinter({otp})
	} = configuration
	const app = new Koa()
	const router = new KoaRouter()
	mkdirSync(uploadDir, {recursive: true})
	const parser = koaBody({
		formidable: {uploadDir},
		multipart: true,
		urlencoded: true
	})

	const database = new databaseBuilder({type: databaseType})
	app.context.database = await database.init()
	app.context.helpers = {
		getAbsolutePath,
		fileExists,
		directoryExists,
		readJsonFile,
		mkdir,
		generateToken,
		generateOTP,
		developerPrinter,
		otpService,
		...authentication,
		sessionKey
	}

	if (allowCors) {
		app.use(Cors())
	}
	const {cert: httpsConfigCert} = httpsConfig
	if (proxy && Array.isArray(proxy)) {
		const agent = httpsAgent(httpsConfigCert)
		proxy.forEach(({route, target}) => {
			app.use(Proxy(route, {target, agent}))
		})
	}
	app.keys = [sessionKey]
	app.use(session(app))

	app.use(parser)

	// middleware
	await routeBuilder(router)

	app.use(router.routes()).use(router.allowedMethods())

	app.use(passport.initialize())
  	app.use(passport.session())

	if (httpsConfigCert) {
		https.createServer(httpsConfig, app.callback()).listen(APP_PORT)
	} else {
		console.info({listening: true})
		app.listen(APP_PORT)
	}
}
