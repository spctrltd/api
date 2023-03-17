import passport from 'koa-passport'
import {ExtractJwt as extractJwt, Strategy as JwtStrategy} from 'passport-jwt'
import {Strategy as LocalStrategy} from 'passport-local'
import moment from 'moment'

const responseTemplate = {status: 200, body: null}

export default ({secretKey, jwtExpiresInMinutes, jwtRefreshExpiresInMinutes}) => {
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

	passport.serializeUser((user, done) => {
		done(null, user.id)
	})

	passport.deserializeUser(async (id, done) => {
		done(null, id)
	})

	passport.use(
		'sessionStart',
		new LocalStrategy(
			{
				passReqToCallback: true,
				usernameField: 'username'
			},
			async (req, username, password, done) => {
				const {
					request,
					DBO: {accountotp, accountuser},
					authentication: {hashCompare}
				} = req.ctx
				const {sendOtp: otpInit, otp} = request.body
				const user = username.replace(/\s/g, '')
				const sendOtp = otpInit === true

				const doc = await getUser(user, accountuser)
				const otpDoc = otp ? await getOtp(doc ? doc.id : null, accountotp) : null
				const otpFailure = otp && (!otpDoc || !hashCompare(otp, otpDoc.otp))
				const passwordFailure = !otp && !sendOtp && doc && !hashCompare(password, doc.password)
				if (!doc || passwordFailure || otpFailure) {
					return done(null, false)
				}
				if (otpDoc) {
					await accountotp.delete({userId: otpDoc.userId})
				}
				return done(null, doc)
			}
		)
	)

	passport.use(
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

	passport.use(
		'sessionRefresh',
		new JwtStrategy(
			{
				jwtFromRequest: extractJwt.fromAuthHeaderAsBearerToken(),
				secretOrKey: secretKey,
				passReqToCallback: true
			},
			(req, jwtPayload, done) => {
				const {
					authentication: {generateToken, sessionKey}
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

	const verify = ctx => {
		return new Promise(resolve => {
			const returnValue = {...responseTemplate}
			passport.authenticate('sessionValidation', (err, user) => {
				if (err || !user) {
					returnValue.status = 401
				} else {
					returnValue.status = 200
				}
				resolve(returnValue)
			})(ctx)
		})
	}

	const refresh = ctx => {
		return new Promise(resolve => {
			const returnValue = {...responseTemplate}
			passport.authenticate('sessionRefresh', (err, token) => {
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

	const isAuthenticated = ctx => {
		return new Promise(resolve => {
			passport.authenticate('sessionValidation', (err, authed) => {
				if (err || !authed) {
					resolve(false)
				} else {
					resolve(true)
				}
			})(ctx)
		})
	}

	const getAuthenticatedUser = ctx => {
		return new Promise(resolve => {
			passport.authenticate('sessionValidation', (err, authed, user) => {
				if (err || !authed) {
					resolve(null)
				} else {
					resolve(user)
				}
			})(ctx)
		})
	}

	const login = ctx => {
		const {passport, generateToken, sessionKey, generateOTP, otpService} = ctx.authentication
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
		passport,
		verify,
		refresh,
		isAuthenticated,
		getAuthenticatedUser,
		login
	}
}
