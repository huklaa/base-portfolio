export function onRequestGet({env}){
  return Response.json({configured:!!env.BLOCKSCOUT_API_KEY,...(env.ENVIO_API_TOKEN?{historyProvider:"envio"}:{})},{headers:{'Cache-Control':'no-store'}});
}
