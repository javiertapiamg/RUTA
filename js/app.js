/* RUTA · app */
(function(){
"use strict";

/* ═════════ base ═════════ */
const cfg=window.RUTA_CONFIG;
const sb=window.supabase.createClient(cfg.url,cfg.key,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"implicit"}
});
const $=s=>document.querySelector(s);
const cvar=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MES3=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DIAS=["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

const NOW=new Date();
const pad=n=>String(n).padStart(2,"0");
const dkey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parseD=s=>{const p=String(s).split("-");return new Date(+p[0],+p[1]-1,+p[2])};
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const TODAY=dkey(NOW);
const T0=new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate());
const daysTo=s=>Math.round((parseD(s)-T0)/864e5);

const AREAS=[
  {k:"proyectos",  n:"Proyectos",   c:"--c-proyectos"},
  {k:"oficio",     n:"Oficio",      c:"--c-oficio"},
  {k:"plata",      n:"Plata",       c:"--c-plata"},
  {k:"aprendizaje",n:"Aprendizaje", c:"--c-aprendizaje"},
  {k:"perros",     n:"Otto y Pipo", c:"--c-perros"},
  {k:"cuerpo",     n:"Cuerpo",      c:"--c-cuerpo"},
  {k:"presto",     n:"Presto",      c:"--c-presto"},
  {k:"vinculos",   n:"Vínculos",    c:"--c-vinculos"}
];
const SEED_AREAS={
  oficio:"Trabajo por proyecto, sin operativa nocturna",
  proyectos:"Canal de YouTube de mitología latinoamericana",
  aprendizaje:"15 minutos al día",
  plata:"Abonar al crédito del auto y juntar para el viaje",
  cuerpo:"Ejercicio en la noche y dormir a hora",
  perros:"Paseo largo al mediodía con Otto y Pipo",
  vinculos:"Fiestas de fin de año con la abuela en Sucre",
  presto:"Evaluar la finca y cotizar la granja de champiñones"
};
const SEED_GOALS=[
  {title:"Comprar el auto",                kind:"macro",area:"plata",   due:null,        pinned:false,done:true},
  {title:"Licencia de conducir clase B",   kind:"macro",area:null,      due:"2026-12-05",pinned:false,done:false},
  {title:"Viaje por tierra a Bolivia",     kind:"macro",area:"vinculos",due:"2026-12-19",pinned:false,done:false},
  {title:"Navidad en Sucre",               kind:"macro",area:"vinculos",due:"2026-12-25",pinned:true, done:false},
  {title:"Año Nuevo en Sucre",             kind:"macro",area:"vinculos",due:"2027-01-01",pinned:false,done:false},
  {title:"Ir a Presto a ver la finca",     kind:"macro",area:"presto",  due:"2027-02-15",pinned:false,done:false}
];
const HABITS=[
  {k:"paseo",    n:"Paseo largo", t:"12:30",  a:"#FFB36B",b:"#F58634"},
  {k:"bloque",   n:"Bloque canal",t:"1 hora", a:"#FF9E7A",b:"#F26A4B"},
  {k:"formacion",n:"Formación",   t:"15 min", a:"#FFDE7A",b:"#F2BC27"},
  {k:"ejercicio",n:"Ejercicio",   t:"noche",  a:"#9ADCFF",b:"#3FA9E8"}
];
const URG=[
  {n:"tranqui", c:"#B8BFCC"},
  {n:"normal",  c:"#5CBBEE"},
  {n:"importante",c:"#F2BC27"},
  {n:"urgente", c:"#F0867A"}
];
const QUOTES=[
  ["La paciencia es amarga, pero su fruto es dulce.","Aristóteles"],
  ["No cuentes los días, haz que los días cuenten.","Muhammad Ali"],
  ["Un viaje de mil millas comienza con un solo paso.","Lao Tse"],
  ["Nada pesado se construye rápido.","el método"],
  ["Somos lo que hacemos repetidamente.","Will Durant"],
  ["El que tiene un porqué para vivir soporta casi cualquier cómo.","Nietzsche"],
  ["Caminante, no hay camino, se hace camino al andar.","Antonio Machado"]
];

let UID=null;
const S={areas:{},days:{},tasks:[],goals:[],prefs:{},journal:[],people:[],memories:[],money:[],jobs:[]};
AREAS.forEach(a=>S.areas[a.k]={score:0,goal:"",note:"",photo:""});

/* ═════════ tema: claro de día, oscuro de noche ═════════ */
function themePref(){try{return localStorage.getItem("ruta-theme")}catch(_){return null}}
function applyTheme(){
  const h=new Date().getHours();
  const t=themePref()||((h>=20||h<7)?"dark":"light");
  document.documentElement.setAttribute("data-theme",t);
  const b=$("#theme");if(b)b.textContent=t==="dark"?"modo claro":"modo oscuro";
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==="dark"?"#0E1017":"#F3F4F7";
}
applyTheme();

/* ═════════ aviso ═════════ */
let toastT=null;
function toast(msg){
  const el=$("#toast");el.textContent=msg;el.classList.add("show");
  clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove("show"),2600);
}
function fail(e,what){
  console.error(what,e);
  const d=e&&(e.message||e.details)||"";
  toast("No se pudo "+what+(d&&!/fetch|network/i.test(d)?": "+String(d).slice(0,90):". Revisa tu conexión."));
}

/* ═════════ sonido ═════════ */
let actx=null;
function tone(f1,f2,vol,dur,type){
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==="suspended")actx.resume();
    const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();
    o.type=type||"sine";o.frequency.setValueAtTime(f1,t);
    o.frequency.exponentialRampToValueAtTime(f2,t+dur*.4);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(actx.destination);o.start(t);o.stop(t+dur+.02);
  }catch(_){}
}
const blip=up=>{tone(up?587:440,up?988:349,.07,.3);tone(up?1175:880,up?1975:698,.03,.26,"triangle")};
const tick=()=>tone(1560,1680,.02,.08);
const woosh=()=>tone(320,1150,.045,.35,"triangle");

/* ═════════ entrada ═════════ */
function showLogin(){
  $("#login").hidden=false;$("#app").hidden=true;$("#nav").hidden=true;
}
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("#email").value.trim();if(!email)return;
  const btn=$("#loginBtn");btn.disabled=true;btn.textContent="Enviando…";
  const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
  btn.disabled=false;btn.textContent="Enviarme el link";
  if(error){toast(error.message.includes("rate")?"Espera un minuto antes de pedir otro link.":"No se pudo enviar el link.");return}
  $("#loginForm").hidden=true;$("#sent").hidden=false;
});

let started=false;
async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(session)start(session);else showLogin();
  sb.auth.onAuthStateChange((ev,s)=>{
    if(ev==="SIGNED_IN"&&s&&!started)start(s);
    if(ev==="SIGNED_OUT")location.reload();
  });
}
async function start(session){
  if(started)return;started=true;
  UID=session.user.id;
  if(location.hash.includes("access_token"))history.replaceState(null,"",location.pathname);
  $("#login").hidden=true;$("#app").hidden=false;$("#nav").hidden=false;
  $("#app").classList.add("loading");
  paintStatic();
  try{
    await ensureSeed();
    await loadAll();
  }catch(e){fail(e,"cargar tus datos")}
  $("#app").classList.remove("loading");
  renderAll();
  route();
  setTimeout(()=>document.body.classList.add("booted"),1600);
}
$("#logout").addEventListener("click",()=>sb.auth.signOut());

/* ═════════ datos ═════════ */
async function ensureSeed(){
  const a=await sb.from("areas").select("key",{count:"exact",head:true});
  if(a.error)throw a.error;
  if(!a.count){
    const rows=AREAS.map(x=>({user_id:UID,key:x.k,score:0,goal:SEED_AREAS[x.k]||""}));
    const r=await sb.from("areas").insert(rows);if(r.error)throw r.error;
  }
  const g=await sb.from("goals").select("id",{count:"exact",head:true});
  if(g.error)throw g.error;
  if(!g.count){
    const rows=SEED_GOALS.map(x=>Object.assign({user_id:UID},x,{done_at:x.done?new Date().toISOString():null}));
    const r=await sb.from("goals").insert(rows);if(r.error)throw r.error;
  }
}
async function loadAll(){
  const since=dkey(addDays(T0,-20));
  const [a,d,t,g,st]=await Promise.all([
    sb.from("areas").select("key,score,goal,note,photo"),
    sb.from("days").select("day,habits,kind,note").gte("day",since),
    sb.from("tasks").select("id,title,starts_at,all_day,urgency,done").or('done.eq.false,starts_at.gte."'+T0.toISOString()+'"'),
    sb.from("goals").select("id,parent_id,title,kind,area,due,pinned,done,done_at,photo"),
    sb.from("settings").select("prefs,telegram_chat_id").maybeSingle()
  ]);
  [a,d,t,g,st].forEach(r=>{if(r.error)throw r.error});
  S.prefs=(st.data&&st.data.prefs)||{};
  S.tg=!!(st.data&&st.data.telegram_chat_id);
  a.data.forEach(r=>{if(S.areas[r.key])S.areas[r.key]={score:r.score||0,goal:r.goal||"",note:r.note||"",photo:r.photo||""}});
  S.days={};d.data.forEach(r=>{S.days[r.day]={habits:r.habits||{},kind:r.kind||"normal",note:r.note||""}});
  S.tasks=t.data;
  S.goals=g.data;
}

/* ═════════ fotos ═════════ */
const BUCKET="fotos";
function loadImg(file){
  return new Promise((res,rej)=>{
    const u=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{URL.revokeObjectURL(u);res(im)};
    im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("imagen ilegible"))};
    im.src=u;
  });
}
async function shrink(file,max){
  let src=null;
  if(window.createImageBitmap){try{src=await createImageBitmap(file)}catch(_){src=null}}
  if(!src)src=await loadImg(file);
  const w=src.width,h=src.height,k=Math.min(1,max/Math.max(w,h));
  const c=document.createElement("canvas");
  c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
  c.getContext("2d").drawImage(src,0,0,c.width,c.height);
  return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("no se pudo procesar")),"image/jpeg",.84));
}
async function uploadPhoto(file,slot,max){
  const blob=await shrink(file,max);
  const path=UID+"/"+slot+"-"+Date.now()+".jpg";
  const r=await sb.storage.from(BUCKET).upload(path,blob,{contentType:"image/jpeg",cacheControl:"31536000"});
  if(r.error)throw r.error;
  return path;
}
async function photoUrl(path){
  if(!path)return null;
  const key="ruta-url:"+path;
  try{const c=JSON.parse(localStorage.getItem(key)||"null");if(c&&c.exp>Date.now())return c.url}catch(_){}
  const r=await sb.storage.from(BUCKET).createSignedUrl(path,60*60*24*7);
  if(r.error||!r.data)return null;
  try{localStorage.setItem(key,JSON.stringify({url:r.data.signedUrl,exp:Date.now()+6*864e5}))}catch(_){}
  return r.data.signedUrl;
}
function dropPhoto(path){
  if(!path)return;
  try{localStorage.removeItem("ruta-url:"+path)}catch(_){}
  sb.storage.from(BUCKET).remove([path]).then(()=>{},()=>{});
}
function pickFile(multi){
  return new Promise(res=>{
    const inp=$("#filePick");inp.value="";inp.multiple=!!multi;
    inp.onchange=()=>res(multi?Array.prototype.slice.call(inp.files||[]):(inp.files&&inp.files[0]||null));
    inp.click();
  });
}
async function savePrefs(){
  const r=await sb.from("settings").upsert({user_id:UID,prefs:S.prefs,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(r.error)throw r.error;
}
/* ── fondo: carrusel con disolución de ruido (WebGL), con respaldo CSS ── */
const BG=(function(){
  const cv=document.createElement("canvas");cv.id="bgcanvas";cv.setAttribute("aria-hidden","true");
  document.body.insertBefore(cv,document.body.firstChild);
  let gl=null;
  try{gl=cv.getContext("webgl",{antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false})}catch(_){gl=null}
  const VS="attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}";
  const FS=`precision mediump float;
uniform sampler2D t0,t1;uniform vec2 r0,r1,res;uniform float p,time,h0,h1,kb;varying vec2 v;
float hs(vec2 x){return fract(sin(dot(x,vec2(127.1,311.7)))*43758.5453);}
float ns(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(hs(i),hs(i+vec2(1.,0.)),f.x),mix(hs(i+vec2(0.,1.)),hs(i+1.),f.x),f.y);}
float fbm(vec2 x){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*ns(x);x*=2.03;a*=.5;}return s;}
vec2 cover(vec2 uv,vec2 im){float ra=res.x/res.y,ia=im.x/im.y;
  vec2 sc=ra>ia?vec2(1.,ia/ra):vec2(ra/ia,1.);return (uv-.5)*sc+.5;}
vec2 kz(vec2 uv,float k){float z=1.07+.03*sin(time*.021+k)*kb;
  vec2 d=vec2(sin(time*.017+k),cos(time*.013+k))*.012*kb;return (uv-.5)/z+.5+d;}
void main(){
  vec2 uv=vec2(v.x,1.-v.y);
  vec3 c0=h0>.5?texture2D(t0,kz(cover(uv,r0),0.)).rgb:vec3(.5);
  vec3 c1=h1>.5?texture2D(t1,kz(cover(uv,r1),2.3)).rgb:c0;
  vec3 col=c0;
  if(p>0.&&p<1.){
    float n=fbm(uv*vec2(res.x/res.y,1.)*2.4+time*.03);
    float w=.16,m=smoothstep(n-w,n+w,p*(1.+2.*w)-w);
    float e=1.-abs(m*2.-1.);
    col=mix(c0,c1,m)+pow(e,3.)*vec3(.62,.56,.86)*.5;
  }else if(p>=1.)col=c1;
  col+=(hs(uv*res+fract(time*3.7))-.5)*.075;
  gl_FragColor=vec4(col,1.);
}`;
  let prog=null,U={},tex=[null,null],dims=[[1,1],[1,1]],has=[0,0],p=0,anim=null,running=false,lastDraw=0;
  let list=[],idx=0,timer=null,useGL=!!gl,cssEl=$("#bgphoto");
  function sh(type,src){const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);
    if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o}
  if(useGL){
    try{
      prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));
      gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error("link");
      gl.useProgram(prog);
      const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(prog,"a");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      ["t0","t1","r0","r1","res","p","time","h0","h1","kb"].forEach(k=>U[k]=gl.getUniformLocation(prog,k));
      gl.uniform1i(U.t0,0);gl.uniform1i(U.t1,1);
      for(let i=0;i<2;i++){
        tex[i]=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex[i]);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      }
    }catch(e){console.warn("fondo sin WebGL",e);useGL=false}
  }
  function size(){
    if(!useGL)return;
    const d=Math.min(1.5,window.devicePixelRatio||1),w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);
    if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;gl.viewport(0,0,w,h)}
  }
  addEventListener("resize",size);
  function draw(t){
    if(!running)return;
    requestAnimationFrame(draw);
    if(document.hidden)return;
    if(anim){
      const k=Math.min(1,(t-anim.t0)/anim.d);p=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      if(k>=1){
        const tt=tex[0];tex[0]=tex[1];tex[1]=tt;const dd=dims[0];dims[0]=dims[1];dims[1]=dd;
        has[0]=1;has[1]=0;p=0;anim=null;
      }
    }else if(t-lastDraw<1000/24)return;
    lastDraw=t;size();
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex[0]);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tex[1]);
    gl.uniform2f(U.r0,dims[0][0],dims[0][1]);gl.uniform2f(U.r1,dims[1][0],dims[1][1]);
    gl.uniform2f(U.res,cv.width,cv.height);gl.uniform1f(U.p,p);gl.uniform1f(U.time,t/1000);
    gl.uniform1f(U.h0,has[0]);gl.uniform1f(U.h1,has[1]);gl.uniform1f(U.kb,reduce?0:1);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  function load(url){
    return new Promise((res,rej)=>{const im=new Image();im.crossOrigin="anonymous";
      im.onload=()=>res(im);im.onerror=()=>rej(new Error("foto"));im.src=url});
  }
  async function showGL(url,first){
    const im=await load(url),slot=first?0:1;
    gl.bindTexture(gl.TEXTURE_2D,tex[slot]);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im);
    dims[slot]=[im.naturalWidth,im.naturalHeight];
    if(first){has[0]=1;p=0;anim=null;cv.classList.add("on");}
    else{has[1]=1;anim={t0:performance.now(),d:reduce?400:2600}}
    if(!running){running=true;requestAnimationFrame(draw)}
  }
  async function showCSS(url){
    const im=await load(url).catch(()=>null);if(!im)return;
    cssEl.classList.remove("on");
    setTimeout(()=>{cssEl.style.backgroundImage='url("'+url+'")';cssEl.classList.add("on")},cssEl.style.backgroundImage?700:0);
  }
  async function show(i,first){
    const url=await photoUrl(list[i]);if(!url)return;
    if(useGL){
      try{await showGL(url,first)}
      catch(e){console.warn("fondo: uso respaldo",e);useGL=false;cv.classList.remove("on");running=false;await showCSS(url)}
    }else await showCSS(url);
  }
  function set(paths){
    const key=JSON.stringify(paths);if(key===JSON.stringify(list))return;
    list=paths.slice();clearInterval(timer);timer=null;
    document.body.classList.toggle("has-photo",list.length>0);
    if(!list.length){cv.classList.remove("on");running=false;cssEl.classList.remove("on");return}
    idx=Math.floor(Date.now()/86400000)%list.length;
    show(idx,true);
    if(list.length>1)timer=setInterval(()=>{if(document.hidden)return;idx=(idx+1)%list.length;show(idx,false)},30000);
  }
  return{set};
})();
function bgPaths(){
  if(!Array.isArray(S.prefs.bgs))S.prefs.bgs=S.prefs.bg?[S.prefs.bg]:[];
  return S.prefs.bgs;
}
async function applyBg(){
  const l=bgPaths();
  $("#bgBtn").textContent=l.length?"fotos de fondo ("+l.length+")":"poner fotos de fondo";
  BG.set(l);
}
function renderBgGrid(){
  const l=bgPaths(),g=$("#bgGrid");
  g.innerHTML=l.length?l.map((p,i)=>`<div class="bg-th" data-photo="${esc(p)}"><button type="button" class="x" data-i="${i}" aria-label="Quitar esta foto">×</button></div>`).join("")
    :'<p class="bg-empty">Todavía no hay fotos. Agrega las que quieras ver detrás de tu RUTA.</p>';
  hydrate(g);
}
$("#bgBtn").addEventListener("click",()=>{renderBgGrid();$("#bgModal").hidden=false;tick()});
$("#bgDone").addEventListener("click",()=>{$("#bgModal").hidden=true});
$("#bgModal").addEventListener("click",e=>{if(e.target.id==="bgModal")$("#bgModal").hidden=true});
$("#bgAdd").addEventListener("click",async()=>{
  const files=await pickFile(true);if(!files.length)return;
  const b=$("#bgAdd");b.disabled=true;
  try{
    for(let i=0;i<files.length;i++){
      b.textContent="subiendo "+(i+1)+" de "+files.length+"…";
      bgPaths().push(await uploadPhoto(files[i],"fondo",2200));
    }
    delete S.prefs.bg;await savePrefs();blip(true);
  }catch(e){fail(e,"subir la foto")}
  b.disabled=false;b.textContent="+ Agregar fotos";renderBgGrid();applyBg();
});
$("#bgGrid").addEventListener("click",async e=>{
  const x=e.target.closest(".x");if(!x)return;
  const l=bgPaths(),i=+x.dataset.i,old=l[i];
  l.splice(i,1);delete S.prefs.bg;
  try{await savePrefs();dropPhoto(old);tone(500,300,.04,.18)}catch(err){l.splice(i,0,old);fail(err,"quitar la foto")}
  renderBgGrid();applyBg();
});
let heroGoal=null;
const SUNSET="linear-gradient(180deg,#FCDCAC 0%,#F4AC7C 26%,#DA8372 46%,#9D6376 64%,#60476A 80%,#3B3053 100%)";
$("#heroPhotoBtn").addEventListener("click",async()=>{
  if(!heroGoal)return;
  const f=await pickFile();if(!f)return;
  const b=$("#heroPhotoBtn"),g=heroGoal;b.classList.add("busy");
  try{
    const old=g.photo,path=await uploadPhoto(f,"meta",1600);
    const r=await sb.from("goals").update({photo:path}).eq("id",g.id);
    if(r.error)throw r.error;
    g.photo=path;dropPhoto(old);blip(true);
  }catch(e){fail(e,"subir la foto")}
  b.classList.remove("busy");paintHero();
});
async function paintHero(){
  const ph=$("#ph"),g=heroGoal,svg=ph.querySelector("svg");
  $("#heroPhotoBtn").hidden=!g;
  const url=g&&g.photo?await photoUrl(g.photo):null;
  if(g!==heroGoal)return;
  if(url){ph.style.backgroundImage='url("'+url+'")';if(svg)svg.style.display="none"}
  else{ph.style.backgroundImage=SUNSET;if(svg)svg.style.display=""}
}

/* ═════════ encabezado, frase y "lo que viene" ═════════ */
function upcoming(){
  return S.goals.filter(g=>g.kind==="macro"&&!g.done&&g.due&&daysTo(g.due)>=0)
                .sort((x,y)=>x.due<y.due?-1:1);
}
function paintStatic(){
  const dn=DIAS[NOW.getDay()];
  $("#date").textContent=dn[0].toUpperCase()+dn.slice(1)+(innerWidth<520?" "+NOW.getDate()+" "+MES3[NOW.getMonth()]:", "+NOW.getDate()+" de "+MESES[NOW.getMonth()]);
  const q=QUOTES[(NOW.getFullYear()*372+NOW.getMonth()*31+NOW.getDate())%QUOTES.length];
  $("#qt").textContent=q[0];$("#qa").textContent="— "+q[1];
  const ph=$("#ph");
  ph.style.backgroundImage=SUNSET;
  if(!ph.querySelector("svg"))ph.insertAdjacentHTML("beforeend",
    '<svg viewBox="0 0 600 180" preserveAspectRatio="none" style="position:absolute;inset:auto 0 0;width:100%;height:60%">'+
    '<path d="M0 180 L0 118 L62 72 L112 104 L168 56 L224 98 L286 44 L348 92 L402 62 L470 110 L530 78 L600 116 L600 180Z" fill="#2F2847" opacity=".82"/>'+
    '<path d="M0 180 L0 146 L74 120 L140 148 L206 118 L278 150 L352 124 L430 152 L502 128 L600 150 L600 180Z" fill="#221C36" opacity=".92"/></svg>');
}
function countTo(el,target){
  if(reduce){el.textContent=target;return}
  const t0=performance.now();
  (function step(t){const p=Math.min(1,(t-t0)/950),e=1-Math.pow(1-p,3);
    el.textContent=Math.round(target*e);if(p<1)requestAnimationFrame(step)})(t0);
}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function fmtDue(s){const d=parseD(s);return d.getDate()+" "+MES3[d.getMonth()]}

function renderNext(){
  const up=upcoming();
  const hero=up.find(g=>g.pinned)||up[0];
  heroGoal=hero||null;paintHero();
  if(hero){
    const d=daysTo(hero.due);
    countTo($("#cd"),d);
    $("#cdl").textContent=(d===1?"día para ":"días para ")+hero.title;
    $("#heroT").textContent=hero.title;
    $("#heroS").textContent=fmtDue(hero.due)+" · faltan "+d+(d===1?" día":" días");
  }else{
    $("#cd").textContent="—";$("#cdl").textContent="sin hitos";
    $("#heroT").textContent="Sin hitos por delante";$("#heroS").textContent="Agrégalos en Sueños";
  }
  const rest=up.filter(g=>g!==hero).slice(0,3);
  $("#nextList").innerHTML=rest.map(g=>{
    const d=daysTo(g.due);
    return `<li data-goal="${g.id}" title="Toca para editar"><b>${d}</b><span class="u">${d===1?"día":"días"}</span>`+
      `<span class="w">${esc(g.title)}<small>${fmtDue(g.due)}</small></span></li>`;
  }).join("");
  const recent=S.goals.filter(g=>g.kind==="macro"&&g.done&&g.done_at&&(Date.now()-new Date(g.done_at))<30*864e5);
  const won=$("#won");
  if(recent.length){
    won.hidden=false;
    won.innerHTML=`<i>✓</i><span><b>${esc(recent[0].title)}</b> — logrado`+
      (recent.length>1?` · y ${recent.length-1} más`:"")+`</span>`;
  }else won.hidden=true;
  const list=$("#nextList");
  list.querySelectorAll("b").forEach(b=>{const v=+b.textContent;countTo(b,v)});
}

/* ═════════ rueda ═════════ */
const CX=200,CY=200,CORE=48,R0=62,R1=178,RINGS=10,GAP=2.2,AXIS=8;
const SPAN=(360-2*AXIS)/AREAS.length, STEP=(R1-R0)/RINGS;
const NS="http://www.w3.org/2000/svg";
const rad=d=>(d-90)*Math.PI/180;
const pt=(r,d)=>[CX+r*Math.cos(rad(d)),CY+r*Math.sin(rad(d))];
const a0of=i=>AXIS+i*SPAN+GAP/2, a1of=i=>AXIS+(i+1)*SPAN-GAP/2, midOf=i=>AXIS+(i+.5)*SPAN;
function arc(r0,r1,a0,a1){
  const[x1,y1]=pt(r1,a0),[x2,y2]=pt(r1,a1),[x3,y3]=pt(r0,a1),[x4,y4]=pt(r0,a0);
  return`M${x1.toFixed(2)} ${y1.toFixed(2)}A${r1} ${r1} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`+
        `L${x3.toFixed(2)} ${y3.toFixed(2)}A${r0} ${r0} 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)}Z`;
}
function openArc(r,a0,a1){
  const[x1,y1]=pt(r,a0),[x2,y2]=pt(r,a1);
  return`M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
const sv=$("#wheel"),wrap=$("#wrap"),stage=$("#stage"),readout=$("#readout");
let groups=[],rings=[],lblEls=[],coreG=null,coreNum=null,coreLbl=null,coreRing=null;
let hot=-1,zoom=-1,avgShown=0;
const sc=i=>S.areas[AREAS[i].k].score;

function scored(){return AREAS.filter(a=>S.areas[a.k].score>0)}
function avgNow(){const s=scored();return s.length?s.reduce((x,a)=>x+S.areas[a.k].score,0)/s.length:0}
function avgText(){return scored().length?avgNow().toFixed(1):"—"}

function paint(i,wave){
  const empty=cvar("--empty-op")||".055", s=sc(i);
  rings[i].forEach((el,idx)=>{
    const r=idx+1,on=r<=s;
    const apply=()=>{
      el.setAttribute("fill",on?`url(#g${i})`:"currentColor");
      el.setAttribute("fill-opacity",on?(.3+.07*r).toFixed(2):empty);
    };
    if(wave)setTimeout(apply,idx*42);else apply();
  });
}
function setAvg(){
  $("#avgChip").textContent=scored().length+" de 8";
  if(!coreNum||hot>=0)return;
  if(!scored().length){coreNum.textContent="—";return}
  const t=avgNow(),from=avgShown||t,t0=performance.now();
  (function step(now){
    const p=Math.min(1,(now-t0)/600),e=1-Math.pow(1-p,3);
    coreNum.textContent=(from+(t-from)*e).toFixed(1);
    if(p<1)requestAnimationFrame(step);else avgShown=t;
  })(t0);
}

function buildWheel(){
  sv.innerHTML="";
  const defs=document.createElementNS(NS,"defs");
  defs.innerHTML=AREAS.map((a,i)=>{const c=cvar(a.c);
    return `<linearGradient id="g${i}" x1="0" y1="1" x2="0.4" y2="0">
      <stop offset="0" stop-color="${c}" stop-opacity=".42"/><stop offset="1" stop-color="${c}" stop-opacity=".97"/></linearGradient>`}).join("")+
    `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>`;
  sv.appendChild(defs);
  groups=[];rings=[];
  const guide=cvar("--guide"),gop=cvar("--guide-op");
  AREAS.forEach((a,i)=>{
    const g=document.createElementNS(NS,"g");
    g.setAttribute("class","sector");g.dataset.i=i;
    g.style.setProperty("--gc",cvar(a.c)+"99");
    g.style.setProperty("--gd",(5.6+i*0.49).toFixed(1)+"s");
    g.style.setProperty("--gdl",(-i*0.97).toFixed(1)+"s");
    const a0=a0of(i),a1=a1of(i);
    let h="";
    for(let r=1;r<=RINGS;r++){
      h+=`<path class="ring" d="${arc(R0+(r-1)*STEP+1.4,R0+r*STEP,a0,a1)}" data-i="${i}" data-r="${r}"
        style="animation:bloom .7s ease-out ${(.3+r*.04+i*.035).toFixed(2)}s both"><title>${a.n} — ${r}</title></path>`;
    }
    for(let r=1;r<=RINGS;r++)h+=`<path d="${openArc(R0+r*STEP,a0,a1)}" fill="none" stroke="${guide}" stroke-width=".7" opacity="${gop}" pointer-events="none"/>`;
    const[lx1,ly1]=pt(R0,a0),[lx2,ly2]=pt(R1,a0),[rx1,ry1]=pt(R0,a1),[rx2,ry2]=pt(R1,a1);
    h+=`<line x1="${lx1.toFixed(1)}" y1="${ly1.toFixed(1)}" x2="${lx2.toFixed(1)}" y2="${ly2.toFixed(1)}" stroke="${guide}" stroke-width="1" opacity="${gop}" pointer-events="none"/>
      <line x1="${rx1.toFixed(1)}" y1="${ry1.toFixed(1)}" x2="${rx2.toFixed(1)}" y2="${ry2.toFixed(1)}" stroke="${guide}" stroke-width="1" opacity="${gop}" pointer-events="none"/>
      <circle cx="${lx2.toFixed(1)}" cy="${ly2.toFixed(1)}" r="2.6" fill="#fff" opacity=".85" filter="url(#soft)" pointer-events="none"/>
      <circle cx="${lx2.toFixed(1)}" cy="${ly2.toFixed(1)}" r="1.4" fill="#fff" opacity=".95" pointer-events="none"/>`;
    g.innerHTML=h;sv.appendChild(g);groups.push(g);
    rings.push(Array.prototype.slice.call(g.querySelectorAll(".ring")));
    paint(i,false);
  });
  const axis=document.createElementNS(NS,"g");axis.setAttribute("pointer-events","none");
  let ah="";
  for(let r=1;r<=RINGS;r++){const y=CY-(R0+(r-.5)*STEP);
    ah+=`<text x="${CX}" y="${(y+2.6).toFixed(1)}" text-anchor="middle" font-size="7.6" font-weight="600" fill="${cvar("--fg-faint")}" font-family="${cvar("--ui")}" opacity=".95">${r}</text>`}
  axis.innerHTML=ah;sv.appendChild(axis);
  coreG=document.createElementNS(NS,"g");coreG.style.cursor="pointer";
  coreG.innerHTML=
    `<ellipse cx="${CX}" cy="${CY+CORE*.8}" rx="${CORE*.88}" ry="${CORE*.22}" fill="rgba(16,20,36,.28)" filter="url(#soft)"/>
     <circle id="cring" cx="${CX}" cy="${CY}" r="${CORE+4}" fill="none" stroke="transparent" stroke-width="1.6" opacity="0"/>
     <circle cx="${CX}" cy="${CY}" r="${CORE}" fill="#000"/>
     <text id="cnum" x="${CX}" y="${CY+5}" text-anchor="middle" font-size="27" font-weight="200" letter-spacing="-1" fill="#fff" font-family="${cvar("--ui")}">${avgText()}</text>
     <text id="clbl" x="${CX}" y="${CY+21}" text-anchor="middle" font-size="7" font-weight="700" letter-spacing="2.4" fill="rgba(255,255,255,.55)" font-family="${cvar("--ui")}">${scored().length?"EQUILIBRIO":"TU RUEDA"}</text>`;
  sv.appendChild(coreG);
  coreNum=coreG.querySelector("#cnum");coreLbl=coreG.querySelector("#clbl");coreRing=coreG.querySelector("#cring");
  coreG.addEventListener("click",e=>{e.stopPropagation();zoom>=0?unzoom():setHot(-1)});
  sv.style.color=cvar("--fg");
  avgShown=avgNow();
}
function buildLabels(){
  wrap.querySelectorAll(".lbl").forEach(e=>e.remove());lblEls=[];
  AREAS.forEach((a,i)=>{
    const mid=midOf(i),right=Math.cos(rad(mid))>=0;
    const el=document.createElement("div");
    el.className="lbl "+(right?"right":"left");
    el.style.left=(50+Math.cos(rad(mid))*39.5)+"%";el.style.top=(50+Math.sin(rad(mid))*42)+"%";
    el.style.transform=right?"translate(0,-50%)":"translate(-100%,-50%)";
    el.dataset.i=i;
    el.innerHTML=`<div class="in"><i style="background:${cvar(a.c)};color:${cvar(a.c)};--dd:${(4.2+i*0.33).toFixed(1)}s;--ddl:${(-i*0.7).toFixed(1)}s"></i><b>${a.n}</b></div>`;
    el.addEventListener("click",ev=>{ev.stopPropagation();zoom===i?unzoom():zoomTo(i)});
    el.addEventListener("pointerenter",()=>{if(zoom<0)setHot(i)});
    wrap.appendChild(el);lblEls.push(el);
  });
}
function buildSparks(){
  stage.querySelectorAll(".spark").forEach(e=>e.remove());
  for(let i=0;i<16;i++){
    const ang=Math.random()*360,rr=33+Math.random()*20,s=document.createElement("span");
    s.className="spark";
    s.style.left=(50+Math.cos(rad(ang))*rr)+"%";s.style.top=(50+Math.sin(rad(ang))*rr)+"%";
    s.style.animationDelay=(-Math.random()*6).toFixed(2)+"s";
    s.style.animationDuration=(4.5+Math.random()*4).toFixed(1)+"s";
    const z=(1.6+Math.random()*2.6).toFixed(1)+"px";s.style.width=z;s.style.height=z;
    stage.appendChild(s);
  }
}

const phase=AREAS.map((_,i)=>i*0.83+Math.random()*0.5),lift=AREAS.map(()=>0);
let wrapW=430;const measure=()=>{wrapW=wrap.clientWidth||430};addEventListener("resize",measure);
let looping=false;
function loop(t){
  const s=t/1000,f=0.72*wrapW/400;
  groups.forEach((g,i)=>{
    lift[i]+=((hot===i?1:0)-lift[i])*0.11;
    const breath=Math.sin(s*0.55+phase[i])*7.2,swirl=Math.sin(s*0.33+phase[i]*1.6)*1.5;
    const k=1+Math.sin(s*0.48+phase[i]*0.8)*0.022+lift[i]*0.04,out=breath+lift[i]*14;
    const mid=rad(midOf(i)),dx=Math.cos(mid)*out,dy=Math.sin(mid)*out;
    g.setAttribute("transform",`translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${swirl.toFixed(2)} ${CX} ${CY}) translate(${CX} ${CY}) scale(${k.toFixed(4)}) translate(${-CX} ${-CY})`);
    const el=lblEls[i];
    if(el)el.firstElementChild.style.transform=`translate(${(dx*f).toFixed(1)}px,${(dy*f).toFixed(1)}px) scale(${(1+lift[i]*0.1).toFixed(3)})`;
  });
  if(coreG){const cs=1+Math.sin(s*0.95)*0.022+(hot>=0?0.055:0);
    coreG.setAttribute("transform",`translate(${CX} ${CY}) scale(${cs.toFixed(4)}) translate(${-CX} ${-CY})`)}
  requestAnimationFrame(loop);
}

function renderReadout(){
  if(hot<0){
    readout.innerHTML=zoom>=0
      ?'<div class="hint">Toca el centro para volver.</div><button type="button" class="back">Volver</button>'
      :(scored().length<8
        ?'<div class="hint">Toca un anillo en cada área para puntuarla del 1 al 10. Te faltan '+(8-scored().length)+'.</div>'
        :'<div class="hint">Pasa por encima para explorar. Toca un nombre para acercarte, un anillo para puntuar.</div>');
  }else{
    const a=AREAS[hot],st=S.areas[a.k];
    readout.innerHTML=`<div class="ttl" style="color:${cvar(a.c)}">${a.n} · ${st.score||"sin puntaje"}</div>`+
      `<div class="txt">${st.goal?esc(st.goal):"Sin meta todavía."}</div>`+
      (zoom>=0?'<button type="button" class="back">Volver</button>':'');
  }
  const bk=readout.querySelector(".back");if(bk)bk.addEventListener("click",unzoom);
}
function setHot(i){
  if(i===hot){renderReadout();return}
  hot=i;
  lblEls.forEach(el=>el.classList.toggle("hot",+el.dataset.i===i));
  groups.forEach((g,gi)=>g.classList.toggle("hot",gi===i));
  if(coreNum){
    if(i<0){
      coreNum.textContent=avgText();coreNum.setAttribute("fill","#fff");
      coreLbl.textContent=scored().length?"EQUILIBRIO":"TU RUEDA";coreRing.setAttribute("opacity","0");
      avgShown=avgNow();
    }else{
      const a=AREAS[i],c=cvar(a.c);tick();
      coreNum.textContent=sc(i)||"—";coreNum.setAttribute("fill",c);
      coreLbl.textContent=a.n.toUpperCase();
      coreRing.setAttribute("stroke",c);coreRing.setAttribute("opacity",".85");
    }
  }
  renderReadout();
}
function zoomTo(i){
  zoom=i;woosh();
  const mid=rad(midOf(i));
  stage.style.transformOrigin=(50+Math.cos(mid)*26)+"% "+(50+Math.sin(mid)*26)+"%";
  stage.style.transform="scale(1.85)";
  groups.forEach((g,gi)=>g.classList.toggle("dim",gi!==i));
  lblEls.forEach(el=>el.classList.add("gone"));
  hot=-1;setHot(i);
}
function unzoom(){
  zoom=-1;woosh();stage.style.transform="";
  groups.forEach(g=>g.classList.remove("dim"));lblEls.forEach(el=>el.classList.remove("gone"));
  hot=-1;setHot(-1);
}
function sectorAt(e){
  const r=sv.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2);
  const dist=Math.hypot(x,y)/(r.width/2)*200;
  if(dist<CORE*0.95||dist>R1+24)return -1;
  let d=Math.atan2(y,x)*180/Math.PI+90;d=((d%360)+360)%360;
  if(d<AXIS||d>360-AXIS)return -1;
  return Math.min(AREAS.length-1,Math.floor((d-AXIS)/SPAN));
}
wrap.addEventListener("pointermove",e=>{if(zoom<0)setHot(sectorAt(e))});
wrap.addEventListener("pointerleave",()=>{if(zoom<0)setHot(-1)});
sv.addEventListener("click",async e=>{
  const p=e.target.closest("[data-r]");if(!p)return;
  const i=+p.dataset.i,a=AREAS[i],st=S.areas[a.k],v=+p.dataset.r,prev=st.score;
  blip(v>prev);
  st.score=(prev===v?v-1:v);
  paint(i,true);
  if(coreNum&&hot===i)coreNum.textContent=st.score||"—";
  setAvg();renderReadout();
  const r=await sb.from("areas").update({score:st.score,updated_at:new Date().toISOString()}).eq("key",a.k);
  if(r.error){st.score=prev;paint(i,true);setAvg();renderReadout();fail(r.error,"guardar el puntaje")}
});
sv.addEventListener("dblclick",e=>{const i=sectorAt(e);if(i>=0)zoom===i?unzoom():zoomTo(i)});

/* ═════════ hábitos y día distinto ═════════ */
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="#1D2029" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
function today(){return S.days[TODAY]||(S.days[TODAY]={habits:{},kind:"normal",note:""})}
async function saveDay(){
  const d=today();
  const r=await sb.from("days").upsert({user_id:UID,day:TODAY,habits:d.habits,kind:d.kind,note:d.note,
    updated_at:new Date().toISOString()},{onConflict:"user_id,day"});
  if(r.error)fail(r.error,"guardar el día");
}
function renderHabits(){
  const h=$("#habits"),d=today();h.innerHTML="";
  HABITS.forEach((hb,idx)=>{
    const on=!!d.habits[hb.k];
    const b=document.createElement("button");
    b.type="button";b.className="hab";b.setAttribute("aria-pressed",on?"true":"false");
    b.style.setProperty("--h1",hb.a);b.style.setProperty("--h2",hb.b);
    b.style.animationDelay=(-idx*0.85)+"s";
    b.innerHTML=`<span class="box">${CHECK}</span><span class="txt"><b>${hb.n}</b><small>${hb.t}</small></span>`;
    b.addEventListener("click",()=>{d.habits[hb.k]=!d.habits[hb.k];blip(d.habits[hb.k]);renderHabits();renderBars();saveDay()});
    h.appendChild(b);
  });
  const db=$("#diffBtn"),dn=$("#diffNote"),isD=d.kind==="distinto";
  db.setAttribute("aria-pressed",isD?"true":"false");
  db.textContent=isD?"Día distinto ✓":"Hoy fue un día distinto";
  dn.hidden=!isD;if(document.activeElement!==dn)dn.value=d.note||"";
}
$("#diffBtn").addEventListener("click",()=>{
  const d=today();d.kind=d.kind==="distinto"?"normal":"distinto";
  blip(d.kind==="distinto");renderHabits();renderBars();saveDay();
  if(d.kind==="distinto")setTimeout(()=>$("#diffNote").focus(),50);
});
let noteT=null;
$("#diffNote").addEventListener("input",e=>{
  today().note=e.target.value;clearTimeout(noteT);noteT=setTimeout(saveDay,700);
});

function dayScore(k){const d=S.days[k];if(!d)return 0;return HABITS.filter(h=>d.habits[h.k]).length}
function renderBars(){
  let html="";
  for(let i=20;i>=0;i--){
    const k=dkey(addDays(T0,-i)),d=S.days[k],v=dayScore(k),dl=`--bd:${(-(20-i)*0.21).toFixed(2)}s`;
    if(d&&d.kind==="distinto"){
      html+=`<i class="diff" style="${dl};background:repeating-linear-gradient(45deg,#F2BC27,#F2BC27 3px,transparent 3px,transparent 6px);height:62%" title="${k} · día distinto"></i>`;
    }else if(!v){
      html+=`<i style="${dl};height:34%" title="${k}"></i>`;
    }else{
      const col=["#9ADCFF","#7FD0F5","#5CBBEE","#3FA9E8"][v-1],top=["#CFEEFF","#B4E4FD","#9ADCFF","#7FD0F5"][v-1];
      html+=`<i class="on" style="${dl};--bc:${col}66;height:${(38+v*15.5).toFixed(0)}%;background:linear-gradient(180deg,${top},${col})" title="${k} · ${v} de 4"></i>`;
    }
  }
  $("#bars").innerHTML=html;
  /* racha: días con 2+ hábitos o día distinto; hoy cuenta si ya va */
  let n=0;
  for(let i=0;i<400;i++){
    const k=dkey(addDays(T0,-i)),d=S.days[k],ok=(d&&d.kind==="distinto")||dayScore(k)>=2;
    if(ok)n++;else if(i===0)continue;else break;
  }
  $("#streakTxt").textContent=n?("racha de "+n+(n===1?" día":" días")):"empieza hoy";
}

/* ═════════ tareas ═════════ */
let newUrg=1;
function renderUrgs(){
  $("#urgs").innerHTML=URG.map((u,i)=>`<button type="button" data-u="${i}" aria-pressed="${i===newUrg}" title="${u.n}" aria-label="${u.n}"><i style="background:${u.c}"></i></button>`).join("");
}
$("#urgs").addEventListener("click",e=>{const b=e.target.closest("[data-u]");if(!b)return;newUrg=+b.dataset.u;tick();renderUrgs()});

function taskWhen(t){
  if(!t.starts_at)return{late:false,txt:"sin fecha"};
  const d=new Date(t.starts_at),day=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const late=!t.done&&day<T0;
  const hh=t.all_day?"":pad(d.getHours())+":"+pad(d.getMinutes());
  if(late)return{late:true,txt:"atrasada · "+d.getDate()+" "+MES3[d.getMonth()]};
  if(+day===+T0)return{late:false,txt:hh||"hoy"};
  return{late:false,txt:d.getDate()+" "+MES3[d.getMonth()]+(hh?" · "+hh:"")};
}
function todaysTasks(){
  const end=addDays(T0,1);
  return S.tasks.filter(t=>{
    if(!t.starts_at)return !t.done;
    const d=new Date(t.starts_at);
    return d<end&&(!t.done||d>=T0);
  }).sort((a,b)=>(a.done-b.done)||(b.urgency-a.urgency)||String(a.starts_at).localeCompare(String(b.starts_at)));
}
function renderTasks(){
  const list=todaysTasks(),ul=$("#tasks");
  const due=billsFor(NOW.getFullYear(),NOW.getMonth()).filter(x=>!x.isPaid&&x.n<=3).map(x=>billRow(x,false)).join("");
  if(!list.length&&!due){ul.innerHTML='<li class="empty-note">Nada pendiente para hoy. Agrega lo que surja.</li>';return}
  ul.innerHTML=due+list.map(t=>{
    const w=taskWhen(t),u=URG[t.urgency]||URG[1];
    return `<li class="task${t.done?" done":""}${w.late?" late":""}" data-id="${t.id}">
      <button type="button" class="chk" aria-label="${t.done?"Desmarcar":"Marcar hecha"}"><svg viewBox="0 0 24 24" fill="none" stroke="var(--bg)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></button>
      <span class="t"><b>${esc(t.title)}</b><small><i style="background:${u.c}"></i>${w.txt} · ${u.n}</small></span>
      <button type="button" class="x" aria-label="Borrar">×</button></li>`;
  }).join("");
}
$("#tasks").addEventListener("click",async e=>{
  if(onBillClick(e))return;
  const li=e.target.closest(".task");if(!li)return;
  const t=S.tasks.find(x=>x.id===li.dataset.id);if(!t)return;
  if(e.target.closest(".chk")){
    t.done=!t.done;blip(t.done);renderTasks();
    const r=await sb.from("tasks").update({done:t.done}).eq("id",t.id);
    if(r.error){t.done=!t.done;renderTasks();fail(r.error,"actualizar la tarea")}
  }else if(e.target.closest(".x")){
    const idx=S.tasks.indexOf(t);S.tasks.splice(idx,1);tone(500,300,.04,.18);renderTasks();
    const r=await sb.from("tasks").delete().eq("id",t.id);
    if(r.error){S.tasks.splice(idx,0,t);renderTasks();fail(r.error,"borrar la tarea")}
  }
});
$("#addForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const title=$("#newTask").value.trim();if(!title)return;
  const tm=$("#newTime").value;
  const when=new Date(T0);
  if(tm){const[h,m]=tm.split(":");when.setHours(+h,+m,0,0)}else when.setHours(12,0,0,0);
  const row={user_id:UID,title,starts_at:when.toISOString(),all_day:!tm,urgency:newUrg};
  $("#newTask").value="";$("#newTime").value="";
  const r=await sb.from("tasks").insert(row).select("id,title,starts_at,all_day,urgency,done").single();
  if(r.error){$("#newTask").value=title;fail(r.error,"agregar la tarea");return}
  S.tasks.push(r.data);blip(true);renderTasks();
});

/* ═════════ Telegram ═════════ */
let tgPoll=null;
function renderTg(){
  const b=$("#tgBtn");
  b.textContent=S.tg?"Telegram conectado ✓":"conectar Telegram";
  b.classList.toggle("on",!!S.tg);
}
function closeTg(){$("#tgModal").hidden=true;clearInterval(tgPoll);tgPoll=null}
$("#tgBtn").addEventListener("click",async()=>{
  if(S.tg){toast("Ya está conectado. Escríbele /ayuda al bot.");return}
  const n=new Uint32Array(1);crypto.getRandomValues(n);
  const code=String(100000+n[0]%900000);
  S.prefs.tg_code=code;S.prefs.tg_code_exp=Date.now()+15*60*1000;
  try{await savePrefs()}catch(e){fail(e,"crear el código");return}
  $("#tgCode").textContent=code;$("#tgModal").hidden=false;tick();
  const t0=Date.now();
  clearInterval(tgPoll);
  tgPoll=setInterval(async()=>{
    if(Date.now()-t0>15*60*1000){$("#tgWait").textContent="El código venció. Cierra y pide otro.";clearInterval(tgPoll);return}
    const r=await sb.from("settings").select("telegram_chat_id,prefs").maybeSingle();
    if(r.data&&r.data.telegram_chat_id){
      S.tg=true;S.prefs=r.data.prefs||{};
      closeTg();renderTg();blip(true);toast("Telegram conectado ✨");
    }
  },3500);
});
$("#tgCopy").addEventListener("click",async()=>{
  const c=$("#tgCode").textContent;
  try{await navigator.clipboard.writeText(c);toast("Código copiado")}
  catch(_){const r=document.createRange();r.selectNodeContents($("#tgCode"));const sel=getSelection();sel.removeAllRanges();sel.addRange(r)}
});
$("#tgClose").addEventListener("click",closeTg);
$("#tgModal").addEventListener("click",e=>{if(e.target.id==="tgModal")closeTg()});

/* ═════════ navegación ═════════ */
const VIEWS=["hoy","vida","suenos","agenda","capital"];
let curView=null,navTok=0;
function route(){
  let v=location.hash.slice(1);if(VIEWS.indexOf(v)<0)v="hoy";
  const i=VIEWS.indexOf(v),prev=curView,pi=prev?VIEWS.indexOf(prev):i,tok=++navTok;
  document.querySelectorAll(".nav button").forEach(b=>{
    if(b.dataset.v===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  $("#pill").style.setProperty("--i",i);
  const swap=()=>{VIEWS.forEach(x=>{const el=$("#v-"+x);el.hidden=x!==v;el.classList.remove("leave")});try{scrollTo(0,0)}catch(_){};enterView(v)};
  curView=v;
  if(prev&&prev!==v&&!reduce){
    document.documentElement.style.setProperty("--dir",i>pi?1:-1);
    $("#v-"+prev).classList.add("leave");
    setTimeout(()=>{
      if(tok!==navTok)return;
      swap();const el=$("#v-"+v);el.classList.add("enter");
      setTimeout(()=>{if(tok===navTok)el.classList.remove("enter")},1100);
    },200);
  }else swap();
}
document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>{tick();location.hash=b.dataset.v}));
addEventListener("hashchange",route);

/* ═════════ parallax ═════════ */
const ph=$("#ph"),blobs=document.querySelectorAll(".blob");
let ticking=false;
addEventListener("scroll",()=>{
  if(ticking)return;ticking=true;
  requestAnimationFrame(()=>{const y=scrollY;
    ph.style.transform=`translateY(${(y*.1).toFixed(1)}px)`;

    blobs.forEach((b,i)=>{b.style.marginTop=(-y*(0.035+i*0.013)).toFixed(1)+"px"});
    ticking=false});
},{passive:true});

/* ═════════ tema manual ═════════ */
$("#theme").addEventListener("click",()=>{
  const dark=document.documentElement.getAttribute("data-theme")==="dark";
  try{localStorage.setItem("ruta-theme",dark?"light":"dark")}catch(_){}
  applyTheme();blip(!dark);
  const z=zoom;buildWheel();buildLabels();hot=-1;zoom=-1;
  if(z>=0)zoomTo(z);else setHot(-1);
});

/* ═════════ utilidades de secciones ═════════ */
const TCHK='<svg viewBox="0 0 24 24" fill="none" stroke="var(--bg)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const fmtMoney=(n,cur)=>(cur==="USD"?"US$":"$")+Math.round(+n||0).toLocaleString("es-CL");
function shortMoney(n){
  n=+n||0;
  if(n>=1e6)return (n/1e6).toFixed(n>=1e7?0:1).replace(".",",")+" M";
  if(n>=1e3)return Math.round(n/1e3)+" mil";
  return String(Math.round(n));
}
const areaOf=k=>AREAS.find(a=>a.k===k);
const areaOpts=()=>[["","— ninguna —"]].concat(AREAS.map(a=>[a.k,a.n]));
const uid6=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function dayLabel(k){
  const n=daysTo(k);
  if(n===0)return"Hoy";if(n===-1)return"Ayer";if(n===1)return"Mañana";
  const d=parseD(k);
  return DIAS[d.getDay()].slice(0,3)+" "+d.getDate()+" "+MES3[d.getMonth()]+(d.getFullYear()!==NOW.getFullYear()?" "+d.getFullYear():"");
}
function longDay(k){
  const d=parseD(k),s=DIAS[d.getDay()]+" "+d.getDate()+" de "+MESES[d.getMonth()];
  return s[0].toUpperCase()+s.slice(1);
}
function hydrate(root){
  root.querySelectorAll("[data-photo]").forEach(async el=>{
    const p=el.dataset.photo;if(!p)return;
    const u=await photoUrl(p);
    if(u&&el.dataset.photo===p)el.style.backgroundImage='url("'+u+'")';
  });
}
async function run(query,what){
  const r=await query;
  if(r.error){fail(r.error,what);throw r.error}
  return r.data;
}
const LOADED={};
async function need(){
  const names=Array.prototype.slice.call(arguments).filter(n=>!LOADED[n]);
  await Promise.all(names.map(async n=>{
    let r;
    if(n==="journal")r=await sb.from("journal").select("*").order("created_at",{ascending:false}).limit(80);
    else if(n==="people")r=await sb.from("people").select("*").order("name");
    else if(n==="memories")r=await sb.from("memories").select("*").order("day",{ascending:false}).limit(150);
    else if(n==="money")r=await sb.from("money").select("*").order("day",{ascending:false}).limit(1000);
    else if(n==="jobs")r=await sb.from("jobs").select("*").order("day",{ascending:false}).limit(300);
    if(r.error)throw r.error;
    S[n]=r.data||[];LOADED[n]=true;
  }));
}

/* ═════════ hoja de edición ═════════ */
let sheetCtx=null,delArmed=false;
function openSheet(o){
  sheetCtx=o;delArmed=false;
  $("#sheetTitle").textContent=o.title;
  const box=$("#sheetFields");box.innerHTML="";
  o.fields.forEach(f=>{
    const id="f-"+f.k,w=document.createElement("label");
    w.className="fld";w.htmlFor=id;
    let ctl;
    if(f.type==="textarea")ctl=`<textarea class="inp" id="${id}" rows="3">${esc(f.value||"")}</textarea>`;
    else if(f.type==="select")ctl=`<select class="inp" id="${id}">`+f.options.map(op=>
      `<option value="${esc(op[0])}"${String(f.value==null?"":f.value)===String(op[0])?" selected":""}>${esc(op[1])}</option>`).join("")+`</select>`;
    else if(f.type==="photo")ctl=`<button type="button" class="photo-pick" id="${id}" data-photo="${esc(f.value||"")}"><span>${f.value?"Cambiar foto":"Elegir foto"}</span></button>`;
    else if(f.type==="range")ctl=`<input type="range" min="0" max="10" step="1" id="${id}" value="${+f.value||0}"><output>${+f.value||0}</output>`;
    else ctl=`<input class="inp" type="${f.type||"text"}" id="${id}" value="${esc(f.value==null?"":f.value)}"`+
      (f.ph?` placeholder="${esc(f.ph)}"`:"")+(f.type==="number"?` inputmode="decimal" step="any" min="${f.min==null?0:f.min}"`+(f.max?` max="${f.max}"`:""):"")+
      (f.type==="text"||!f.type?' maxlength="160"':"")+`>`;
    w.innerHTML=`<span>${esc(f.label)}</span>${ctl}`;
    box.appendChild(w);
  });
  hydrate(box);
  box.querySelectorAll(".photo-pick").forEach(b=>b.addEventListener("click",async e=>{
    e.preventDefault();
    const f=await pickFile();if(!f)return;
    b._file=f;b.style.backgroundImage='url("'+URL.createObjectURL(f)+'")';
    b.firstElementChild.textContent="Cambiar foto";
  }));
  box.querySelectorAll("input[type=range]").forEach(r=>r.addEventListener("input",()=>{r.nextElementSibling.textContent=r.value}));
  const del=$("#sheetDel");del.hidden=!o.onDelete;del.textContent="Eliminar";
  $("#sheetSave").disabled=false;$("#sheetSave").textContent="Guardar";
  $("#sheet").hidden=false;tick();
  const first=box.querySelector("input.inp,textarea");
  if(first&&!o.noFocus&&innerWidth>700)setTimeout(()=>first.focus(),60);
}
function closeSheet(){$("#sheet").hidden=true;sheetCtx=null}
$("#sheetCancel").addEventListener("click",closeSheet);
$("#sheet").addEventListener("click",e=>{if(e.target.id==="sheet")closeSheet()});
$("#sheetDel").addEventListener("click",async()=>{
  if(!sheetCtx||!sheetCtx.onDelete)return;
  if(!delArmed){delArmed=true;$("#sheetDel").textContent="¿Seguro? Toca de nuevo";return}
  const o=sheetCtx;
  try{await o.onDelete();tone(500,300,.04,.18);closeSheet()}catch(_){}
});
$("#sheetForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const o=sheetCtx;if(!o)return;
  const btn=$("#sheetSave");btn.disabled=true;btn.textContent="Guardando…";
  try{
    const v={};
    for(const f of o.fields){
      const el=$("#f-"+f.k);
      if(f.type==="photo")v[f.k]=el._file?await uploadPhoto(el._file,f.slot||"foto",1600):(f.value||"");
      else if(f.type==="number")v[f.k]=el.value===""?null:+el.value;
      else if(f.type==="range")v[f.k]=+el.value;
      else v[f.k]=el.value.trim();
    }
    await o.onSave(v);
    blip(true);closeSheet();
  }catch(err){
    if(err&&err.user)toast(err.user);
    else if(!(err&&err.code))console.error(err);
    btn.disabled=false;btn.textContent="Guardar";
  }
});

/* ═════════ VIDA ═════════ */
function birthdayIn(b){
  if(!b)return null;
  const d=parseD(b);
  let n=new Date(T0.getFullYear(),d.getMonth(),d.getDate());
  if(n<T0)n=new Date(T0.getFullYear()+1,d.getMonth(),d.getDate());
  return Math.round((n-T0)/864e5);
}
function weekSignal(k){
  const last7=[0,1,2,3,4,5,6].map(i=>dkey(addDays(T0,-i)));
  const cnt=h=>last7.filter(d=>S.days[d]&&S.days[d].habits[h]).length;
  const ym=TODAY.slice(0,7);
  if(k==="perros")return"Paseo largo: "+cnt("paseo")+" de 7 días";
  if(k==="proyectos")return"Bloque del canal: "+cnt("bloque")+" de 7 días";
  if(k==="aprendizaje")return"Formación: "+cnt("formacion")+" de 7 días";
  if(k==="cuerpo")return"Ejercicio: "+cnt("ejercicio")+" de 7 días";
  if(k==="oficio"){
    const j=S.jobs.filter(x=>String(x.day).slice(0,7)===ym).length;
    return j?j+(j===1?" pega":" pegas")+" este mes":"Sin pegas anotadas este mes";
  }
  if(k==="plata"){
    const a=S.money.filter(m=>m.kind==="ahorro"&&(m.currency||"CLP")==="CLP"&&String(m.day).slice(0,7)===ym).reduce((x,m)=>x+ +m.amount,0);
    return a?"Ahorro del mes: "+fmtMoney(a,"CLP"):"Sin ahorro anotado este mes";
  }
  if(k==="vinculos"){
    const nx=S.people.map(p=>({p,n:birthdayIn(p.birthday)})).filter(x=>x.n!=null&&x.n<=30).sort((a,b)=>a.n-b.n)[0];
    if(nx)return"Cumpleaños de "+nx.p.name+(nx.n===0?": hoy":" en "+nx.n+(nx.n===1?" día":" días"));
    return S.people.length?S.people.length+(S.people.length===1?" persona":" personas")+" en tu gente":"Agrega a tu gente más abajo";
  }
  if(k==="presto"){
    const g=S.goals.filter(x=>x.area==="presto"),d=g.filter(x=>x.done).length;
    return g.length?d+" de "+g.length+" metas de Presto cumplidas":"Sin metas de Presto todavía";
  }
  return"";
}
function renderAreas(){
  const box=$("#areasGrid");
  box.innerHTML=AREAS.map(a=>{
    const st=S.areas[a.k];
    return `<button type="button" class="area-card" data-k="${a.k}" style="--ac:${cvar(a.c)}">`+
      `<span class="aph" data-photo="${esc(st.photo||"")}"></span>`+
      `<span class="atop"><i></i><b>${a.n}</b><em>${st.score||"—"}</em></span>`+
      `<span class="abar"><i style="width:${st.score*10}%"></i></span>`+
      `<span class="agoal">${st.goal?esc(st.goal):"Sin meta todavía"}</span>`+
      `<span class="asig">${esc(weekSignal(a.k))}</span></button>`;
  }).join("");
  hydrate(box);
}
$("#areasGrid").addEventListener("click",e=>{
  const c=e.target.closest(".area-card");if(!c)return;
  const k=c.dataset.k,a=areaOf(k),st=S.areas[k];
  openSheet({title:a.n,noFocus:true,fields:[
    {k:"score",label:"¿Cómo está? (0 a 10)",type:"range",value:st.score},
    {k:"goal",label:"Meta de esta área",value:st.goal},
    {k:"note",label:"Nota",type:"textarea",value:st.note},
    {k:"photo",label:"Foto",type:"photo",value:st.photo,slot:"area"}],
   onSave:async v=>{
     await run(sb.from("areas").update({score:v.score,goal:v.goal,note:v.note,photo:v.photo||"",updated_at:new Date().toISOString()}).eq("key",k),"guardar el área");
     if(st.photo&&st.photo!==v.photo)dropPhoto(st.photo);
     Object.assign(st,{score:v.score,goal:v.goal,note:v.note,photo:v.photo||""});
     const i=AREAS.indexOf(a);
     if(rings[i]){paint(i,false);setAvg();if(hot<0&&coreNum){coreNum.textContent=avgText();coreLbl.textContent=scored().length?"EQUILIBRIO":"TU RUEDA"}renderReadout()}
     renderAreas();
   }});
});

/* diario */
function renderJournal(){
  const by={};
  S.journal.forEach(j=>{(by[j.day]=by[j.day]||[]).push(j)});
  const days=Object.keys(by).sort().reverse();
  $("#jList").innerHTML=days.length?days.map(d=>`<div class="jday"><h3>${dayLabel(d)}</h3>`+by[d].map(j=>{
    const t=new Date(j.created_at);
    return `<div class="jent" data-id="${j.id}"><time>${pad(t.getHours())}:${pad(t.getMinutes())}</time><p>${esc(j.body)}</p>`+
      (j.source==="telegram"?'<i title="Escrito desde Telegram">tg</i>':"")+
      `<button type="button" class="x" aria-label="Borrar entrada">×</button></div>`;
  }).join("")+`</div>`).join(""):'<p class="empty-note">Todavía no hay entradas. Escribe acá, o mándale una nota al bot.</p>';
}
$("#jForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const el=$("#jText"),body=el.value.trim();if(!body)return;
  el.value="";
  try{
    const d=await run(sb.from("journal").insert({user_id:UID,day:TODAY,body}).select("*").single(),"guardar la entrada");
    S.journal.unshift(d);blip(true);renderJournal();
  }catch(_){el.value=body}
});
$("#jText").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))$("#jForm").requestSubmit()});
$("#jList").addEventListener("click",async e=>{
  if(!e.target.closest(".x"))return;
  const row=e.target.closest(".jent"),i=S.journal.findIndex(j=>j.id===row.dataset.id);if(i<0)return;
  const j=S.journal.splice(i,1)[0];tone(500,300,.04,.18);renderJournal();
  try{await run(sb.from("journal").delete().eq("id",j.id),"borrar la entrada")}catch(_){S.journal.splice(i,0,j);renderJournal()}
});

/* gente */
function renderPeople(){
  const box=$("#people");
  box.innerHTML=S.people.length?S.people.map(p=>{
    const n=birthdayIn(p.birthday);
    const sub=n==null?(p.relation||""):n===0?"¡cumple hoy!":n<=30?"cumple en "+n+(n===1?" día":" días"):(p.relation||"");
    return `<button type="button" class="person${n!=null&&n<=7?" near":""}" data-id="${p.id}">`+
      `<span class="av" data-photo="${esc(p.photo||"")}">${esc((p.name||"?")[0].toUpperCase())}</span>`+
      `<b>${esc(p.name)}</b><small>${esc(sub)}</small></button>`;
  }).join(""):'<p class="empty-note">Agrega a las personas que importan: cumpleaños, una nota, su foto.</p>';
  hydrate(box);
}
function personSheet(p){
  const isNew=!p;
  openSheet({title:isNew?"Nueva persona":p.name,fields:[
    {k:"name",label:"Nombre",value:p?p.name:""},
    {k:"relation",label:"Quién es",value:p?p.relation:"",ph:"mi abuela, mi hermano, amiga…"},
    {k:"birthday",label:"Cumpleaños",type:"date",value:p?p.birthday||"":""},
    {k:"note",label:"Nota",type:"textarea",value:p?p.note||"":""},
    {k:"photo",label:"Foto",type:"photo",value:p?p.photo||"":"",slot:"persona"}],
   onSave:async v=>{
     if(!v.name)throw{user:"Ponle un nombre"};
     const row={name:v.name,relation:v.relation,birthday:v.birthday||null,note:v.note,photo:v.photo||""};
     if(isNew){S.people.push(await run(sb.from("people").insert(Object.assign({user_id:UID},row)).select("*").single(),"guardar la persona"))}
     else{
       await run(sb.from("people").update(row).eq("id",p.id),"guardar la persona");
       if(p.photo&&p.photo!==row.photo)dropPhoto(p.photo);Object.assign(p,row);
     }
     S.people.sort((a,b)=>a.name.localeCompare(b.name));
     renderPeople();renderMems();renderAreas();
   },
   onDelete:isNew?null:async()=>{
     await run(sb.from("people").delete().eq("id",p.id),"eliminar la persona");
     S.people=S.people.filter(x=>x.id!==p.id);S.memories.forEach(m=>{if(m.person_id===p.id)m.person_id=null});
     if(p.photo)dropPhoto(p.photo);renderPeople();renderMems();renderAreas();
   }});
}
$("#addPerson").addEventListener("click",()=>personSheet(null));
$("#people").addEventListener("click",e=>{
  const b=e.target.closest(".person");if(!b)return;
  const p=S.people.find(x=>x.id===b.dataset.id);if(p)personSheet(p);
});

/* recuerdos */
let memF=null;
function renderMems(){
  const ppl=S.people.filter(p=>S.memories.some(m=>m.person_id===p.id));
  const ars=AREAS.filter(a=>S.memories.some(m=>m.area===a.k));
  const chip=(v,t)=>`<button type="button" class="chipf" data-f="${esc(v)}" aria-pressed="${(memF||"")===v}">${esc(t)}</button>`;
  $("#memFilter").innerHTML=(ppl.length+ars.length)?chip("","Todos")+ppl.map(p=>chip("p:"+p.id,p.name)).join("")+ars.map(a=>chip("a:"+a.k,a.n)).join(""):"";
  let list=S.memories;
  if(memF){
    const t=memF.slice(0,1),v=memF.slice(2);
    list=list.filter(m=>t==="p"?m.person_id===v:m.area===v);
    if(!list.length){memF=null;return renderMems()}
  }
  const box=$("#mems");
  box.innerHTML=list.length?list.map(m=>{
    const p=S.people.find(x=>x.id===m.person_id);
    return `<button type="button" class="mem" data-id="${m.id}"><span class="mph" data-photo="${esc(m.photo||"")}"></span>`+
      `<span class="cap"><b>${esc(m.title||"Sin título")}</b><small>${dayLabel(m.day)}${p?" · "+esc(p.name):""}</small></span></button>`;
  }).join(""):'<p class="empty-note" style="grid-column:1/-1">Guarda acá los momentos que quieres volver a mirar.</p>';
  hydrate(box);
}
function memSheet(m){
  const isNew=!m;
  openSheet({title:isNew?"Nuevo recuerdo":"Recuerdo",noFocus:true,fields:[
    {k:"photo",label:"Foto",type:"photo",value:m?m.photo||"":"",slot:"recuerdo"},
    {k:"title",label:"Título",value:m?m.title:""},
    {k:"body",label:"Qué pasó",type:"textarea",value:m?m.body:""},
    {k:"day",label:"Fecha",type:"date",value:m?m.day:TODAY},
    {k:"person_id",label:"Con quién",type:"select",options:[["","— nadie en particular —"]].concat(S.people.map(p=>[p.id,p.name])),value:m?m.person_id||"":""},
    {k:"area",label:"Área",type:"select",options:areaOpts(),value:m?m.area||"":""}],
   onSave:async v=>{
     if(!v.title&&!v.photo)throw{user:"Ponle una foto o un título"};
     const row={photo:v.photo||"",title:v.title,body:v.body,day:v.day||TODAY,person_id:v.person_id||null,area:v.area||null};
     if(isNew){S.memories.push(await run(sb.from("memories").insert(Object.assign({user_id:UID},row)).select("*").single(),"guardar el recuerdo"))}
     else{
       await run(sb.from("memories").update(row).eq("id",m.id),"guardar el recuerdo");
       if(m.photo&&m.photo!==row.photo)dropPhoto(m.photo);Object.assign(m,row);
     }
     S.memories.sort((a,b)=>String(b.day).localeCompare(String(a.day)));
     renderMems();
   },
   onDelete:isNew?null:async()=>{
     await run(sb.from("memories").delete().eq("id",m.id),"eliminar el recuerdo");
     S.memories=S.memories.filter(x=>x.id!==m.id);if(m.photo)dropPhoto(m.photo);renderMems();
   }});
}
$("#addMem").addEventListener("click",()=>memSheet(null));
$("#mems").addEventListener("click",e=>{
  const b=e.target.closest(".mem");if(!b)return;
  const m=S.memories.find(x=>x.id===b.dataset.id);if(m)memSheet(m);
});
$("#memFilter").addEventListener("click",e=>{
  const b=e.target.closest(".chipf");if(!b)return;
  memF=b.dataset.f||null;tick();renderMems();
});

/* ═════════ SUEÑOS ═════════ */
function goalSheet(g){
  const isNew=!g;
  openSheet({title:isNew?"Nuevo sueño":"Editar sueño",fields:[
    {k:"title",label:"¿Qué quieres lograr?",value:g?g.title:""},
    {k:"area",label:"Área",type:"select",options:areaOpts(),value:g?g.area||"":""},
    {k:"due",label:"Fecha (opcional)",type:"date",value:g?g.due||"":""},
    {k:"photo",label:"Foto",type:"photo",value:g?g.photo||"":"",slot:"meta"}],
   onSave:async v=>{
     if(!v.title)throw{user:"Ponle un nombre"};
     const row={title:v.title,area:v.area||null,due:v.due||null,photo:v.photo||""};
     if(isNew){S.goals.push(await run(sb.from("goals").insert(Object.assign({user_id:UID,kind:"macro"},row)).select("*").single(),"crear el sueño"))}
     else{
       await run(sb.from("goals").update(row).eq("id",g.id),"guardar el sueño");
       if(g.photo&&g.photo!==row.photo)dropPhoto(g.photo);Object.assign(g,row);
     }
     renderDreams();renderNext();
   },
   onDelete:isNew?null:async()=>{
     await run(sb.from("goals").delete().eq("id",g.id),"eliminar el sueño");
     S.goals=S.goals.filter(x=>x.id!==g.id&&x.parent_id!==g.id);
     if(g.photo)dropPhoto(g.photo);renderDreams();renderNext();
   }});
}
function doneRows(){
  const done=S.goals.filter(g=>g.kind==="macro"&&g.done).sort((a,b)=>String(b.done_at||"").localeCompare(String(a.done_at||"")));
  return done.map(g=>{
    const d=g.done_at?new Date(g.done_at):null;
    return `<li data-id="${g.id}"><i>✓</i><b>${esc(g.title)}</b><small>${d?d.getDate()+" "+MES3[d.getMonth()]+" "+d.getFullYear():""}</small>`+
      `<button type="button" class="link" data-act="reopen">reabrir</button></li>`;
  }).join("");
}
function renderDreams(){
  const macros=S.goals.filter(g=>g.kind==="macro"&&!g.done)
    .sort((a,b)=>((b.pinned?1:0)-(a.pinned?1:0))||String(a.due||"9").localeCompare(String(b.due||"9")));
  const box=$("#dreams");
  box.innerHTML=macros.length?macros.map(g=>{
    const a=areaOf(g.area),col=cvar(a?a.c:"--c-aprendizaje");
    const steps=S.goals.filter(x=>x.parent_id===g.id),dn=steps.filter(x=>x.done).length;
    const n=g.due?daysTo(g.due):null;
    const sub=[g.due?fmtDue(g.due)+" "+parseD(g.due).getFullYear():"Sin fecha",a?a.n:null].filter(Boolean).join(" · ");
    return `<article class="glass dream" data-id="${g.id}" style="--ac:${col}">
      <div class="dream-ph" data-photo="${esc(g.photo||"")}"><div class="veil"></div>
        <button type="button" class="pin${g.pinned?" on":""}" data-act="pin" aria-label="${g.pinned?"Quitar de la portada":"Fijar en la portada de Hoy"}" title="Fijar en la portada de Hoy">★</button>
        <div class="cap"><b>${esc(g.title)}</b><span>${esc(sub)}</span></div>
        ${n==null?"":`<div class="big">${n<0?"—":n}<small>${n<0?"ya pasó":n===1?"día":"días"}</small></div>`}
      </div>
      <div class="dream-body">
        <div class="prog"><i style="width:${steps.length?dn/steps.length*100:0}%"></i></div>
        <small>${steps.length?dn+" de "+steps.length+(steps.length===1?" paso":" pasos"):"Divídelo en pasos chicos"}</small>
        <ul class="steps">${steps.map(s=>`<li class="task${s.done?" done":""}" data-step="${s.id}"><button type="button" class="chk" aria-label="${s.done?"Desmarcar":"Marcar hecho"}">${TCHK}</button><span class="t"><b>${esc(s.title)}</b></span><button type="button" class="x" aria-label="Borrar paso">×</button></li>`).join("")}</ul>
        <form class="add step-add"><input class="inp" type="text" placeholder="Agregar un paso" maxlength="140" aria-label="Nuevo paso"><button class="btn" type="submit" aria-label="Agregar paso">+</button></form>
        <div class="dream-actions"><button type="button" class="link" data-act="edit">Editar</button><button type="button" class="link" data-act="done">Marcar logrado ✓</button></div>
      </div></article>`;
  }).join(""):'<section class="glass empty-card"><b>Sin sueños abiertos</b><p>Crea el próximo con el botón de arriba.</p></section>';
  hydrate(box);
  const rows=doneRows();
  $("#doneCard").hidden=!rows;$("#doneList").innerHTML=rows;
}
$("#addGoal").addEventListener("click",()=>goalSheet(null));
$("#dreams").addEventListener("click",async e=>{
  const art=e.target.closest(".dream");if(!art)return;
  const g=S.goals.find(x=>x.id===art.dataset.id);if(!g)return;
  const stepEl=e.target.closest("[data-step]");
  if(stepEl){
    const s=S.goals.find(x=>x.id===stepEl.dataset.step);if(!s)return;
    if(e.target.closest(".chk")){
      s.done=!s.done;blip(s.done);renderDreams();
      try{await run(sb.from("goals").update({done:s.done,done_at:s.done?new Date().toISOString():null}).eq("id",s.id),"actualizar el paso")}
      catch(_){s.done=!s.done;renderDreams()}
    }else if(e.target.closest(".x")){
      S.goals=S.goals.filter(x=>x!==s);tone(500,300,.04,.18);renderDreams();
      try{await run(sb.from("goals").delete().eq("id",s.id),"borrar el paso")}catch(_){S.goals.push(s);renderDreams()}
    }
    return;
  }
  const act=(e.target.closest("[data-act]")||{dataset:{}}).dataset.act;
  if(act==="edit")goalSheet(g);
  else if(act==="pin"){
    g.pinned=!g.pinned;tick();renderDreams();renderNext();
    try{await run(sb.from("goals").update({pinned:g.pinned}).eq("id",g.id),"fijar el sueño")}catch(_){g.pinned=!g.pinned;renderDreams();renderNext()}
  }else if(act==="done"){
    g.done=true;g.done_at=new Date().toISOString();blip(true);toast("Logrado ✨ "+g.title);renderDreams();renderNext();
    try{await run(sb.from("goals").update({done:true,done_at:g.done_at}).eq("id",g.id),"marcar como logrado")}
    catch(_){g.done=false;g.done_at=null;renderDreams();renderNext()}
  }
});
$("#dreams").addEventListener("submit",async e=>{
  const f=e.target.closest(".step-add");if(!f)return;
  e.preventDefault();
  const art=f.closest(".dream"),g=S.goals.find(x=>x.id===art.dataset.id),inp=f.querySelector("input"),title=inp.value.trim();
  if(!g||!title)return;
  inp.value="";
  try{
    S.goals.push(await run(sb.from("goals").insert({user_id:UID,kind:"micro",parent_id:g.id,area:g.area,title}).select("*").single(),"agregar el paso"));
    blip(true);renderDreams();
    const again=document.querySelector('.dream[data-id="'+g.id+'"] .step-add input');if(again&&innerWidth>700)again.focus();
  }catch(_){inp.value=title}
});
async function reopenGoal(id){
  const g=S.goals.find(x=>x.id===id);if(!g)return;
  g.done=false;g.done_at=null;tick();renderDreams();renderNext();renderCapital();
  try{await run(sb.from("goals").update({done:false,done_at:null}).eq("id",id),"reabrir")}catch(_){}
}
$("#doneList").addEventListener("click",e=>{const b=e.target.closest('[data-act="reopen"]');if(b)reopenGoal(b.closest("li").dataset.id)});

$("#nextList").addEventListener("click",e=>{
  const li=e.target.closest("[data-goal]");if(!li)return;
  const g=S.goals.find(x=>x.id===li.dataset.goal);if(g)goalSheet(g);
});
document.querySelector(".next-photo .cap").addEventListener("click",()=>{if(heroGoal)goalSheet(heroGoal)});

/* ═════════ AGENDA ═════════ */
let calY=NOW.getFullYear(),calM=NOW.getMonth(),calSel=TODAY,calTasks=[],dayUrg=1;
const ymOf=(y,m)=>y+"-"+pad(m+1);
function billsFor(y,m){
  const dim=new Date(y,m+1,0).getDate(),ym=ymOf(y,m),paid=(S.prefs.paid&&S.prefs.paid[ym])||[];
  return (S.prefs.bills||[]).map(b=>{
    const d=Math.min(+b.day||1,dim),key=ym+"-"+pad(d),n=daysTo(key),isPaid=paid.indexOf(b.id)>=0;
    let st,txt;
    if(isPaid){st="paid";txt="pagado"}
    else if(n<0){st="late";txt="atrasado "+(-n)+(n===-1?" día":" días")}
    else if(n===0){st="hot";txt="vence hoy"}
    else if(n===1){st="hot";txt="vence mañana"}
    else if(n<=3){st="warm";txt="en "+n+" días"}
    else if(n<=7){st="soon";txt="en "+n+" días"}
    else{st="far";txt="en "+n+" días"}
    return{b,key,d,n,st,txt,ym,isPaid};
  }).sort((p,q)=>p.d-q.d);
}
function billRow(x,edit){
  return `<li class="task${x.isPaid?" done":""}" data-bill="${esc(x.b.id)}" data-ym="${x.ym}">`+
    `<button type="button" class="chk" aria-label="${x.isPaid?"Marcar como no pagado":"Marcar como pagado"}">${TCHK}</button>`+
    `<span class="t"><b>${esc(x.b.name)}</b><small>día ${x.d} · fijo del mes</small></span>`+
    `<span class="pill ${x.st}">${x.txt}</span>`+
    (edit?`<button type="button" class="link" data-act="edit">editar</button>`:"")+`</li>`;
}
async function toggleBill(id,ym){
  const p=S.prefs.paid=S.prefs.paid||{},arr=p[ym]=p[ym]||[],i=arr.indexOf(id);
  if(i>=0)arr.splice(i,1);else arr.push(id);
  Object.keys(p).sort().slice(0,-18).forEach(k=>delete p[k]);
  blip(i<0);renderBills();renderCal();renderDay();renderTasks();
  try{await savePrefs()}catch(e){fail(e,"guardar el pago")}
}
function billSheet(b){
  const isNew=!b;
  openSheet({title:isNew?"Nuevo fijo del mes":"Fijo del mes",fields:[
    {k:"name",label:"Qué es",value:b?b.name:"",ph:"Arriendo, cuota del auto, luz…"},
    {k:"day",label:"Día del mes en que vence",type:"number",value:b?b.day:"",min:1,max:31}],
   onSave:async v=>{
     if(!v.name)throw{user:"Ponle un nombre"};
     const day=Math.round(v.day||0);
     if(!(day>=1&&day<=31))throw{user:"El día va del 1 al 31"};
     const list=S.prefs.bills=S.prefs.bills||[];
     if(isNew)list.push({id:uid6(),name:v.name,day});else{b.name=v.name;b.day=day}
     try{await savePrefs()}catch(e){fail(e,"guardar el fijo");throw e}
     renderBills();renderCal();renderDay();renderTasks();
   },
   onDelete:isNew?null:async()=>{
     S.prefs.bills=(S.prefs.bills||[]).filter(x=>x!==b);
     try{await savePrefs()}catch(e){fail(e,"eliminar el fijo");throw e}
     renderBills();renderCal();renderDay();renderTasks();
   }});
}
function renderBills(){
  const list=billsFor(calY,calM);
  $("#bills").innerHTML=list.length?list.map(x=>billRow(x,true)).join("")
    :'<li class="empty-note">Agrega lo que pagas todos los meses. Cambian de color a medida que se acerca el día.</li>';
}
function onBillClick(e){
  const row=e.target.closest("[data-bill]");if(!row)return false;
  if(e.target.closest(".chk"))toggleBill(row.dataset.bill,row.dataset.ym);
  else if(e.target.closest('[data-act="edit"]')){const b=(S.prefs.bills||[]).find(x=>x.id===row.dataset.bill);if(b)billSheet(b)}
  return true;
}
$("#addBill").addEventListener("click",()=>billSheet(null));
$("#bills").addEventListener("click",onBillClick);

async function loadMonth(){
  const a=new Date(calY,calM,1),b=new Date(calY,calM+1,1);
  calTasks=await run(sb.from("tasks").select("id,title,starts_at,all_day,urgency,done")
    .gte("starts_at",a.toISOString()).lt("starts_at",b.toISOString()),"cargar el mes")||[];
}
function itemsFor(key){
  const d=parseD(key);
  return{
    tasks:calTasks.filter(t=>dkey(new Date(t.starts_at))===key)
      .sort((a,b)=>(a.done-b.done)||String(a.starts_at).localeCompare(String(b.starts_at))),
    goals:S.goals.filter(g=>!g.done&&g.due===key),
    bdays:S.people.filter(p=>{if(!p.birthday)return false;const b=parseD(p.birthday);return b.getMonth()===d.getMonth()&&b.getDate()===d.getDate()}),
    bills:billsFor(d.getFullYear(),d.getMonth()).filter(x=>x.key===key)
  };
}
function renderCal(){
  $("#calTitle").textContent=MESES[calM][0].toUpperCase()+MESES[calM].slice(1)+" "+calY;
  const lead=(new Date(calY,calM,1).getDay()+6)%7,dim=new Date(calY,calM+1,0).getDate();
  let h="";
  for(let i=0;i<lead;i++)h+="<span></span>";
  for(let d=1;d<=dim;d++){
    const key=ymOf(calY,calM)+"-"+pad(d),it=itemsFor(key),dots=[];
    it.bills.forEach(x=>dots.push(`<i class="bd ${x.st}"></i>`));
    it.goals.forEach(()=>dots.push('<i class="gd"></i>'));
    it.bdays.forEach(()=>dots.push('<i class="pd"></i>'));
    it.tasks.forEach(t=>dots.push(`<i style="background:${t.done?"var(--fg-faint)":URG[t.urgency].c}"></i>`));
    const n=dots.length;
    let ic=null,pulse=false;
    const bad=it.bills.find(x=>x.st==="late"||x.st==="hot"),urg=it.tasks.find(t=>!t.done&&t.urgency>=3);
    if(bad||urg){ic="#E5484D";pulse=true}
    else if(it.bills.find(x=>x.st==="warm"))ic="#F28A3C";
    else if(it.goals.length)ic=cvar("--c-vinculos");
    else if(it.bills.find(x=>x.st==="soon")||it.tasks.find(t=>!t.done&&t.urgency===2))ic="#F2BC27";
    else if(it.bdays.length)ic="#F08CC0";
    let soft=false;
    if(!ic&&n){const t=it.tasks.find(x=>!x.done);ic=t?URG[t.urgency].c:cvar("--fg-faint");soft=true}
    h+=`<button type="button" class="cal-day${key===TODAY?" today":""}${key===calSel?" sel":""}${daysTo(key)<0?" past":""}${ic?" imp":""}${soft?" soft":""}${pulse?" pulse":""}"`+
      (ic?` style="--ic:${ic}"`:"")+` data-k="${key}"`+
      ` aria-label="${d} de ${MESES[calM]}${n?", "+n+(n===1?" cosa":" cosas"):""}"><b>${d}</b><span>${dots.slice(0,4).join("")}</span></button>`;
  }
  $("#cal").innerHTML=h;
}
function renderDay(){
  $("#dayTitle").textContent=longDay(calSel);
  const it=itemsFor(calSel);
  let h=it.bills.map(x=>billRow(x,false)).join("");
  h+=it.bdays.map(p=>`<li class="task"><span class="tag">🎂</span><span class="t"><b>Cumpleaños de ${esc(p.name)}</b><small>${esc(p.relation||"tu gente")}</small></span></li>`).join("");
  h+=it.goals.map(g=>`<li class="task"><span class="tag">★</span><span class="t"><b>${esc(g.title)}</b><small>${g.kind==="macro"?"sueño":"paso de un sueño"}</small></span></li>`).join("");
  h+=it.tasks.map(t=>{
    const d=new Date(t.starts_at),u=URG[t.urgency]||URG[1];
    return `<li class="task${t.done?" done":""}" data-id="${t.id}"><button type="button" class="chk" aria-label="${t.done?"Desmarcar":"Marcar hecha"}">${TCHK}</button>`+
      `<span class="t"><b>${esc(t.title)}</b><small><i style="background:${u.c}"></i>${t.all_day?"todo el día":pad(d.getHours())+":"+pad(d.getMinutes())} · ${u.n}</small></span>`+
      `<button type="button" class="x" aria-label="Borrar">×</button></li>`;
  }).join("");
  $("#dayList").innerHTML=h||'<li class="empty-note">Nada agendado este día.</li>';
  $("#dayUrgs").innerHTML=URG.map((u,i)=>`<button type="button" data-u="${i}" aria-pressed="${i===dayUrg}" title="${u.n}" aria-label="${u.n}"><i style="background:${u.c}"></i></button>`).join("");
}
function syncToday(t,removed){
  const i=S.tasks.findIndex(x=>x.id===t.id);
  if(removed){if(i>=0)S.tasks.splice(i,1)}
  else if(i>=0)S.tasks[i]=t;
  else if(new Date(t.starts_at)<addDays(T0,1))S.tasks.push(t);
  renderTasks();
}
async function renderAgenda(){
  renderCal();renderDay();renderBills();
  try{await loadMonth()}catch(_){return}
  renderCal();renderDay();
}
function moveMonth(d){
  const t=new Date(calY,calM+d,1);calY=t.getFullYear();calM=t.getMonth();
  calSel=(calY===NOW.getFullYear()&&calM===NOW.getMonth())?TODAY:ymOf(calY,calM)+"-01";
  calTasks=[];tick();renderAgenda();
}
$("#calPrev").addEventListener("click",()=>moveMonth(-1));
$("#calNext").addEventListener("click",()=>moveMonth(1));
$("#cal").addEventListener("click",e=>{
  const b=e.target.closest(".cal-day");if(!b)return;
  calSel=b.dataset.k;tick();renderCal();renderDay();
});
$("#dayUrgs").addEventListener("click",e=>{const b=e.target.closest("[data-u]");if(!b)return;dayUrg=+b.dataset.u;tick();renderDay()});
$("#dayList").addEventListener("click",async e=>{
  if(onBillClick(e))return;
  const li=e.target.closest("[data-id]");if(!li)return;
  const t=calTasks.find(x=>x.id===li.dataset.id);if(!t)return;
  if(e.target.closest(".chk")){
    t.done=!t.done;blip(t.done);renderCal();renderDay();syncToday(t);
    try{await run(sb.from("tasks").update({done:t.done}).eq("id",t.id),"actualizar la tarea")}
    catch(_){t.done=!t.done;renderCal();renderDay();syncToday(t)}
  }else if(e.target.closest(".x")){
    calTasks=calTasks.filter(x=>x!==t);tone(500,300,.04,.18);renderCal();renderDay();syncToday(t,true);
    try{await run(sb.from("tasks").delete().eq("id",t.id),"borrar la tarea")}catch(_){calTasks.push(t);renderCal();renderDay();syncToday(t)}
  }
});
$("#dayAdd").addEventListener("submit",async e=>{
  e.preventDefault();
  const title=$("#dayTask").value.trim();if(!title)return;
  const tm=$("#dayTime").value,when=parseD(calSel);
  if(tm){const p=tm.split(":");when.setHours(+p[0],+p[1],0,0)}else when.setHours(12,0,0,0);
  $("#dayTask").value="";$("#dayTime").value="";
  try{
    const d=await run(sb.from("tasks").insert({user_id:UID,title,starts_at:when.toISOString(),all_day:!tm,urgency:dayUrg})
      .select("id,title,starts_at,all_day,urgency,done").single(),"agendar");
    calTasks.push(d);blip(true);renderCal();renderDay();syncToday(d);
  }catch(_){$("#dayTask").value=title}
});

/* ═════════ CAPITAL ═════════ */
let capCur="CLP";
const KLAB={ahorro:"Ahorro",ingreso:"Ingreso",gasto:"Gasto"};
const curOf=m=>m.currency||"CLP";
function moneySheet(m){
  const isNew=!m;
  openSheet({title:isNew?"Nuevo movimiento":"Movimiento",fields:[
    {k:"kind",label:"Tipo",type:"select",options:[["ahorro","Ahorro"],["ingreso","Ingreso"],["gasto","Gasto (resta)"]],value:m?m.kind:"ahorro"},
    {k:"amount",label:"Monto",type:"number",value:m?+m.amount:""},
    {k:"currency",label:"Moneda",type:"select",options:[["CLP","Pesos (CLP)"],["USD","Dólares (USD)"]],value:m?curOf(m):"CLP"},
    {k:"day",label:"Fecha",type:"date",value:m?m.day:TODAY},
    {k:"note",label:"Nota (opcional)",value:m?m.note:""}],
   onSave:async v=>{
     if(!(v.amount>0))throw{user:"Pon un monto mayor que cero"};
     const row={kind:v.kind,amount:v.amount,currency:v.currency,day:v.day||TODAY,note:v.note};
     if(isNew)S.money.push(await run(sb.from("money").insert(Object.assign({user_id:UID},row)).select("*").single(),"guardar el movimiento"));
     else{await run(sb.from("money").update(row).eq("id",m.id),"guardar el movimiento");Object.assign(m,row)}
     S.money.sort((a,b)=>String(b.day).localeCompare(String(a.day)));renderCapital();
   },
   onDelete:isNew?null:async()=>{
     await run(sb.from("money").delete().eq("id",m.id),"eliminar el movimiento");
     S.money=S.money.filter(x=>x.id!==m.id);renderCapital();
   }});
}
const JST=["en curso","entregado","pagado"];
async function payJob(j){
  if(!(+j.amount>0))return;
  const d=await run(sb.from("money").insert({user_id:UID,kind:"ingreso",amount:j.amount,currency:curOf(j),day:TODAY,
    note:"Pega: "+j.client+" — "+j.project}).select("*").single(),"anotar el ingreso");
  S.money.unshift(d);toast("Ingreso anotado: "+fmtMoney(j.amount,curOf(j)));
}
function jobSheet(j){
  const isNew=!j,was=j?j.status:null;
  openSheet({title:isNew?"Nueva pega":"Pega",fields:[
    {k:"client",label:"Cliente",value:j?j.client:""},
    {k:"project",label:"Proyecto",value:j?j.project:""},
    {k:"amount",label:"Monto (opcional)",type:"number",value:j&&j.amount!=null?+j.amount:""},
    {k:"currency",label:"Moneda",type:"select",options:[["CLP","Pesos (CLP)"],["USD","Dólares (USD)"]],value:j?curOf(j):"CLP"},
    {k:"status",label:"Estado",type:"select",options:JST.map(s=>[s,s[0].toUpperCase()+s.slice(1)]),value:j?j.status:"en curso"},
    {k:"day",label:"Fecha",type:"date",value:j?j.day:TODAY}],
   onSave:async v=>{
     if(!v.client||!v.project)throw{user:"Pon el cliente y el proyecto"};
     const row={client:v.client,project:v.project,amount:v.amount,currency:v.currency,status:v.status,day:v.day||TODAY};
     let rec=j;
     if(isNew){rec=await run(sb.from("jobs").insert(Object.assign({user_id:UID},row)).select("*").single(),"guardar la pega");S.jobs.push(rec)}
     else{await run(sb.from("jobs").update(row).eq("id",j.id),"guardar la pega");Object.assign(j,row)}
     if(row.status==="pagado"&&was!=="pagado")await payJob(rec);
     S.jobs.sort((a,b)=>String(b.day).localeCompare(String(a.day)));renderCapital();
   },
   onDelete:isNew?null:async()=>{
     await run(sb.from("jobs").delete().eq("id",j.id),"eliminar la pega");
     S.jobs=S.jobs.filter(x=>x.id!==j.id);renderCapital();
   }});
}
function renderIncChart(){
  const months=[];
  for(let i=5;i>=0;i--){const d=new Date(NOW.getFullYear(),NOW.getMonth()-i,1);months.push({ym:ymOf(d.getFullYear(),d.getMonth()),m:d.getMonth(),inc:0,exp:0})}
  S.money.forEach(x=>{
    if(curOf(x)!==capCur||(x.kind!=="ingreso"&&x.kind!=="gasto"))return;
    const mo=months.find(o=>o.ym===String(x.day).slice(0,7));if(!mo)return;
    if(x.kind==="ingreso")mo.inc+= +x.amount;else mo.exp+= +x.amount;
  });
  const max=Math.max.apply(null,months.map(o=>Math.max(o.inc,o.exp))),sv=$("#incChart"),read=$("#incRead");
  const say=o=>{read.innerHTML=`${MESES[o.m][0].toUpperCase()+MESES[o.m].slice(1)}: ingresos <b>${fmtMoney(o.inc,capCur)}</b> · gastos <b>${fmtMoney(o.exp,capCur)}</b>`};
  if(!max){sv.innerHTML="";sv.style.display="none";read.textContent="Aún no hay ingresos ni gastos en "+(capCur==="USD"?"dólares":"pesos")+" en estos seis meses.";return}
  sv.style.display="";
  const W=600,H=230,L=8,R=8,T=48,B=28,pw=(W-L-R)/6,bw=Math.min(26,pw*.27),ph=H-T-B;
  const ink=cvar("--fg-faint"),fg=cvar("--fg"),grid=cvar("--edge"),ci=cvar("--inc"),ce=cvar("--exp"),ui=cvar("--ui");
  let h=`<g font-family="${ui}" font-size="12" font-weight="600"><rect x="${L}" y="4" width="10" height="10" rx="3" fill="${ci}"/><text x="${L+16}" y="13" fill="${cvar("--fg-dim")}">Ingresos</text>`+
    `<rect x="${L+90}" y="4" width="10" height="10" rx="3" fill="${ce}"/><text x="${L+106}" y="13" fill="${cvar("--fg-dim")}">Gastos</text></g>`+
    `<line x1="${L}" y1="${T}" x2="${W-R}" y2="${T}" stroke="${grid}" stroke-width="1"/>`+
    `<line x1="${L}" y1="${T+ph/2}" x2="${W-R}" y2="${T+ph/2}" stroke="${grid}" stroke-width="1"/>`+
    `<line x1="${L}" y1="${T+ph}" x2="${W-R}" y2="${T+ph}" stroke="${ink}" stroke-width="1" opacity=".5"/>`+
    `<text x="${W-R}" y="${T-7}" text-anchor="end" font-size="11" fill="${ink}" font-family="${ui}">${shortMoney(max)}</text>`;
  const bar=(x,v,col,op)=>{const bh=Math.max(v?3:0,v/max*ph);if(!bh)return"";const y=T+ph-bh,r=Math.min(4,bh);
    return `<path fill="${col}" opacity="${op}" d="M${x} ${T+ph}V${y+r}q0 ${-r} ${r} ${-r}h${bw-2*r}q${r} 0 ${r} ${r}V${T+ph}z"/>`};
  months.forEach((o,i)=>{
    const cx=L+pw*i+pw/2,cur=i===5,op=cur?1:.6;
    h+=bar(cx-bw-1,o.inc,ci,op)+bar(cx+1,o.exp,ce,op);
    if(cur){
      if(o.inc)h+=`<text x="${cx-bw/2-1}" y="${T+ph-o.inc/max*ph-7}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${fg}" font-family="${ui}">${shortMoney(o.inc)}</text>`;
      if(o.exp)h+=`<text x="${cx+bw/2+1}" y="${T+ph-o.exp/max*ph-7}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${fg}" font-family="${ui}">${shortMoney(o.exp)}</text>`;
    }
    h+=`<text x="${cx}" y="${H-8}" text-anchor="middle" font-size="12" font-weight="${cur?700:500}" fill="${cur?fg:ink}" font-family="${ui}">${MES3[o.m]}</text>`+
       `<rect data-i="${i}" x="${L+pw*i}" y="${T}" width="${pw}" height="${ph+B}" fill="transparent" style="cursor:pointer"/>`;
  });
  sv.innerHTML=h;say(months[5]);
  sv.onpointerover=sv.onclick=e=>{const b=e.target.closest("[data-i]");if(b)say(months[+b.dataset.i])};
  sv.onpointerleave=()=>say(months[5]);
}
function renderCapital(){
  if(!LOADED.money||!LOADED.jobs)return;
  const ym=TODAY.slice(0,7);
  const sum=(kind,cur,month)=>S.money.filter(m=>m.kind===kind&&curOf(m)===cur&&(!month||String(m.day).slice(0,7)===ym)).reduce((a,m)=>a+ +m.amount,0);
  const hasUSD=S.money.some(m=>curOf(m)==="USD");
  const doneN=S.goals.filter(g=>g.kind==="macro"&&g.done).length;
  const tile=(lab,big,sub)=>`<section class="glass tile"><small>${lab}</small><b>${big}</b>${sub?`<em>${sub}</em>`:""}</section>`;
  const disp=c=>sum("ahorro",c)-sum("gasto",c);
  const sgn=(n,c)=>(n<0?"−":"")+fmtMoney(Math.abs(n),c);
  $("#tiles").innerHTML=
    tile("Disponible",sgn(disp("CLP"),"CLP"),(hasUSD?sgn(disp("USD"),"USD")+" · ":"")+"ahorro menos gastos")+
    tile("Ingresos de "+MESES[NOW.getMonth()],fmtMoney(sum("ingreso","CLP",true),"CLP"),hasUSD?fmtMoney(sum("ingreso","USD",true),"USD"):"")+
    tile("Gastos de "+MESES[NOW.getMonth()],fmtMoney(sum("gasto","CLP",true),"CLP"),hasUSD?fmtMoney(sum("gasto","USD",true),"USD"):"")+
    tile("Metas logradas",String(doneN),doneN===1?"sueño cumplido":"sueños cumplidos");
  if(!hasUSD)capCur="CLP";
  $("#curChips").innerHTML=hasUSD?["CLP","USD"].map(c=>`<button type="button" class="chipf" data-c="${c}" aria-pressed="${capCur===c}">${c}</button>`).join(""):"";
  renderIncChart();
  $("#moves").innerHTML=S.money.length?S.money.slice(0,25).map(m=>
    `<li class="move" data-id="${m.id}"><span class="pill ${m.kind}">${KLAB[m.kind]||m.kind}</span>`+
    `<span class="t"><b>${esc(m.note||KLAB[m.kind]||"")}</b><small>${dayLabel(m.day)}</small></span>`+
    `<span class="amt${m.kind==="gasto"?" neg":""}">${m.kind==="gasto"?"−":""}${fmtMoney(m.amount,curOf(m))}</span></li>`).join("")
    :'<li class="empty-note">Anota lo que ahorras, lo que te entra y lo que gastas. Los gastos restan del disponible.</li>';
  $("#jobs").innerHTML=S.jobs.length?S.jobs.slice(0,40).map(j=>{
    const si=Math.max(0,JST.indexOf(j.status));
    return `<li class="job" data-id="${j.id}"><span class="t"><b>${esc(j.project)}</b><small>${esc(j.client)} · ${dayLabel(j.day)}</small></span>`+
      (j.amount!=null?`<span class="amt">${fmtMoney(j.amount,curOf(j))}</span>`:"")+
      `<button type="button" class="pill st${si}" data-act="adv" title="${si<2?"Toca para pasar a "+JST[si+1]:"Pagada"}">${JST[si]}</button></li>`;
  }).join(""):'<li class="empty-note">Tu historial de trabajos: en curso, entregado, pagado. Al marcar pagado se anota solo el ingreso.</li>';
  const rows=doneRows();
  $("#capDone").innerHTML=rows||'<li class="empty-note">Cuando marques un sueño como logrado aparece acá.</li>';
}
$("#addMoney").addEventListener("click",()=>moneySheet(null));
$("#addJob").addEventListener("click",()=>jobSheet(null));
$("#curChips").addEventListener("click",e=>{const b=e.target.closest("[data-c]");if(!b)return;capCur=b.dataset.c;tick();renderCapital()});
$("#moves").addEventListener("click",e=>{
  const li=e.target.closest(".move");if(!li)return;
  const m=S.money.find(x=>x.id===li.dataset.id);if(m)moneySheet(m);
});
$("#jobs").addEventListener("click",async e=>{
  const li=e.target.closest(".job");if(!li)return;
  const j=S.jobs.find(x=>x.id===li.dataset.id);if(!j)return;
  if(e.target.closest('[data-act="adv"]')){
    const i=JST.indexOf(j.status);
    if(i<0||i>=2){jobSheet(j);return}
    const next=JST[i+1];
    try{
      await run(sb.from("jobs").update({status:next}).eq("id",j.id),"actualizar la pega");
      j.status=next;blip(true);
      if(next==="pagado")await payJob(j);
    }catch(_){}
    renderCapital();
  }else jobSheet(j);
});
$("#capDone").addEventListener("click",e=>{const b=e.target.closest('[data-act="reopen"]');if(b)reopenGoal(b.closest("li").dataset.id)});

/* ═════════ entrar a una sección ═════════ */
async function enterView(v){
  try{
    if(v==="vida"){
      renderAreas();
      await need("journal","people","memories","money","jobs");
      renderAreas();renderJournal();renderPeople();renderMems();
    }else if(v==="suenos")renderDreams();
    else if(v==="agenda"){await need("people");await renderAgenda()}
    else if(v==="capital"){await need("money","jobs");renderCapital()}
  }catch(e){fail(e,"cargar esta sección")}
}

/* ═════════ todo junto ═════════ */
function renderAll(){
  buildWheel();buildLabels();buildSparks();measure();setAvg();setHot(-1);
  renderHabits();renderBars();renderUrgs();renderTasks();renderNext();applyBg();renderTg();
  if(!looping&&!reduce){looping=true;requestAnimationFrame(loop)}
}

boot().catch(e=>{fail(e,"iniciar");showLogin()});
})();
