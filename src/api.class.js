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
    this.server.context.configuration = this.config
  }

  /**
   * Configures the database settings
   *
   * @memberof Api
   * @function configureDatabase
   * @async
   */
  configureDatabase = async () => {
    const database = new DatabaseBuilder(this.config.database)
    this.server.context.database = await database.init()
    this.server.context.DBO = this.server.context.database.DBO
    this.server.context.test.database = this.server.context.database.tests
  }

  /**
   * Configures the server settings
   *
   * @memberof Api
   * @function configureServer
   */
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

  /**
   * Configures the helper that is passed to the Koa Router context.
   *
   * @memberof Api
   * @function configureHelpers
   */
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
      ...authentication(secretKey, jwtExpiresInMinutes, jwtRefreshExpiresInMinutes, usernameField)
    }
  }

  /**
   * Configures Koa Router.
   *
   * @memberof Api
   * @function configureRouter
   * @async
   */
  configureRouter = async () => {
    // middleware
    this.server.context.test.routes = await routeBuilder(
      this.router,
      this.config.server.userRoutePath
    )
    this.server.use(this.router.routes()).use(this.router.allowedMethods())
  }

  /**
   * Configures authentication middleware generally used with the router.
   *
   * @memberof Api
   * @function configureAuthentication
   */
  configureAuthentication = () => {
    this.server.use(passport.initialize())
    this.server.use(passport.session())
  }

  /**
   * Calls all configuration functions in order.
   *
   * @memberof Api
   * @function configure
   * @async
   */
  configure = async () => {
    this.configureHelpers()
    await this.configureDatabase()
    this.configureServer()
    await this.configureRouter()
    this.configureAuthentication()
    this.isConfigured = true
  }

  /**
   * Starts the HTTP Server.
   *
   * @memberof Api
   * @function start
   * @async
   * @returns {Promise<Object>}
   */
  start = async () => {
    if (!this.isConfigured) {
      await this.configure()
    }
    const {httpsConfig, port} = this.config.server
    const {developerPrinter} = this.config.system

    const {cert: httpsConfigCert} = httpsConfig
    let server = 'http'
    if (httpsConfigCert) {
      server = 'https'
      https.createServer(httpsConfig, this.server.callback()).listen(port)
    } else {
      this.server.listen(port)
    }
    developerPrinter({server, port, startedAt: new Date()})
    return {
      DBO: this.server.context.DBO,
      test: this.server.context.test,
      port: this.config.server.port
    }
  }

  /**
   * Stops the entire app.
   *
   * @memberof Api
   * @function stop
   * @async
   */
  stop = async (options = {}, testOptions = {}) => {
    const {exit = Helper.DONT_SHUTDOWN_SERVER} = options
    const {
      exit: exitAfterTest = Helper.DONT_SHUTDOWN_SERVER,
      dropDatabase = Helper.DONT_DROP_TEST_DATABASE
    } = testOptions
    if (dropDatabase === Helper.DROP_TEST_DATABASE) {
      await this.server.context.database.dropDatabase()
    }
    await this.server.context.database.disconnect()
    if (exit === Helper.SHUTDOWN_SERVER || exitAfterTest === Helper.SHUTDOWN_SERVER) {
      process.exit(0)
    }
  }
}
