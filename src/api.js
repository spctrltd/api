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
	developerPrinter,
	middlewareHandler,
	hashCompare
} from './helper.js'
import authentication from './authentication.js'
import routeBuilder from './route/builder.js'
import DatabaseBuilder from './database/builder.js'

const {APP_PORT = 8000} = process.env
const defaultKey = 'ba21767ae494afe5a2165dcb3338c5323e9907050e34542c405d575cc31bf527'

export default class {
	server = new Koa()
	router = new KoaRouter()
	constructor(config) {
		this.config = config || {database: {}, server: {}, system: {}}
	}

	configureDatabase = async () => {
		const database = new DatabaseBuilder(this.config.database)
		this.server.context.database = await database.init()
		this.server.context.DBO = this.server.context.database.DBO
	}

	configureServer = () => {
		const {
			httpsConfig = {},
			uploadDir = '/tmp/dump',
			allowCors = false,
			proxy,
			sessionKey = defaultKey
		} = this.config.server
		if (allowCors) {
			this.server.use(Cors())
		}
		const {cert: httpsConfigCert} = httpsConfig
		if (proxy && Array.isArray(proxy)) {
			const agent = httpsAgent(httpsConfigCert)
			proxy.forEach(({route, target}) => {
				this.server.use(Proxy(route, {target, agent}))
			})
		}
		this.server.keys = [sessionKey]
		this.server.use(session(this.server))

		mkdirSync(uploadDir, {recursive: true})
		const parser = koaBody({
			formidable: {uploadDir},
			multipart: true,
			urlencoded: true
		})
		this.server.use(parser)
	}

	configureHelpers = () => {
		const {otpService = otp => developerPrinter({otp})} = this.config.system
		const {sessionKey = defaultKey} = this.config.server
		const {secretKey = defaultKey} = this.config.server
		this.server.context.helper = {
			getAbsolutePath,
			fileExists,
			directoryExists,
			readJsonFile,
			mkdir,
			developerPrinter,
			middlewareHandler
		}
		this.server.context.authentication = {
			hashCompare,
			generateToken,
			generateOTP,
			developerPrinter,
			otpService,
			sessionKey,
			...authentication({secretKey})
		}
	}

	configureRouter = async () => {
		// middleware
		await routeBuilder(this.router)
		this.server.use(this.router.routes()).use(this.router.allowedMethods())
	}

	configureAuthentication = () => {
		this.server.use(passport.initialize())
		this.server.use(passport.session())
	}

	configure = async () => {
		this.configureHelpers()
		await this.configureDatabase()
		this.configureServer()
		this.configureRouter()
		this.configureAuthentication()
	}

	start = async () => {
		const {httpsConfig = {}} = this.config.server

		const {cert: httpsConfigCert} = httpsConfig
		if (httpsConfigCert) {
			developerPrinter({httpStarted: true})
			https.createServer(httpsConfig, this.server.callback()).listen(APP_PORT)
		} else {
			developerPrinter({httpStarted: true})
			this.server.listen(APP_PORT)
		}
	}
}
