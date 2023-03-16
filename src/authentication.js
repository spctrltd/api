import passport from 'koa-passport'
import {ExtractJwt as extractJwt, Strategy as jwtStrategy} from 'passport-jwt'
import {Strategy as localStrategy} from 'passport-local'
import {generateToken} from './helper.js'

const {SESSION_KEY = 'ba21767ae494afe5a2165dcb3338c5323e9907050e34542c405d575cc31bf527'} = process.env

const getUser = async (user, database) => {
	const username = user.includes('@') ? 'email' : 'username'
	const data = await database.findOne('accountuser', {[username]: user})
	return data
}

const getOtp = async (userId, database) => {
	return await database.findOne('accountotp', {
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
	'session',
	new localStrategy(
		{
			passReqToCallback: true,
			usernameField: 'username'
		},
		async (req, username, password, done) => {
			const {request, database} = req.ctx
			const {otpSend, otp} = request.body
			const user = username.replace(/\s/g, '')
			const sendOTP = otpSend === true

			const doc = await getUser(user, database)
			const otpDoc = otp ? await getOtp(doc ? doc.id : null, database) : null
			const otpFailure = otp && (!otpDoc || !otpDoc.validPassword(otp))
			const passwordFailure = !otp && !sendOTP && doc && !doc.validPassword(password)
			if (!doc || passwordFailure || otpFailure) {
				return done(null, false)
			}
			if (otpDoc) {
				await database.deleteAll('accountotp', {userId: otpDoc.userId})
			}
			return done(null, doc)
		}
	)
)

passport.use(
	'sessionJwt',
	new jwtStrategy(
		{
			jwtFromRequest: extractJwt.fromExtractors([
				extractJwt.fromUrlQueryParameter('auth_token'),
				extractJwt.fromAuthHeaderWithScheme('JWT')
			]),
			secretOrKey: SESSION_KEY
		},
		(jwtPayload, cb) => {
			const query = {
				_id: jwtPayload.user.id
			}

			userModel.findOne(query, (err, doc) => {
				if (err) {
					return cb(err)
				}
				if (!doc) {
					return cb(null, false)
				}
				return cb(null, true, doc)
			})
		}
	)
)

passport.use(
	'sessionREFRESH',
	new jwtStrategy(
		{
			jwtFromRequest: extractJwt.fromExtractors([extractJwt.fromAuthHeaderWithScheme('JWT')]),
			secretOrKey: SESSION_KEY
		},
		(jwtPayload, cb) => {
			generateToken({id: jwtPayload.user.id}, (err, refreshData) => {
				cb(err, refreshData)
			})
		}
	)
)

export default {
	passport
}
