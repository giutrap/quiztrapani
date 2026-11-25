const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const PORT = process.env.PORT || 10000;
const games = new Map();

// Estrae una sola volta i nove jingle caricati nel repository, prima di esporre la cartella pubblica.
const soundArchive = path.join(__dirname, "tombola-cazzara-suoni.zip");
const publicDir = path.join(__dirname, "public");
if (fs.existsSync(soundArchive)) {
  try {
    new AdmZip(soundArchive).extractAllTo(publicDir, true);
    console.log("Tombola Cazzara: nove jingle pronti in /sounds");
  } catch (error) {
    console.error("Errore estrazione archivio jingle:", error.message);
  }
}
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, app: "Tombola Cazzara" }));

function code6() { return String(Math.floor(100000 + Math.random() * 900000)); }
function shuffle(a) { for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function makeCard() {
  let matrix, counts;
  for (let tries=0; tries<2000; tries++) {
    matrix = Array.from({length:3},()=>Array(9).fill(false));
    counts = Array(9).fill(0);
    for (let r=0;r<3;r++) {
      const cols = shuffle([...Array(9).keys()].filter(c=>counts[c]<3)).slice(0,5);
      cols.forEach(c=>{ matrix[r][c]=true; counts[c]++; });
    }
    if (counts.every(n=>n>=1 && n<=3)) break;
  }
  const card = matrix.map(row=>row.map(()=>null));
  for (let c=0;c<9;c++) {
    const min = c===0 ? 1 : c*10;
    const max = c===8 ? 90 : c*10+9;
    const nums = shuffle(Array.from({length:max-min+1},(_,i)=>min+i)).slice(0,counts[c]).sort((a,b)=>a-b);
    const rows = [0,1,2].filter(r=>matrix[r][c]);
    rows.forEach((r,i)=>card[r][c]=nums[i]);
  }
  return card;
}
function publicGame(g) {
  return {
    code:g.code, status:g.status, duration:g.duration, drawn:g.drawn,
    currentNumber:g.currentNumber, suspense:g.suspense, players:[...g.players.values()].map(p=>({id:p.id,nickname:p.nickname,cards:p.cards.length})),
    wins:g.wins.slice(-12)
  };
}
function emitState(g) {
  io.to(g.code).emit("game:state", publicGame(g));
  for (const p of g.players.values()) {
    const s=io.sockets.sockets.get(p.socketId);
    if (s) s.emit("player:cards", { cards:p.cards, marks:g.drawn });
  }
}
function evaluate(g) {
  const wins=[];
  for (const p of g.players.values()) {
    p.cards.forEach((card,ci)=>{
      for (let r=0;r<3;r++) {
        const hit=card[r].filter(n=>n!==null && g.drawn.includes(n)).length;
        for (const [tier,needed] of [["Ambo",2],["Terno",3],["Quaterna",4],["Cinquina",5]]) {
          const key=ci+":"+r+":"+tier;
          if (hit>=needed && !g.claimed.has(p.id+":"+key)) {
            g.claimed.add(p.id+":"+key);
            wins.push({nickname:p.nickname,card:ci+1,tier,row:r+1});
          }
        }
      }
      const total=card.flat().filter(n=>n!==null).length;
      const hit=card.flat().filter(n=>n!==null && g.drawn.includes(n)).length;
      const key=ci+":tombola";
      if (hit===total && !g.claimed.has(p.id+":"+key)) {
        g.claimed.add(p.id+":"+key);
        wins.push({nickname:p.nickname,card:ci+1,tier:"TOMBOLA"});
      }
    });
  }
  if (wins.length) {
    g.wins.push(...wins);
    io.to(g.code).emit("game:wins", wins);
  }
}
function finishDraw(g) {
  if (!g.pendingNumber) return;
  const n=g.pendingNumber;
  g.pendingNumber=null; g.timerEndsAt=null; g.suspense=0;
  g.drawn.push(n); g.currentNumber=n; g.status="ready";
  io.to(g.code).emit("draw:revealed",{number:n,drawn:g.drawn});
  evaluate(g); emitState(g);
}
function startDraw(g) {
  if (g.status!=="ready" || g.drawn.length>=90) return false;
  const remaining=Array.from({length:90},(_,i)=>i+1).filter(n=>!g.drawn.includes(n));
  g.pendingNumber=remaining[Math.floor(Math.random()*remaining.length)];
  g.status="suspense";
  g.timerEndsAt=Date.now()+g.duration*1000;
  g.suspense=g.duration;
  io.to(g.code).emit("draw:suspense",{seconds:g.duration});
  g.timer=setInterval(()=>{
    const left=Math.max(0,Math.ceil((g.timerEndsAt-Date.now())/1000));
    g.suspense=left;
    io.to(g.code).emit("draw:tick",{seconds:left});
    if (left<=0) { clearInterval(g.timer); finishDraw(g); }
  },1000);
  emitState(g);
  return true;
}

io.on("connection", socket => {
  socket.on("host:create", async (_data, cb) => {
    let code=code6(); while(games.has(code)) code=code6();
    const hostKey=crypto.randomBytes(18).toString("hex");
    const g={code,hostKey,hostSocket:socket.id,status:"ready",duration:15,drawn:[],currentNumber:null,suspense:0,pendingNumber:null,timer:null,timerEndsAt:null,players:new Map(),wins:[],claimed:new Set()};
    games.set(code,g); socket.join(code);
    const joinUrl=process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace(/\/$/,"")+"/?join="+code : "";
    let qr=null; if(joinUrl) qr=await QRCode.toDataURL(joinUrl,{width:260,margin:1});
    cb({ok:true,code,hostKey,joinUrl,qr,game:publicGame(g)});
  });
  socket.on("host:resume", ({code,hostKey},cb) => {
    const g=games.get(String(code||""));
    if(!g || g.hostKey!==hostKey) return cb({ok:false,error:"Sessione organizzatore non valida"});
    g.hostSocket=socket.id; socket.join(g.code); cb({ok:true,game:publicGame(g)}); emitState(g);
  });
  socket.on("player:join", ({code,nickname,count,playerId},cb) => {
    const g=games.get(String(code||"").trim());
    if(!g) return cb({ok:false,error:"Codice partita non trovato"});
    if(g.status==="finished") return cb({ok:false,error:"Questa partita è terminata"});
    const id=playerId && g.players.has(playerId) ? playerId : crypto.randomUUID();
    let p=g.players.get(id);
    if(!p) {
      const n=Math.max(1,Math.min(2,Number(count)||1));
      p={id,nickname:String(nickname||"Giocatore").trim().slice(0,22)||"Giocatore",cards:Array.from({length:n},makeCard),socketId:socket.id};
      g.players.set(id,p);
    } else p.socketId=socket.id;
    socket.join(g.code);
    cb({ok:true,playerId:id,cards:p.cards,game:publicGame(g)});
    emitState(g);
  });
  socket.on("host:duration", ({code,hostKey,duration},cb) => {
    const g=games.get(String(code||""));
    if(!g || g.hostKey!==hostKey || g.status==="suspense") return cb({ok:false,error:"Non è possibile modificare ora il timer"});
    g.duration=Math.max(5,Math.min(60,Number(duration)||15)); emitState(g); cb({ok:true,duration:g.duration});
  });
  socket.on("host:draw", ({code,hostKey},cb) => {
    const g=games.get(String(code||""));
    if(!g || g.hostKey!==hostKey) return cb({ok:false,error:"Autorizzazione non valida"});
    if(!startDraw(g)) return cb({ok:false,error:"Attendi la conclusione dell'estrazione precedente"});
    cb({ok:true});
  });
  socket.on("host:finish", ({code,hostKey},cb) => {
    const g=games.get(String(code||""));
    if(!g || g.hostKey!==hostKey) return cb({ok:false,error:"Autorizzazione non valida"});
    if(g.timer) clearInterval(g.timer);
    if(g.status==="suspense") finishDraw(g);
    g.status="finished"; emitState(g); cb({ok:true});
  });
  socket.on("disconnect",()=>{ for(const g of games.values()) for(const p of g.players.values()) if(p.socketId===socket.id) p.socketId=null; });
});

server.listen(PORT,"0.0.0.0",()=>console.log("Tombola Cazzara live server on "+PORT));
