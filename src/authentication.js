/**
 * Session authentication functions
 *
 * @module authentication
 */
import koaPassport from 'koa-passport'
import {ExtractJwt as extractJwt, Strategy as JwtStrategy} from 'passport-jwt'
import {Strategy as LocalStrategy} from 'passport-local'
import moment from 'moment'

/**
 * Default template used for authentication response.
 *
 * @type {String}
 * @const
 */
const responseTemplate = {status: 200, body: null}

/**
 * Setup session authentication functions.
 *
 * @name authentication
 * @function
 * @param {String} secretKey - the private key used to encrypt the JWT.
 * @param {Number} jwtExpiresInMinutes - how long the JWT will be valid for.
 * @param {Number} jwtRefreshExpiresInMinutes - how long the Refresh JWT will be valid for.
 * @param {String} usernameField - the formfield when logging in (see docs for example).
 * @returns {Object}
 */
export default (secretKey, jwtExpiresInMinutes, jwtRefreshExpiresInMinutes, usernameField) => {
  const getUser = async (user, accountuser) => {
    const username = user.includes('@') ? 'email' : 'username'
    const data = await accountuser.findOne({[username]: user})
    return data
  }

  const getOtp = async (userId, accountotp) => {
    return await accountotp.findOne({
      expires: {
        $gt: new Date()
      },
      userId
    })
  }

  koaPassport.serializeUser((user, done) => {
    done(null, user.id)
  })

  koaPassport.deserializeUser(async (id, done) => {
    done(null, id)
  })

  koaPassport.use(
    'sessionStart',
    new LocalStrategy(
      {
        passReqToCallback: true,
        usernameField
      },
      async (req, username, password, done) => {
        const {
          request,
          DBO: {accountotp, accountuser},
          helper: {isSameHashed}
        } = req.ctx
        const {otp} = request.body
        const user = username.replace(/\s/g, '')

        const doc = await getUser(user, accountuser)
        const otpDoc = otp ? await getOtp(doc ? doc.id : null, accountotp) : null
        const isOtpFailure = otp && (!otpDoc || !isSameHashed(otp, otpDoc.otp))
        const isPasswordFailure = doc && !isSameHashed(password, doc.password)
        if (!doc || isPasswordFailure || isOtpFailure) {
          return done(null, false)
        }
        if (otpDoc) {
          await accountotp.delete({userId: otpDoc.userId})
        }
        return done(null, doc)
      }
    )
  )

  koaPassport.use(
    'sessionValidation',
    new JwtStrategy(
      {
        jwtFromRequest: extractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: secretKey,
        passReqToCallback: true
      },
      async (req, jwtPayload, done) => {
        const {
          DBO: {accountuser}
        } = req.ctx
        const doc = await accountuser.findById(jwtPayload.user.id)
        if (!doc) {
          return done(null, false)
        }
        return done(null, true, doc)
      }
    )
  )

  koaPassport.use(
    'sessionRefresh',
    new JwtStrategy(
      {
        jwtFromRequest: extractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: secretKey,
        passReqToCallback: true
      },
      (req, jwtPayload, done) => {
        const {
          helper: {generateToken, sessionKey}
        } = req.ctx
        const {refreshToken} = generateToken(
          {id: jwtPayload.user.id},
          sessionKey,
          jwtExpiresInMinutes,
          jwtRefreshExpiresInMinutes
        )
        done(null, refreshToken)
      }
    )
  )

  /**
   * Verify a JWT token.
   *
   * @async
   * @function verify
   * @param {Object} ctx - the Koa Router context object.
   * @returns {Promise<Object>}
   */
  const verify = ctx => {
    return new Promise(resolve => {
      const returnValue = {...responseTemplate}
      koaPassport.authenticate('sessionValidation', (err, user) => {
        if (err || !user) {
          returnValue.status = 401
        } else {
          returnValue.status = 200
        }
        resolve(returnValue)
      })(ctx)
    })
  }

  /**
   * Refresh a JWT token.
   *
   * @async
   * @function refresh
   * @param {Object} ctx - the Koa Router context object.
   * @returns {Promise<Object>}
   */
  const refresh = ctx => {
    return new Promise(resolve => {
      const returnValue = {...responseTemplate}
      koaPassport.authenticate('sessionRefresh', (err, token) => {
        if (err || !token) {
          returnValue.status = 401
        } else {
          returnValue.status = 200
          returnValue.body = {
            token
          }
        }
        resolve(returnValue)
      })(ctx)
    })
  }

  /**
   * Checks whether JWT token is valid.
   *
   * @async
   * @function isAuthenticated
   * @param {Object} ctx - the Koa Router context object.
   * @returns {Promise<Boolean>}
   */
  const isAuthenticated = ctx => {
    return new Promise(resolve => {
      koaPassport.authenticate('sessionValidation', (err, authed) => {
        if (err || !authed) {
          resolve(false)
        } else {
          resolve(true)
        }
      })(ctx)
    })
  }

  /**
   * Checks whether JWT token is valid and returns the decrypted user object.
   *
   * @function getAuthenticatedUser
   * @param {Object} ctx - the Koa Router context object.
   * @returns {Promise<Object>}
   */
  const getAuthenticatedUser = ctx => {
    return new Promise(resolve => {
      koaPassport.authenticate('sessionValidation', (err, authed, user) => {
        if (err || !authed) {
          resolve(null)
        } else {
          resolve(user)
        }
      })(ctx)
    })
  }

  /**
   * Login middleware.
   *
   * @function login
   * @param {Object} ctx - the Koa Router context object.
   * @returns {Promise<Object>}
   */
  const login = ctx => {
    const {passport, generateToken, sessionKey, generateOTP, otpService} = ctx.helper
    const {sendOtp: otpInit} = ctx.request.body
    const {accountotp} = ctx.DBO
    const sendOtp = otpInit === true

    const returnValue = {...responseTemplate}

    return new Promise(resolve => {
      passport.authenticate('sessionStart', async (err, user) => {
        if (err || !user) {
          returnValue.status = 403
        } else {
          if (sendOtp) {
            try {
              const pin = generateOTP()
              await accountotp.delete({userId: user.id})
              await accountotp.insert({
                userId: user.id,
                expires: moment().add(30, 'minutes'),
                otp: pin
              })
              if (otpService) {
                await otpService(pin, ctx.DBO)
              }
              returnValue.status = 200
            } catch (e) {
              console.log('error: ', e)
              returnValue.status = 500
            }
          } else {
            const {token, expiresAfter, refreshToken} = generateToken(
              {id: user.id},
              sessionKey,
              jwtExpiresInMinutes,
              jwtRefreshExpiresInMinutes
            )
            if (!token) {
              returnValue.status = 500
            } else {
              returnValue.status = 200
              returnValue.body = {
                token,
                expiresAfter,
                refreshToken
              }
            }
          }
        }
        resolve(returnValue)
      })(ctx)
    })
  }

  return {
    passport: koaPassport,
    verify,
    refresh,
    isAuthenticated,
    getAuthenticatedUser,
    login
  }
}
