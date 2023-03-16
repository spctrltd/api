import moment from 'moment'

/**
 * Login Request.
 *
 * 
 *
 * @return {KoaBodyDirectOptions.Response}
 * @api public
 */
export default ctx => {
	const {passport, generateToken, sessionKey, generateOTP, otpService} = ctx.helpers
	const {otpSend} = ctx.request.body
	const sendOTP = otpSend === true
	return passport.authenticate('session', async (err, user) => {
		if (err || !user) {
			ctx.status = 403
			return
		}

		if (sendOTP) {
			try {
				const pin = generateOTP()
				await ctx.database.deleteMany('accountotp', {userId: user.id})
				await ctx.database.insert('accountotp', {userId: user.id, expires: moment().add(30, 'minutes'), otp: pin})
				if (otpService) {
					await otpService(pin, database)
				}
				ctx.status = 200
				return
			} catch (e) {
				console.log('error: ', e)
				ctx.status = 500
				return
			}
		}
	
		const {token, expiresAfter, refreshToken} = generateToken({id: user.id}, sessionKey)
		if (!token) {
			ctx.status = 500
			return
		}

		ctx.status = 200
		ctx.body = JSON.stringify({
			token, expiresAfter, refreshToken
		})
	})(ctx)
}