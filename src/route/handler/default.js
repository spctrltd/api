export default async ctx => {
  ctx.body = ctx.helper.formatedResponse({hello: ':)'})
}
