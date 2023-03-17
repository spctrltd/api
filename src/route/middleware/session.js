export default async (ctx, next) => {
	const isAuthenticated = await ctx.authentication.isAuthenticated(ctx)
	if (isAuthenticated) {
		next()
	} else {
		ctx.status = 401
	}
}
