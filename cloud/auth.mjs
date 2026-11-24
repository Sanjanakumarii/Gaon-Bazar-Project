const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:encoder.encode(salt)},key,256));
}
function same(a,b) { if(a.length!==b.length) return false; let difference=0; for(let i=0;i<a.length;i++) difference |= a.charCodeAt(i)^b.charCodeAt(i); return difference===0; }
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token = request => request.headers.get('cookie')?.match(/(?:^|;\s*)gb_session=([a-f0-9]{64})(?:;|$)/)?.[1];
export async function currentUser(request, db) {
  const value = token(request); if (!value) return null;
  return db.prepare('SELECT u.id AS userId,u.name AS displayName,u.email FROM cloud_sessions s JOIN cloud_users u ON u.id=s.user WHERE s.token=? AND s.expires>?').bind(await digest(value),Date.now()).first();
}
function page(signup, error='') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${signup?'Create account':'Log in'} · Gaon Bazaar</title><link rel="stylesheet" href="/style.css"></head><body><main style="max-width:480px;padding-top:50px"><a class="brand" href="/">⌂ gaonbazaar</a><section class="seller-shop" style="margin-top:24px"><span class="eyebrow">YOUR VILLAGE, YOUR MARKETPLACE</span><h1>${signup?'Create your account':'Welcome back'}</h1><p class="muted">One account to shop and run your own store.</p>${error?`<p class="error" role="alert">${escape(error)}</p>`:''}<form action="/auth/${signup?'signup':'login'}" method="post">${signup?'<label>Your name / आपका नाम<input name="name" autocomplete="name" minlength="2" maxlength="80" required></label>':''}<label>Email<input name="email" type="email" autocomplete="email" maxlength="200" required></label><label>Password / पासवर्ड<input name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="8" maxlength="128" required></label><button class="primary full">${signup?'Create account / खाता बनाएँ':'Log in / लॉग इन'} →</button></form><p class="small" style="margin-top:20px">${signup?'Already registered? <a href="/signin-with-chatgpt">Log in</a>':'New here? <a href="/signup">Create an account / खाता बनाएँ</a>'}</p><p class="small muted">Use at least 8 characters for your password.</p></section></main></body></html>`;
}
const html = (body,status=200,extra={}) => new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
export async function authentication(request,db) {
  const url = new URL(request.url), path=url.pathname;
  if (request.method==='GET' && ['/signup','/signin-with-chatgpt'].includes(path)) return html(page(path==='/signup'));
  if (path==='/signout-with-chatgpt' && request.method==='GET') {
    if (request.headers.get('sec-fetch-site')==='cross-site') return html('Open Gaon Bazaar to log out.',403);
    const value=token(request); if(value) await db.prepare('DELETE FROM cloud_sessions WHERE token=?').bind(await digest(value)).run();
    return html('',303,{'Location':'/','Set-Cookie':'gb_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'});
  }
  if (!['/auth/login','/auth/signup'].includes(path)) return null;
  if(request.method!=='POST') return html('Method not allowed',405);
  if(request.headers.get('origin')!==url.origin) return html('Invalid request origin',403);
  const signup=path==='/auth/signup';
  if(Number(request.headers.get('content-length')||0)>25000) return html('Request too large',413);
  const reader=request.body?.getReader(); let body='', size=0;
  if(reader) { const decoder=new TextDecoder(); while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>25000){await reader.cancel();return html('Request too large',413);}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}
  const key=await digest(request.headers.get('cf-connecting-ip')||'unknown');
  const now=Date.now();
  await db.prepare('INSERT INTO cloud_attempts (id,count,until) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END').bind(key,now+900000,now,now).run();
  const attempt=await db.prepare('SELECT count FROM cloud_attempts WHERE id=?').bind(key).first();
  if(attempt.count>40) return html(page(signup,'Too many attempts. Please try again in 15 minutes.'),429);
  const form=new URLSearchParams(body),email=(form.get('email')||'').trim().toLowerCase(),password=form.get('password')||'',name=(form.get('name')||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||password.length<8||password.length>128||(signup&&(name.length<2||name.length>80))) return html(page(signup,'Enter valid details and a password of 8–128 characters.'),400);
  let user=await db.prepare('SELECT * FROM cloud_users WHERE email=?').bind(email).first();
  if(signup){
    if(user) return html(page(true,'This email is already registered. Please log in.'),409);
    const salt=random(); user={id:crypto.randomUUID(),name,email,salt,password:await passwordHash(password,salt)};
    const created=await db.prepare('INSERT OR IGNORE INTO cloud_users(id,name,email,salt,password) VALUES (?,?,?,?,?)').bind(user.id,user.name,email,salt,user.password).run();
    if(!created.meta.changes) return html(page(true,'This email is already registered. Please log in.'),409);
  } else {
    const calculated=await passwordHash(password,user?.salt||'not-a-real-account-salt');
    if(!user||!same(calculated,user.password)) return html(page(false,'Email or password is incorrect.'),401);
  }
  const session=random();
  await db.batch([
    db.prepare('INSERT INTO cloud_sessions(token,user,expires) VALUES (?,?,?)').bind(await digest(session),user.id,now+7*86400000),
    db.prepare('DELETE FROM cloud_attempts WHERE id=? OR until<?').bind(key,now),
    db.prepare('DELETE FROM cloud_sessions WHERE expires<?').bind(now)
  ]);
  return html('',303,{'Location':'/','Set-Cookie':`gb_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`});
}
