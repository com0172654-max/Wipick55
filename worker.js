const SESSION_SECONDS = 60 * 60 * 8;
const ALLOWED_STATUSES = new Set(["Pendente", "Aprovado", "Recusado"]);
function json(data, status=200, headers={}) { return new Response(JSON.stringify(data), {status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}}); }
function cookieValue(request,name){const c=request.headers.get("Cookie")||"";const part=c.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));return part?part.slice(name.length+1):"";}
function b64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
async function hmac(secret,value){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value)));}
async function makeSession(secret){const payload=b64(new TextEncoder().encode(JSON.stringify({exp:Math.floor(Date.now()/1000)+SESSION_SECONDS,nonce:crypto.randomUUID()})));return payload+"."+await hmac(secret,payload);}
async function validSession(request,secret){const token=cookieValue(request,"pink_admin");if(!token)return false;const [payload,sig,...rest]=token.split(".");if(!payload||!sig||rest.length)return false;const expected=await hmac(secret,payload);if(sig.length!==expected.length)return false;let same=true;for(let i=0;i<sig.length;i++)same=(sig.charCodeAt(i)===expected.charCodeAt(i))&&same;if(!same)return false;try{const obj=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-payload.length%4)%4)),c=>c.charCodeAt(0))));return obj.exp>Math.floor(Date.now()/1000)}catch{return false}}
function secureCookie(value,maxAge){return `pink_admin=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;}
export default {
 async fetch(request, env) {
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  if(!env.DB) return json({error:"Banco de dados não configurado. Siga o README para conectar o Cloudflare D1."},503);
  if(!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({error:"Segredos de administrador não configurados no Cloudflare."},503);
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":url.origin,"Access-Control-Allow-Credentials":"true","Vary":"Origin"}});
  if(url.pathname==="/api/register" && request.method==="POST"){
    let d;try{d=await request.json()}catch{return json({error:"Dados inválidos."},400)}
    const name=String(d.name||"").trim(),email=String(d.email||"").trim().toLowerCase(),phone=String(d.phone||"").trim();
    if(name.length<2||name.length>120||!/^.{1,120}@[^.\s@]+(?:\.[^.\s@]+)+$/.test(email)||email.length>180||phone.length>40||d.consent!==true)return json({error:"Confira nome, e-mail e autorização de contato."},400);
    const id=crypto.randomUUID();const now=new Date().toISOString();
    try{await env.DB.prepare("INSERT INTO registrations (id,name,email,phone,status,created_at) VALUES (?1,?2,?3,?4,'Pendente',?5)").bind(id,name,email,phone||null,now).run();return json({ok:true,id},201)}catch(e){return json({error:"Não foi possível salvar o cadastro. Verifique a configuração do banco."},500)}
  }
  if(url.pathname==="/api/admin/login" && request.method==="POST"){
    let d;try{d=await request.json()}catch{return json({error:"Requisição inválida."},400)}
    const supplied=String(d.password||"");if(supplied.length<1||supplied.length>256)return json({error:"Senha incorreta."},401);
    // ADMIN_PASSWORD must be set as a Cloudflare secret, never placed in source files.
    if(supplied!==env.ADMIN_PASSWORD)return json({error:"Senha incorreta."},401);
    const token=await makeSession(env.SESSION_SECRET);
    return json({ok:true},200,{"Set-Cookie":secureCookie(token,SESSION_SECONDS)});
  }
  if(url.pathname==="/api/admin/logout" && request.method==="POST")return json({ok:true},200,{"Set-Cookie":secureCookie("",0)});
  if(!url.pathname.startsWith("/api/admin/"))return json({error:"Rota não encontrada."},404);
  if(!(await validSession(request,env.SESSION_SECRET)))return json({error:"Sessão expirada. Entre novamente."},401);
  if(url.pathname==="/api/admin/registrations" && request.method==="GET"){
    const {results=[]}=await env.DB.prepare("SELECT id,name,email,phone,status,created_at FROM registrations ORDER BY created_at DESC LIMIT 1000").all();
    return json({registrations:results});
  }
  const match=url.pathname.match(/^\/api\/admin\/registrations\/([0-9a-f-]{36})$/i);
  if(match && request.method==="PATCH"){
    let d;try{d=await request.json()}catch{return json({error:"Dados inválidos."},400)}
    if(!ALLOWED_STATUSES.has(d.status))return json({error:"Status inválido."},400);
    const res=await env.DB.prepare("UPDATE registrations SET status=?1 WHERE id=?2").bind(d.status,match[1]).run();
    if(!res.meta.changes)return json({error:"Cadastro não encontrado."},404);
    return json({ok:true});
  }
  return json({error:"Rota não encontrada."},404);
 }
};