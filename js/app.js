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
const S={areas:{},days:{},tasks:[],goals:[],prefs:{}};
AREAS.forEach(a=>S.areas[a.k]={score:0,goal:"",note:""});

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
function fail(e,what){console.error(what,e);toast("No se pudo "+what+". Revisa tu conexión.")}

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
    sb.from("areas").select("key,score,goal,note"),
    sb.from("days").select("day,habits,kind,note").gte("day",since),
    sb.from("tasks").select("id,title,starts_at,all_day,urgency,done").or('done.eq.false,starts_at.gte."'+T0.toISOString()+'"'),
    sb.from("goals").select("id,title,kind,area,due,pinned,done,done_at,photo"),
    sb.from("settings").select("prefs").maybeSingle()
  ]);
  [a,d,t,g,st].forEach(r=>{if(r.error)throw r.error});
  S.prefs=(st.data&&st.data.prefs)||{};
  a.data.forEach(r=>{S.areas[r.key]={score:r.score||0,goal:r.goal||"",note:r.note||""}});
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
function pickFile(){
  return new Promise(res=>{
    const inp=$("#filePick");inp.value="";
    inp.onchange=()=>res(inp.files&&inp.files[0]||null);
    inp.click();
  });
}
async function savePrefs(){
  const r=await sb.from("settings").upsert({user_id:UID,prefs:S.prefs,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(r.error)throw r.error;
}
async function applyBg(){
  const el=$("#bgphoto"),has=!!S.prefs.bg;
  $("#bgOff").hidden=!has;
  $("#bgBtn").textContent=has?"cambiar foto de fondo":"poner foto de fondo";
  if(!has){el.classList.remove("on");document.body.classList.remove("has-photo");return}
  const url=await photoUrl(S.prefs.bg);
  if(!url)return;
  const im=new Image();
  im.onload=()=>{el.style.backgroundImage='url("'+url+'")';el.classList.add("on");document.body.classList.add("has-photo")};
  im.src=url;
}
$("#bgBtn").addEventListener("click",async()=>{
  const f=await pickFile();if(!f)return;
  const b=$("#bgBtn");b.disabled=true;b.textContent="subiendo…";
  try{
    const old=S.prefs.bg;
    S.prefs.bg=await uploadPhoto(f,"fondo",2200);
    await savePrefs();dropPhoto(old);blip(true);
  }catch(e){fail(e,"subir la foto")}
  b.disabled=false;applyBg();
});
$("#bgOff").addEventListener("click",async()=>{
  const old=S.prefs.bg;delete S.prefs.bg;
  try{await savePrefs();dropPhoto(old)}catch(e){S.prefs.bg=old;fail(e,"quitar el fondo")}
  applyBg();
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
  return S.goals.filter(g=>!g.done&&g.due&&daysTo(g.due)>=0)
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
    return `<li><b>${d}</b><span class="u">${d===1?"día":"días"}</span>`+
      `<span class="w">${esc(g.title)}<small>${fmtDue(g.due)}</small></span></li>`;
  }).join("");
  const recent=S.goals.filter(g=>g.done&&g.done_at&&(Date.now()-new Date(g.done_at))<30*864e5);
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
  if(!list.length){ul.innerHTML='<li class="empty-note">Nada pendiente para hoy. Agrega lo que surja.</li>';return}
  ul.innerHTML=list.map(t=>{
    const w=taskWhen(t),u=URG[t.urgency]||URG[1];
    return `<li class="task${t.done?" done":""}${w.late?" late":""}" data-id="${t.id}">
      <button type="button" class="chk" aria-label="${t.done?"Desmarcar":"Marcar hecha"}"><svg viewBox="0 0 24 24" fill="none" stroke="var(--bg)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></button>
      <span class="t"><b>${esc(t.title)}</b><small><i style="background:${u.c}"></i>${w.txt} · ${u.n}</small></span>
      <button type="button" class="x" aria-label="Borrar">×</button></li>`;
  }).join("");
}
$("#tasks").addEventListener("click",async e=>{
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

/* ═════════ navegación ═════════ */
const VIEWS=["hoy","vida","suenos","agenda","capital"];
let curView=null,navTok=0;
function route(){
  let v=location.hash.slice(1);if(VIEWS.indexOf(v)<0)v="hoy";
  const i=VIEWS.indexOf(v),prev=curView,pi=prev?VIEWS.indexOf(prev):i,tok=++navTok;
  document.querySelectorAll(".nav button").forEach(b=>{
    if(b.dataset.v===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  $("#pill").style.setProperty("--i",i);
  const swap=()=>{VIEWS.forEach(x=>{const el=$("#v-"+x);el.hidden=x!==v;el.classList.remove("leave")});try{scrollTo(0,0)}catch(_){}};
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
const ph=$("#ph"),blobs=document.querySelectorAll(".blob"),bgEl=$("#bgphoto");
let ticking=false;
addEventListener("scroll",()=>{
  if(ticking)return;ticking=true;
  requestAnimationFrame(()=>{const y=scrollY;
    ph.style.transform=`translateY(${(y*.1).toFixed(1)}px)`;
    bgEl.style.translate=`0 ${(-y*.035).toFixed(1)}px`;
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

/* ═════════ todo junto ═════════ */
function renderAll(){
  buildWheel();buildLabels();buildSparks();measure();setAvg();setHot(-1);
  renderHabits();renderBars();renderUrgs();renderTasks();renderNext();applyBg();
  if(!looping&&!reduce){looping=true;requestAnimationFrame(loop)}
}

boot().catch(e=>{fail(e,"iniciar");showLogin()});
})();
