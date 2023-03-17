export default async (ctx, next) => {
	const {status, body} = await ctx.authentication.login(ctx)
	ctx.helper.middlewareHandler({ctx, next, status, body, isMiddleware: true})
}
