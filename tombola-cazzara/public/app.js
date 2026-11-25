const socket=io();
const $=id=>document.getElementById(id);
let role=null,code=null,hostKey=null,playerId=null,playerCards=[],drawn=[],lastNumber=null;
const sections=["home","host","join","player"];

function renderSmorfia(n){
 const x=n?window.SMORFIA_DATA[n-1]:null;
 const h=$("smorfiaLine"),p=$("playerSmorfia");
 if(h){h.classList.toggle("hidden",!x);h.innerHTML=x?'<span class="smorfia-meaning">'+escapeHtml(x.meaning)+'</span><span class="smorfia-joke">“'+escapeHtml(x.joke)+'”</span><span class="smorfia-label">SMORFIA NAPOLETANA · VERSIONE CAZZARA</span>':'';}
 if(p){p.classList.toggle("hidden",!x);p.innerHTML=x?'<strong>'+escapeHtml(x.meaning)+'</strong><span>“'+escapeHtml(x.joke)+'”</span>':'';}
}
function show(id){sections.forEach(s=>$(s).classList.toggle("hidden",s!==id));}
function request(event,data){return new Promise(resolve=>socket.emit(event,data,resolve));}
function renderBoard(numbers){const set=new Set(numbers||[]);$("board").innerHTML=Array.from({length:90},(_,i)=>i+1).map(n=>`<div class="ball ${set.has(n)?"out":""}">${n}</div>`).join("");}
function renderState(g){
  if(!g)return;
  drawn=g.drawn||[];
  $("drawCount").textContent=drawn.length+" / 90 estratti";
  $("stageNumber").textContent=g.currentNumber??"?";
  renderSmorfia(g.currentNumber);
  $("stageCaption").textContent=g.status==="suspense"?"IL DESTINO STA DECIDENDO":"SIAMO TUTTI IN ATTESA";
  $("history").innerHTML=drawn.length?drawn.slice(-8).reverse().map(n=>`<span>${n}</span>`).join(""):'<span class="muted">Ancora nessun numero. Che ansia.</span>';
  $("playerCount").textContent=g.players.length;
  $("playerList").innerHTML=g.players.length?g.players.map(p=>`<span class="player-chip">${escapeHtml(p.nickname)} · ${p.cards} cart.</span>`).join(""):'<span class="muted">Aspettiamo i giocatori...</span>';
  $("wins").innerHTML=(g.wins||[]).slice(-8).reverse().map(w=>`<div class="win-line">🏆 ${escapeHtml(w.nickname)} · ${w.tier} · cartella ${w.card}</div>`).join("");
  $("duration").value=String(g.duration);
  renderBoard(drawn);
  $("drawBtn").disabled=g.status!=="ready"||drawn.length>=90;
  $("drawBtn").textContent=g.status==="suspense"?"⏳ ESTRAZIONE IN CORSO…":drawn.length>=90?"90 NUMERI: SIPARIO":"🎱 ESTRAI IL PROSSIMO NUMERO";
  if(g.status==="suspense"){$("timer").classList.remove("hidden");$("timer").textContent=g.suspense;}
  else $("timer").classList.add("hidden");
}
function renderCards(marks){
  $("cards").innerHTML=playerCards.map((card,i)=>`<article class="ticket"><h3 class="ticket-title">CARTELLA ${i+1}</h3><div class="ticket-grid">${card.flat().map(n=>`<div class="cell ${n===null?"blank":marks.includes(n)?"hit":""}">${n===null?"":n}</div>`).join("")}</div></article>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("hostBtn").onclick=async()=>{
  role="host"; if(ambienceReady&&!ambienceOn)toggleAmbience(true); const r=await request("host:create",{});
  if(!r.ok)return alert("Non riesco a creare la partita");
  code=r.code;hostKey=r.hostKey;localStorage.setItem("tc_host",JSON.stringify({code,hostKey}));
  $("roomCode").textContent=code;
  if(r.qr){$("qr").src=r.qr;$("qr").classList.remove("hidden");$("qrPlaceholder").classList.add("hidden");}
  else $("qrPlaceholder").textContent="Condividi il codice "+code;
  show("host");renderState(r.game);
};
$("joinBtn").onclick=()=>show("join");
$("enterBtn").onclick=async()=>{
  const c=$("joinCode").value.trim(),nickname=$("nickname").value.trim();
  $("joinMessage").textContent="Un attimo, stiamo preparando le cartelle…";
  const r=await request("player:join",{code:c,nickname,count:$("cardCount").value,playerId:localStorage.getItem("tc_player_"+c)});
  if(!r.ok){$("joinMessage").textContent=r.error;return;}
  role="player";code=c;playerId=r.playerId;playerCards=r.cards;localStorage.setItem("tc_player_"+c,playerId);
  $("playerName").textContent=escapeHtml(nickname||"Giocatore");$("playerCode").textContent=c;
  renderCards(r.game.drawn);$("playerLast").textContent=r.game.currentNumber??"—";renderSmorfia(r.game.currentNumber);show("player");
};
$("drawBtn").onclick=async()=>{
  const r=await request("host:draw",{code,hostKey});
  if(!r.ok)$("hostMessage").textContent=r.error;else $("hostMessage").textContent="Bocce in movimento. Vietato sbirciare.";
};
$("duration").onchange=async()=>{const r=await request("host:duration",{code,hostKey,duration:$("duration").value});if(!r.ok)$("hostMessage").textContent=r.error;};
$("finishBtn").onclick=async()=>{if(confirm("Vuoi davvero chiudere la partita?")){const r=await request("host:finish",{code,hostKey});if(r.ok){$("hostMessage").textContent="Partita chiusa. Il banco ringrazia."; $("newGameBtn").classList.remove("hidden"); $("finishBtn").disabled=true;}}};
$("newGameBtn").onclick=()=>{localStorage.removeItem("tc_host");role=null;code=null;hostKey=null;playerId=null;playerCards=[];drawn=[];lastNumber=null;$("newGameBtn").classList.add("hidden");$("finishBtn").disabled=false;$("hostMessage").textContent="";show("home");};
socket.on("game:state",g=>{if(role==="host"&&g.code===code)renderState(g);});
socket.on("draw:tick",d=>{if(role==="host"){$("timer").classList.remove("hidden");$("timer").textContent=d.seconds;}if(role==="player"){$("playerTimer").classList.remove("hidden");$("playerTimer").textContent=d.seconds;$("playerStatus").textContent="SUSPENSE! Il numero sta arrivando…";}});
socket.on("draw:suspense",d=>{if(role==="player"){$("playerTimer").classList.remove("hidden");$("playerTimer").textContent=d.seconds;$("playerStatus").textContent="NON URLARE ANCORA. NON È USCITO."; }});
socket.on("draw:revealed",d=>{drawn=d.drawn;lastNumber=d.number;if(role==="player"){$("playerTimer").classList.add("hidden");$("playerStatus").textContent="È USCITO IL "+d.number+"! Controlla le cartelle."; $("playerLast").textContent=d.number;renderSmorfia(d.number);renderCards(d.drawn);}if(role==="host"){$("stageNumber").textContent=d.number;$("stageCaption").textContent="IL NUMERO È USCITO. E MO' PAGATE.";}});
socket.on("player:cards",d=>{if(role==="player"){playerCards=d.cards;renderCards(d.marks||drawn);}});
socket.on("game:wins",wins=>{const text=wins.map(w=>w.nickname+" ha fatto "+w.tier+"!").join(" · ");if(role==="player")$("playerWins").textContent="🏆 "+text;if(role==="host")$("hostMessage").textContent="🏆 "+text;});

const jingleSources=["/sounds/01-alleluja.mp3","/sounds/02-applausi.m4a","/sounds/03-deleterio.mp3","/sounds/04-numero-ingrato.mp3","/sounds/05-radetzky-march.mp3","/sounds/06-sigla-cazzara-lunga.m4a","/sounds/07-sigla-cazzara-breve.m4a","/sounds/08-vaffa.mp3","/sounds/09-warning.mp3"];
const jingleAudio=jingleSources.map(src=>{const audio=new Audio(src);audio.preload="auto";return audio;});
document.querySelectorAll("[data-jingle]").forEach(button=>button.addEventListener("click",()=>{
 const index=Number(button.dataset.jingle.replace("jingle",""))-1;
 const audio=jingleAudio[index];
 if(!audio){$("hostMessage").textContent="Suono non disponibile.";return;}
 jingleAudio.forEach(a=>{if(a!==audio){a.pause();a.currentTime=0;}});
 audio.currentTime=0;
 audio.play().catch(()=>{$("hostMessage").textContent="Impossibile riprodurre il suono. Riprova con un clic.";});
}));


/* Sottofondo ambientale: memorizzazione locale IndexedDB, loop e volume contenuto. */
const ambienceAudio=new Audio();
ambienceAudio.loop=true;
ambienceAudio.volume=0.10;
let ambienceReady=false, ambienceOn=false, ambienceObjectUrl=null;
const ambienceDB= new Promise((resolve,reject)=>{
 const req=indexedDB.open("tombola-cazzara-audio",1);
 req.onupgradeneeded=()=>req.result.createObjectStore("sounds");
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
async function saveAmbience(blob){
 const db=await ambienceDB;
 await new Promise((resolve,reject)=>{const tx=db.transaction("sounds","readwrite");tx.objectStore("sounds").put(blob,"ambience");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
}
async function loadAmbience(){
 try{
  const db=await ambienceDB;
  const blob=await new Promise((resolve,reject)=>{const tx=db.transaction("sounds","readonly");const req=tx.objectStore("sounds").get("ambience");req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  if(blob){setAmbienceSource(blob);$("ambienceStatus").textContent="Traccia già caricata e ricordata su questo browser";}
 }catch(e){$("ambienceStatus").textContent="Carica il file audio per attivare il sottofondo";}
}
function setAmbienceSource(blob){
 if(ambienceObjectUrl)URL.revokeObjectURL(ambienceObjectUrl);
 ambienceObjectUrl=URL.createObjectURL(blob);ambienceAudio.src=ambienceObjectUrl;ambienceReady=true;
}
async function toggleAmbience(force){
 if(!ambienceReady){$("ambienceStatus").textContent="Prima carica il file suspense.m4a";return;}
 const next=typeof force==="boolean"?force:!ambienceOn;
 if(next){
  try{await ambienceAudio.play();ambienceOn=true;$("ambienceToggle").textContent="♫ SUONO ON · SPEGNI";$("ambienceToggle").setAttribute("aria-pressed","true");$("ambienceStatus").textContent="Sottofondo in riproduzione continua";}
  catch(e){ambienceOn=false;$("ambienceStatus").textContent="Premi di nuovo SUONO ON per consentire la riproduzione";}
 }else{ambienceAudio.pause();ambienceOn=false;$("ambienceToggle").textContent="♫ SUONO OFF · ATTIVA";$("ambienceToggle").setAttribute("aria-pressed","false");$("ambienceStatus").textContent="Sottofondo disattivato";}
}
$("ambienceFile").addEventListener("change",async()=>{
 const file=$("ambienceFile").files&&$("ambienceFile").files[0];if(!file)return;
 if(!file.type.startsWith("audio/")&&!/\.(m4a|mp3|wav|ogg)$/i.test(file.name)){$("ambienceStatus").textContent="Formato audio non riconosciuto";return;}
 setAmbienceSource(file);
 try{await saveAmbience(file);$("ambienceStatus").textContent="Traccia salvata su questo browser · loop attivo";await toggleAmbience(true);}
 catch(e){$("ambienceStatus").textContent="Traccia caricata solo per questa sessione";}
});
$("ambienceToggle").addEventListener("click",()=>toggleAmbience());
$("ambienceVolume").addEventListener("input",e=>{ambienceAudio.volume=Number(e.target.value)/100;});
loadAmbience();

const params=new URLSearchParams(location.search);if(params.get("join")){$("joinCode").value=params.get("join");show("join");}
const saved=localStorage.getItem("tc_host");if(saved){try{const s=JSON.parse(saved);socket.on("connect",async()=>{if(role)return;const r=await request("host:resume",s);if(r.ok){role="host";code=s.code;hostKey=s.hostKey;$("roomCode").textContent=code;show("host");renderState(r.game);}});}catch(e){}}
