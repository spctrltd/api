export default async (ctx, next) => {
  const {status, body} = await ctx.helper.login(ctx)
  await ctx.helper.middlewareHandler(ctx, next, status, body, ctx.helper.IS_MIDDLEWARE)
}
