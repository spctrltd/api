export default async (ctx, next) => {
  const isAuthenticated = await ctx.helper.isAuthenticated(ctx)
  if (isAuthenticated) {
    await next()
  } else {
    ctx.status = 401
  }
}
