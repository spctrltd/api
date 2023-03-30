export default async (ctx, next) => {
  const {status, body} = await ctx.helper.login(ctx)
  ctx.helper.middlewareHandler(ctx, next, status, body, ctx.helper.IS_MIDDLEWARE)
}
