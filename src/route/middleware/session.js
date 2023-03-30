export default async (ctx, next) => {
  const isAuthenticated = await ctx.helper.isAuthenticated(ctx)
  if (isAuthenticated) {
    next()
  } else {
    ctx.status = 401
  }
}
