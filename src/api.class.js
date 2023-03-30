import Koa from 'koa'
import KoaRouter from '@koa/router'
import Cors from '@koa/cors'
import {koaBody} from 'koa-body'
import passport from 'koa-passport'
import session from 'koa-session'
import https from 'https'
import morgan from 'koa-morgan'
import {mkdirSync} from 'fs'
import Helper from './helper.class.js'
import authentication from './authentication.js'
import routeBuilder from './route/builder.js'
import DatabaseBuilder from './database/database.builder.class.js'

/**
 * Api class
 *
 * @class Api
 * @classdesc Initialises the Api server.
 */
export default class {
  static DATABASE_TYPE_SQLITE = Helper.DATABASE_TYPE_SQLITE
  static DATABASE_TYPE_MONGODB = Helper.DATABASE_TYPE_MONGODB
  server = new Koa()
  router = new KoaRouter()
  constructor(config) {
    this.config = Helper.setConfig(config)
    this.isConfigured = false
    this.server.context.test = {routes: {}, database: {}}
  }

  configureDatabase = async () => {
    const database = new DatabaseBuilder(this.config.database)
    this.server.context.database = await database.init()
    this.server.context.DBO = this.server.context.database.DBO
    this.server.context.test.database = this.server.context.database.tests
  }

  configureServer = () => {
    const {
      httpsConfig,
      uploadDir,
      allowCors,
      proxy,
      sessionKey,
      morgan: morganOptions
    } = this.config.server
    if (allowCors) {
      this.server.use(Cors())
    }
    const {cert: httpsConfigCert} = httpsConfig
    if (proxy && Array.isArray(proxy)) {
      const agent = Helper.httpsAgent(httpsConfigCert)
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
    if (Array.isArray(morganOptions)) {
      this.server.use(morgan(...morganOptions))
    }
  }

  configureHelpers = () => {
    const {otp} = this.config.service
    const {sessionKey, formatedResponse} = this.config.server
    const {secretKey, jwtExpiresInMinutes, jwtRefreshExpiresInMinutes, usernameField} =
      this.config.account
    this.server.context.helper = {
      ...Helper,
      developerPrinter: this.config.system.developerPrinter,
      formatedResponse,
      otpService: otp,
      sessionKey,
      ...authentication({secretKey, jwtExpiresInMinutes, jwtRefreshExpiresInMinutes, usernameField})
    }
  }

  configureRouter = async () => {
    // middleware
    this.server.context.test.routes = await routeBuilder(this.router)
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
    await this.configureRouter()
    this.configureAuthentication()
    this.isConfigured = true
  }

  start = async () => {
    if (!this.isConfigured) {
      await this.configure()
    }
    const {httpsConfig, port} = this.config.server
    const {developerPrinter} = this.config.system

    const {cert: httpsConfigCert} = httpsConfig
    if (httpsConfigCert) {
      developerPrinter({httpStarted: true})
      https.createServer(httpsConfig, this.server.callback()).listen(port)
    } else {
      developerPrinter({httpStarted: true})
      this.server.listen(port)
    }
    return {
      DBO: this.server.context.DBO,
      test: this.server.context.test,
      port: this.config.server.port
    }
  }

  stop = (exit = Helper.DONT_SHUTDOWN_SERVER) => {
    this.server.context.database.disconnect()
    if (exit === Helper.SHUTDOWN_SERVER) {
      process.exit(0)
    }
  }
}