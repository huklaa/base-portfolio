export function onRequestGet({env}){
  return Response.json({configured:!!env.BLOCKSCOUT_API_KEY},{headers:{'Cache-Control':'no-store'}});
}
