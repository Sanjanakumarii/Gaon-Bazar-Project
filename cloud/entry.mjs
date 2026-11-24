import { authentication,currentUser } from './auth.mjs';
import {GET,POST} from './generated/market.mjs';
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  try {
   if (path==='/api/market' || path.startsWith('/auth/') || ['/signup','/signin-with-chatgpt','/signout-with-chatgpt'].includes(path)) {
    if(!env.DB) return new Response('Database setup is in progress. Please try again shortly.',{status:503});
    const auth=await authentication(request,env.DB); if(auth) return auth;
    if(path==='/api/market'){
     if(!['GET','POST'].includes(request.method)) return new Response('Method not allowed',{status:405});
     const user=await currentUser(request,env.DB);
     return request.method==='POST' ? POST(request,env,user) : GET(request,env,user);
    }
    return new Response('Not found',{status:404});
   }
   if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405});
   return env.ASSETS.fetch(request);
  } catch(error){console.error('Request failed',error.message);return Response.json({error:'Server error. Please retry.'},{status:500,headers:{'Cache-Control':'no-store'}});}
 }
};
