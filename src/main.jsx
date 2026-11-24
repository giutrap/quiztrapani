import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';
import { createRoot } from 'react-dom/client';
import { GraduationCap, Sparkles, Trophy, Users, Clock3, BookOpen, ShieldCheck, ArrowLeft, ArrowRight, Play, Plus, Pencil, LogIn, Gamepad2, Star, Zap, CheckCircle2, XCircle, Crown } from 'lucide-react';
import './styles.css';

const quiz = {
  questions: [
    { question: 'Quale testo è considerato sacro nell’ebraismo?', answers: ['La Torah', 'I Veda', 'Il Tripitaka', 'Il Corano'], correct: 0, explanation: 'La Torah è il nucleo fondamentale della tradizione scritta ebraica.' },
    { question: 'In quale città si trova la Basilica di San Pietro?', answers: ['Gerusalemme', 'Città del Vaticano', 'Assisi', 'Atene'], correct: 1, explanation: 'La Basilica di San Pietro si trova nello Stato della Città del Vaticano.' },
    { question: 'Che cosa indica il termine “monoteismo”?', answers: ['La fede in molti dèi', 'Il rifiuto di ogni religione', 'La fede in un solo Dio', 'Il culto degli antenati'], correct: 2, explanation: 'Le religioni monoteiste professano la fede in un unico Dio.' },
    { question: 'Quale figura è centrale nella tradizione del buddhismo?', answers: ['Confucio', 'Siddharta Gautama', 'Abramo', 'Mosè'], correct: 1, explanation: 'Siddharta Gautama è il Buddha storico, fondatore del buddhismo.' },
    { question: 'Quale festa cristiana celebra la risurrezione di Gesù?', answers: ['Natale', 'Pentecoste', 'Epifania', 'Pasqua'], correct: 3, explanation: 'La Pasqua celebra la risurrezione di Gesù, centro della fede cristiana.' }
  ]
};
const christmasDemo = {
  id: 'demo-natale-10',
  title: 'Natale in 10 domande',
  area: 'biennio',
  className: '1ª–2ª',
  topic: 'Musica, cibo, Bibbia, curiosità e tradizioni nel mondo',
  standardPoints: 1000,
  plusPoints: 1500,
  wrongPenalty: 200,
  isDemo: true,
  questions: [
    { text: 'In quale Paese fu eseguito per la prima volta il canto natalizio “Stille Nacht”, conosciuto in Italia come “Astro del ciel”?', options: ['Germania', 'Austria', 'Italia', 'Francia'], correct: 1, kind: 'standard', seconds: 20, explanation: '“Stille Nacht” fu eseguito per la prima volta nel 1818 a Oberndorf, vicino a Salisburgo, in Austria.' },
    { text: 'Chi compose il canto “Tu scendi dalle stelle”?', options: ['Giuseppe Verdi', 'Franz Schubert', 'Alfonso Maria de’ Liguori', 'Gioachino Rossini'], correct: 2, kind: 'plus', seconds: 20, explanation: 'Il canto fu composto da sant’Alfonso Maria de’ Liguori nel Settecento; è uno dei brani natalizi più conosciuti in Italia.' },
    { text: 'Quale dolce natalizio è tradizionalmente associato alla città di Milano?', options: ['Panettone', 'Pandoro', 'Struffoli', 'Panforte'], correct: 0, kind: 'standard', seconds: 15, explanation: 'Il panettone è il dolce milanese per eccellenza; il pandoro è invece legato alla tradizione veronese.' },
    { text: 'Secondo i Vangeli di Matteo e Luca, in quale luogo nacque Gesù?', options: ['Nazaret', 'Gerusalemme', 'Cafarnao', 'Betlemme'], correct: 3, kind: 'standard', seconds: 15, explanation: 'I racconti della nascita nei Vangeli di Matteo e Luca collocano la nascita di Gesù a Betlemme.' },
    { text: 'Quanti erano i Magi che, secondo il Vangelo di Matteo, arrivarono dall’Oriente?', options: ['Tre, come dice esplicitamente il Vangelo', 'Il Vangelo non precisa il numero', 'Due', 'Dodici'], correct: 1, kind: 'plus', seconds: 25, explanation: 'Matteo parla di Magi al plurale, ma non dice quanti fossero. Il numero tre si è affermato nella tradizione, anche in relazione ai tre doni.' },
    { text: 'Quale dolce britannico, ricco di frutta secca e spezie, viene spesso servito a Natale?', options: ['Macarons', 'Tiramisù', 'Christmas pudding', 'Baklava'], correct: 2, kind: 'standard', seconds: 20, explanation: 'Il Christmas pudding è un dolce tradizionale britannico, preparato con frutta secca, spezie e altri ingredienti.' },
    { text: 'In Messico, che cosa rappresentano le “Las Posadas”, celebrate nei giorni prima di Natale?', options: ['Il viaggio di Maria e Giuseppe in cerca di alloggio', 'La visita dei Re Magi', 'La fuga in Egitto', 'La nascita di san Giovanni Battista'], correct: 0, kind: 'standard', seconds: 25, explanation: 'Le Posadas, celebrate dal 16 al 24 dicembre, rievocano la ricerca di un alloggio da parte di Maria e Giuseppe.' },
    { text: 'Quale tradizione natalizia è diventata particolarmente popolare in Giappone grazie a una campagna pubblicitaria degli anni Settanta?', options: ['Mangiare panettone', 'Decorare le case con rami d’ulivo', 'Scambiarsi calze di lana', 'Ordinare pollo fritto da KFC'], correct: 3, kind: 'plus', seconds: 25, explanation: 'In Giappone il pollo fritto di KFC è diventato un pasto natalizio popolare dopo una campagna commerciale lanciata nel 1974.' },
    { text: 'Chi sono gli “Yule Lads”, personaggi del folklore natalizio islandese?', options: ['Dodici elfi che vivono nei boschi', 'Tredici personaggi dispettosi che visitano i bambini', 'Tre re provenienti dall’Oriente', 'Cantori che girano per i villaggi'], correct: 1, kind: 'standard', seconds: 25, explanation: 'Nella tradizione islandese gli Yule Lads sono tredici personaggi folkloristici che arrivano uno alla volta nei giorni prima di Natale.' },
    { text: 'In Italia, in quale giorno arriva tradizionalmente la Befana?', options: ['25 dicembre', '31 dicembre', '6 gennaio', '2 febbraio'], correct: 2, kind: 'standard', seconds: 15, explanation: 'La Befana arriva nella notte tra il 5 e il 6 gennaio, in occasione dell’Epifania.' }
  ]
};

const colors = ['answer-red','answer-blue','answer-yellow','answer-green','answer-purple'];
const letters = ['A','B','C','D','E'];

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);\n\nfunction App() {
  const [screen,setScreen] = useState('home');
  const [nickname,setNickname] = useState('');
  const [code,setCode] = useState('');
  const [area,setArea] = useState('biennio');
  const [q,setQ] = useState(0);
  const [answer,setAnswer] = useState(null);
  const [score,setScore] = useState(0);
  const [activeQuiz,setActiveQuiz] = useState({title:'Quiz dimostrativo IRC',questions:quiz.questions,standardPoints:1000,plusPoints:1500,wrongPenalty:0,area:'biennio'});
  const [correctCount,setCorrectCount] = useState(0);
  const [liveSocket,setLiveSocket] = useState(null);
  const [liveState,setLiveState] = useState(null);
  const [liveError,setLiveError] = useState('');
  const [liveNow,setLiveNow] = useState(Date.now());
  const [studentSelected,setStudentSelected] = useState(null);
  useEffect(()=>{const timer=setInterval(()=>setLiveNow(Date.now()),200);return()=>clearInterval(timer);},[]);
  const realtimeUrl='https://quiz-scolastico-live.onrender.com';
  const watchSocket = socket => {socket.on('game:state',state=>{setLiveState(previous=>{if(previous?.questionIndex!==state.questionIndex)setStudentSelected(null);return state;});});socket.on('game:closed',()=>{setLiveError('La connessione del docente è terminata.');setScreen('home');});socket.on('connect_error',()=>setLiveError('Server della partita non raggiungibile. Riprova tra qualche secondo.'));};
  const hostQuiz = item => {setLiveError('Connessione alla console docente...');const socket=io(realtimeUrl);setLiveSocket(socket);watchSocket(socket);socket.on('connect',()=>socket.emit('host:create',{quiz:{title:item.title,area:item.area,standardPoints:item.standardPoints,plusPoints:item.plusPoints,wrongPenalty:item.wrongPenalty,questions:item.questions.map(q=>({question:q.text,answers:q.options,correct:q.correct,kind:q.kind||'standard',seconds:q.seconds||20,explanation:q.explanation||''}))}},response=>{if(!response?.ok){setLiveError(response?.error||'Impossibile creare la partita.');return;}setCode(response.code);setLiveState(response.state);setLiveError('');setScreen('host');}));};
  const joinLiveGame = () => {setLiveError('Connessione alla partita...');const socket=io(realtimeUrl);setLiveSocket(socket);watchSocket(socket);socket.on('connect',()=>socket.emit('student:join',{code,nickname},response=>{if(!response?.ok){setLiveError(response?.error||'Impossibile entrare nella partita.');socket.disconnect();return;}setLiveState(response.state);setLiveError('');setStudentSelected(null);setScreen('student-live');}));};
  const hostAction = action => liveSocket?.emit(action,response=>{if(response?.error)setLiveError(response.error);});
  const sendStudentAnswer = index => {if(studentSelected!==null)return;setStudentSelected(index);liveSocket?.emit('student:answer',{answer:index},response=>{if(!response?.ok){setLiveError(response?.error||'Risposta non inviata.');setStudentSelected(null);}});};
  const liveRemaining = liveState ? (liveState.paused ? liveState.remainingMs : liveState.deadline ? Math.max(0,liveState.deadline-liveNow) : liveState.remainingMs) : 0;
  const [teacherEmail,setTeacherEmail] = useState('');
  const [teacherPass,setTeacherPass] = useState('');
  const [teacherUser,setTeacherUser] = useState(null);
  const [teacherSession,setTeacherSession] = useState(null);
  const [teacherBusy,setTeacherBusy] = useState(false);
  const [teacherMessage,setTeacherMessage] = useState('');
  const [title,setTitle] = useState('');
  const [question,setQuestion] = useState('');
  const [savedQuizzes,setSavedQuizzes] = useState(()=>{try{const stored=JSON.parse(localStorage.getItem('quiz-scolastico-quizzes')||'[]');if(!stored.some(item=>item.id===christmasDemo.id)){const next=[christmasDemo,...stored];localStorage.setItem('quiz-scolastico-quizzes',JSON.stringify(next));return next;}return stored;}catch{localStorage.setItem('quiz-scolastico-quizzes',JSON.stringify([christmasDemo]));return [christmasDemo];}});

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setTeacherSession(data.session);
      setTeacherUser(data.session?.user || null);
      if (data.session) loadRemoteQuizzes(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setTeacherSession(session);
      setTeacherUser(session?.user || null);
      if (session) loadRemoteQuizzes(session);
      else setSavedQuizzes([]);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);
  const loadRemoteQuizzes = async session => {
    try {
      const response = await fetch(realtimeUrl + '/api/quizzes', { headers: { Authorization: 'Bearer ' + session.access_token } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Errore caricamento archivio.');
      setSavedQuizzes((data.quizzes || []).map(row => ({
        id: row.id, title: row.title, area: row.school_level || 'biennio', className: row.settings?.className || '',
        topic: row.topic || '', standardPoints: row.settings?.standardPoints ?? 1000,
        plusPoints: row.settings?.plusPoints ?? 1500, wrongPenalty: row.settings?.wrongPenalty ?? 0,
        questions: (row.questions || []).map((item,index) => ({...item,id:item.id || index+1,text:item.text || item.question || '',options:item.options || item.answers || [],correct:item.correct,kind:item.kind || 'standard',seconds:item.seconds || 20,explanation:item.explanation || ''}))
      })));
    } catch (error) { setTeacherMessage(error.message); }
  };
  const teacherLogin = async () => {
    setTeacherBusy(true); setTeacherMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: teacherEmail.trim(), password: teacherPass });
    setTeacherBusy(false);
    if (error) { setTeacherMessage('Accesso non riuscito: controlla email e password.'); return; }
    setTeacherSession(data.session); setTeacherUser(data.user);
    await loadRemoteQuizzes(data.session);
  };
  const teacherLogout = async () => { await supabase.auth.signOut(); setTeacherSession(null); setTeacherUser(null); setSavedQuizzes([]); setTeacherPass(''); };

  const [quizArea,setQuizArea] = useState('biennio');
  const [quizClass,setQuizClass] = useState('1ª');
  const [quizTopic,setQuizTopic] = useState('');
  const [standardPoints,setStandardPoints] = useState(1000);
  const [plusPoints,setPlusPoints] = useState(1500);
  const [wrongPenalty,setWrongPenalty] = useState(0);
  const [draftQuestions,setDraftQuestions] = useState([{id:1,text:'',options:['','','',''],correct:null,kind:'standard',seconds:20,explanation:''}]);
  const current = activeQuiz.questions[q];
  const updateDraft = (index,patch) => setDraftQuestions(items=>items.map((item,i)=>i===index?{...item,...patch}:item));
  const updateOption = (index,optionIndex,value) => setDraftQuestions(items=>items.map((item,i)=>i===index?{...item,options:item.options.map((option,j)=>j===optionIndex?value:option)}:item));
  const changeOptionCount = (index,count) => setDraftQuestions(items=>items.map((item,i)=>i===index?{...item,options:Array.from({length:count},(_,j)=>item.options[j]||''),correct:item.correct===null?null:Math.min(item.correct,count-1)}:item));
  const addDraftQuestion = () => {if(draftQuestions.length<50)setDraftQuestions(items=>[...items,{id:Date.now(),text:'',options:['','','',''],correct:null,kind:'standard',seconds:20,explanation:''}])};
  const saveDraftQuiz = async () => {
    const cleanQuestions=draftQuestions.map((item,index)=>({...item,number:index+1,options:item.options.map(v=>v.trim())}));
    if(!teacherSession || !title.trim() || !cleanQuestions.length || cleanQuestions.some(item=>!item.text.trim()||item.options.length<2||item.options.some(v=>!v)||item.correct===null)) return;
    setTeacherBusy(true); setTeacherMessage('');
    try {
      const response=await fetch(realtimeUrl+'/api/quizzes',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+teacherSession.access_token},body:JSON.stringify({title:title.trim(),subject:'IRC',school_level:quizArea,topic:quizTopic.trim(),questions:cleanQuestions,settings:{className:quizClass,standardPoints:Number(standardPoints),plusPoints:Number(plusPoints),wrongPenalty:Number(wrongPenalty)}})});
      const data=await response.json(); if(!response.ok) throw new Error(data.error||'Salvataggio non riuscito.');
      await loadRemoteQuizzes(teacherSession);
      setTitle('');setQuizTopic('');setQuizArea('biennio');setQuizClass('1ª');setDraftQuestions([{id:Date.now(),text:'',options:['','','',''],correct:0,kind:'standard',seconds:20,explanation:''}]);setScreen('teacher');
    } catch(error) { setTeacherMessage(error.message); }
    finally { setTeacherBusy(false); }
  };
  const start = (a) => { setActiveQuiz({title:'Quiz dimostrativo IRC',questions:quiz.questions.map(item=>({...item,kind:'standard',seconds:20})),standardPoints:1000,plusPoints:1500,wrongPenalty:0,area:a});setArea(a);setQ(0);setAnswer(null);setScore(0);setCorrectCount(0);setScreen('game'); };
  const startSavedQuiz = (item) => {setActiveQuiz({...item,questions:item.questions.map(question=>({question:question.text,answers:question.options,correct:question.correct,explanation:question.explanation||'',kind:question.kind||'standard',seconds:question.seconds||20}))});setArea(item.area);setQ(0);setAnswer(null);setScore(0);setCorrectCount(0);setScreen('game');};
  const next = () => { if (q === activeQuiz.questions.length-1) setScreen('results'); else {setQ(q+1);setAnswer(null);} };
  const Header = () => <header className="topbar"><button className="brand" onClick={()=>setScreen('home')}><span className="brand-mark"><GraduationCap size={22}/></span><span>quiz<span className="brand-light"> scolastico</span></span></button><span className="topbar-note"><Sparkles size={15}/> IMPARA, GIOCA, SFIDA TE STESSO</span></header>;
  return <div className="app-shell"><Header/>
    {screen==='home' && <main className="home-page">
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><i className="eyebrow-dot"/> LA TUA AULA, UNA NUOVA SFIDA</div><h1>Le idee migliori<br/><span>si mettono in gioco.</span></h1><p className="hero-lead">Quiz, sfide e conoscenze da condividere. Entra in partita, scegli la tua squadra e conquista il podio.</p><div className="hero-actions"><button className="btn btn-primary btn-large" onClick={()=>setScreen('join')}><LogIn size={19}/> Partecipa a una partita</button><button className="btn btn-ghost btn-large" onClick={()=>setScreen('teacher')}><ShieldCheck size={18}/> Area docente</button></div><div className="hero-proof"><span><Users size={16}/> Gioca con la classe</span><span><Zap size={16}/> Rispondi in tempo</span><span><Trophy size={16}/> Scala la classifica</span></div></div>
      <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="quiz-card"><div className="quiz-card-top"><span className="live-pill"><i/> LIVE QUIZ</span><span>•••</span></div><div className="quiz-card-icon"><Gamepad2 size={38}/></div><div className="quiz-card-title">La sfida<br/>comincia qui.</div><div className="mini-answers"><i className="mini red"/><i className="mini blue"/><i className="mini yellow"/><i className="mini green"/></div><div className="card-bottom"><span>5 DOMANDE</span><span>20 SEC.</span><span>1000 PUNTI</span></div></div><div className="float-badge badge-star"><Star size={21} fill="currentColor"/></div><div className="float-badge badge-trophy"><Trophy size={24}/></div><div className="float-score"><b>+1000</b><small>OTTIMO!</small></div></div></section>
      <section className="choice-section"><div className="section-heading"><div><span className="eyebrow">SCEGLI IL TUO PERCORSO</span><h2>Pronto a giocare?</h2></div><span className="section-side-note">Due percorsi, tante nuove sfide.</span></div><div className="path-grid"><button className="path-card path-biennio" onClick={()=>start('biennio')}><span className="path-icon"><BookOpen size={25}/></span><span className="path-tag">CLASSI 1ª – 2ª</span><strong>Biennio</strong><span className="path-description">Le basi da conoscere, le domande da esplorare.</span><span className="path-link">Scopri il percorso <ArrowRight size={17}/></span></button><button className="path-card path-triennio" onClick={()=>start('triennio')}><span className="path-icon"><GraduationCap size={25}/></span><span className="path-tag">CLASSI 3ª – 5ª</span><strong>Triennio</strong><span className="path-description">Idee, pensiero critico e grandi questioni.</span><span className="path-link">Scopri il percorso <ArrowRight size={17}/></span></button></div></section>
      <footer className="home-footer"><span>QUIZ SCOLASTICO · UNO SPAZIO PER IMPARARE INSIEME</span><span>FATTO PER LA CLASSE <Sparkles size={13}/></span></footer>
    </main>}
    {screen==='join' && <main className="center-page"><div className="join-card"><button className="back-link" onClick={()=>setScreen('home')}><ArrowLeft size={16}/> Torna alla home</button><div className="join-icon"><Gamepad2 size={30}/></div><span className="eyebrow">SEI NEL POSTO GIUSTO</span><h1>Entra in partita.</h1><p>Inserisci il codice che vedi sulla LIM e scegli il tuo nickname.</p><label>CODICE PARTITA</label><input className="field code-field" value={code} onChange={e=>setCode(e.target.value)} placeholder="000 000" maxLength={7}/><label>IL TUO NICKNAME</label><input className="field" value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Come ti chiami nel gioco?" maxLength={18}/><button className="btn btn-primary btn-full" disabled={!nickname.trim() || code.replace(/\D/g,'').length<6} onClick={joinLiveGame}>Entra <ArrowRight size={18}/></button>{liveError&&<div className="demo-notice">{liveError}</div>}<div className="privacy-note"><ShieldCheck size={15}/> Non serve creare un account.</div></div></main>}
    

    {screen==='host' && liveState && <main className="live-page"><div className="live-head"><div><span className="eyebrow">CONSOLE DOCENTE · PARTITA LIVE</span><h1>{liveState.title}</h1><p>Codice da mostrare alla classe</p><div className="live-code">{liveState.code}</div></div><div className="live-status"><span className="live-dot"/> {liveState.status==='lobby'?'IN ATTESA':liveState.status==='question'?'DOMANDA IN CORSO':liveState.status==='reveal'?'RISPOSTA SVELATA':'PARTITA CONCLUSA'}</div></div>
      <section className="live-panel"><div className="live-panel-head"><h2>Partecipanti</h2><strong>{liveState.players.length}</strong></div>{liveState.players.length===0?<p className="section-help">In attesa che gli studenti entrino con il codice partita.</p>:<div className="player-list">{liveState.players.map(p=><span key={p.id} className="player-chip"><Users size={14}/>{p.nickname}</span>)}</div>}</section>
      {liveState.status==='lobby'&&<section className="live-panel live-center"><h2>La classe è pronta?</h2><p>Quando gli studenti sono entrati, avvia la prima domanda. Il conto alla rovescia partirà per tutti insieme.</p><button className="btn btn-primary btn-large" disabled={!liveState.players.length} onClick={()=>hostAction('host:start')}><Play size={18}/> Avvia domanda 1</button></section>}
      {liveState.status==='question'&&<section className="live-panel"><div className="live-panel-head"><h2>Domanda {liveState.questionIndex+1} / {liveState.totalQuestions}</h2><div className="live-clock">{liveState.paused?'IN PAUSA':Math.ceil(liveRemaining/1000)+' SEC'}</div></div><h2 className="live-question">{liveState.question?.question}</h2><div className="live-options">{liveState.question?.answers.map((a,i)=><div className={'live-option '+colors[i]} key={i}><b>{letters[i]}</b>{a}</div>)}</div><p className="section-help">{liveState.answerCount} studenti su {liveState.players.length} hanno risposto.</p><div className="live-controls">{liveState.paused?<button className="btn btn-primary" onClick={()=>hostAction('host:resume')}><Play size={17}/> Riprendi</button>:<button className="btn btn-ghost" onClick={()=>hostAction('host:pause')}>Pausa timer</button>}<button className="btn btn-primary" onClick={()=>hostAction('host:close')}>Chiudi risposte</button></div></section>}
      {liveState.status==='reveal'&&<section className="live-panel"><span className="eyebrow">RISPOSTA CORRETTA</span><h2 className="live-question">{liveState.questionIndex+1}. {liveState.question?.question}</h2><div className="live-options">{liveState.question?.answers.map((a,i)=><div className={'live-option '+(i===liveState.reveal?.correct?'is-correct-live':'')} key={i}><b>{letters[i]}</b>{a}{i===liveState.reveal?.correct?' ✓':''}</div>)}</div>{liveState.reveal?.explanation&&<p className="score-note">{liveState.reveal.explanation}</p>}<div className="live-panel-head"><h2>Classifica provvisoria</h2></div><div className="leaderboard">{[...liveState.players].sort((a,b)=>b.score-a.score).map((p,i)=><div key={p.id}><b>{i+1}. {p.nickname}</b><strong>{p.score} pt</strong></div>)}</div><button className="btn btn-primary btn-large" onClick={()=>hostAction('host:next')}>{liveState.questionIndex===liveState.totalQuestions-1?'Concludi partita':'Prossima domanda'} <ArrowRight size={17}/></button></section>}
      {liveState.status==='finished'&&<section className="live-panel live-center"><Trophy size={38}/><h2>Partita completata!</h2><div className="leaderboard">{[...liveState.players].sort((a,b)=>b.score-a.score).map((p,i)=><div key={p.id}><b>{i+1}. {p.nickname}</b><strong>{p.score} pt</strong></div>)}</div><button className="btn btn-primary" onClick={()=>{liveSocket?.disconnect();setLiveSocket(null);setLiveState(null);setScreen('teacher');}}>Torna alla libreria</button></section>}
      {liveError&&<div className="demo-notice">{liveError}</div>}</main>}
    {screen==='student-live' && liveState && <main className="live-page student-live-page"><div className="student-live-top"><span className="brand-mark"><GraduationCap size={19}/></span><b>QUIZ SCOLASTICO</b><span>{nickname}</span></div>
      {liveState.status==='lobby'&&<section className="live-panel live-center"><Users size={34}/><h1>Sei nella sala d'attesa!</h1><p>Hai effettuato l'accesso alla partita. Attendi che il docente avvii il quiz.</p><div className="live-code">{liveState.code}</div><small>{liveState.players.length} partecipanti collegati</small></section>}
      {liveState.status==='question'&&<section className="live-panel"><div className="student-question-meta"><span>DOMANDA {liveState.questionIndex+1}/{liveState.totalQuestions}</span><strong>{liveState.paused?'IN PAUSA':Math.ceil(liveRemaining/1000)+' SEC'}</strong></div><h1 className="live-question">{liveState.question?.question}</h1><div className="student-options">{liveState.question?.answers.map((a,i)=><button key={i} disabled={studentSelected!==null||liveState.paused} onClick={()=>sendStudentAnswer(i)} className={'student-option '+colors[i]+' '+(studentSelected===i?'student-picked':'')}><b>{letters[i]}</b>{a}</button>)}</div>{studentSelected!==null&&<p className="student-wait">Risposta registrata. Attendi il docente…</p>}</section>}
      {liveState.status==='reveal'&&<section className="live-panel live-center"><Trophy size={34}/><h2>Risposta corretta!</h2><p>{liveState.question?.answers[liveState.reveal?.correct]}</p>{liveState.reveal?.explanation&&<p>{liveState.reveal.explanation}</p>}<p>Il docente sta preparando la prossima domanda.</p></section>}
      {liveState.status==='finished'&&<section className="live-panel live-center"><Crown size={38}/><h1>Partita completata!</h1><p>Il tuo punteggio: <b>{liveState.players.find(p=>p.nickname===nickname)?.score??0} punti</b></p></section>}
      {liveError&&<div className="demo-notice">{liveError}</div>}</main>}
    {screen==='game' && <main className="game-page"><div className="game-top"><span className="game-brand"><span className="brand-mark"><GraduationCap size={19}/></span> QUIZ SCOLASTICO</span><span className="game-counter">DOMANDA {q+1} <i>/</i> {activeQuiz.questions.length}</span><span className="game-score"><Trophy size={17}/> {score.toLocaleString('it-IT')} PT</span></div><div className="progress-track"><div className="progress-fill" style={{width:((q+(answer!==null?1:0))/activeQuiz.questions.length*100)+'%'}}/></div><div className="game-meta"><span>{area.toUpperCase()} · IRC</span><span className="timer"><Clock3 size={16}/> 00:20</span></div><section className="question-panel"><span className="question-label">METTI ALLA PROVA LE TUE CONOSCENZE</span><h1>{current.question}</h1></section><div className="answer-grid">{current.answers.map((text,i)=><button key={text} disabled={answer!==null} onClick={()=>{setAnswer(i);if(i===current.correct){setCorrectCount(n=>n+1);setScore(s=>s+(current.kind==='plus'?activeQuiz.plusPoints:activeQuiz.standardPoints));}else{setScore(s=>s-activeQuiz.wrongPenalty);}}} className={'answer-tile '+colors[i]+' '+(answer!==null&&i===current.correct?'is-correct':'')+' '+(answer===i&&i!==current.correct?'is-wrong':'')}><span className="answer-letter">{letters[i]}</span><span>{text}</span>{answer!==null&&i===current.correct&&<CheckCircle2 className="answer-check"/>}{answer===i&&i!==current.correct&&<XCircle className="answer-check"/>}</button>)}</div>{answer!==null?<div className={'feedback-bar '+(answer===current.correct?'feedback-correct':'feedback-wrong')}><strong>{answer===current.correct?`Esatto! +${current.kind==='plus'?activeQuiz.plusPoints:activeQuiz.standardPoints} punti`:`Risposta non corretta. ${activeQuiz.wrongPenalty?`-${activeQuiz.wrongPenalty} punti`:''}`}</strong><span>{current.explanation}</span><button onClick={next}>{q===activeQuiz.questions.length-1?'Vedi i risultati':'Prossima domanda'} <ArrowRight size={16}/></button></div>:<p className="answer-hint">Scegli una risposta. Il tempo scorre!</p>}</main>}
    {screen==='results' && <main className="center-page"><div className="join-card results-card"><div className="podium-icon"><Crown size={38}/></div><span className="eyebrow">PARTITA COMPLETATA</span><h1>Ben fatto, {nickname||'campione'}!</h1><p>Hai concluso «{activeQuiz.title}».</p><div className="score-big">{score.toLocaleString('it-IT')}<small> PUNTI</small></div><div className="result-stats"><div><strong>{activeQuiz.questions.length}</strong><span>DOMANDE</span></div><div><strong>{correctCount}</strong><span>RISPOSTE ESATTE</span></div><div><strong>{Math.round(correctCount/activeQuiz.questions.length*100)}%</strong><span>PUNTEGGIO</span></div></div><button className="btn btn-primary btn-full" onClick={()=>setScreen('home')}>Torna alla home <ArrowRight size={17}/></button></div></main>}
    {screen==='teacher' && <main className="center-page"><div className="join-card teacher-card"><button className="back-link" onClick={()=>setScreen('home')}><ArrowLeft size={16}/> Torna alla home</button><div className="join-icon"><ShieldCheck size={30}/></div><span className="eyebrow">SPAZIO RISERVATO</span><h1>Area docente.</h1><p>Accedi con le credenziali docente per aprire la tua libreria personale, sincronizzata online.</p>{!teacherUser?<><label>EMAIL DOCENTE</label><input type="email" className="field" value={teacherEmail} onChange={e=>setTeacherEmail(e.target.value)} placeholder="nome@scuola.it"/><label>PASSWORD</label><input type="password" className="field" value={teacherPass} onChange={e=>setTeacherPass(e.target.value)} placeholder="Password"/><button className="btn btn-primary btn-full" disabled={!teacherEmail.trim()||!teacherPass||teacherBusy} onClick={teacherLogin}>{teacherBusy?'Accesso in corso…':'Accedi' } <ArrowRight size={17}/></button>{teacherMessage&&<div className="demo-notice">{teacherMessage}</div>}</>:<div className="teacher-dashboard"><div className="dashboard-head"><div><span className="eyebrow">DOCENTE AUTENTICATO</span><small>{teacherUser.email}</small></div><button className="btn btn-ghost" onClick={teacherLogout}>Esci</button></div><div className="dashboard-head"><div><span className="eyebrow">LA TUA LIBRERIA</span><h2>I tuoi quiz</h2></div><button className="btn btn-primary" onClick={()=>setScreen('editor')}><Plus size={17}/> Nuovo quiz</button></div>{savedQuizzes.length===0?<div className="empty-library">Non hai ancora salvato quiz personali. Crea la tua prima sfida con «Nuovo quiz».</div>:savedQuizzes.map(item=><div className="quiz-row" key={item.id}><BookOpen size={22}/><div><b>{item.title}</b><small>{item.area.toUpperCase()} · {item.className} · {item.questions.length} DOMANDE</small><small>{item.standardPoints} PT STANDARD · {item.plusPoints} PT PLUS · −{item.wrongPenalty} PT ERRORE</small></div><button className="icon-btn" title="Avvia partita live" onClick={()=>hostQuiz(item)}><Play size={17}/></button></div>)}<div className="demo-notice">Archivio online sincronizzato con il tuo account docente.</div></div>}</div></main>}
    {screen==='editor' && <main className="editor-page"><div className="editor-wrap"><button className="back-link" onClick={()=>setScreen('teacher')}><ArrowLeft size={16}/> Area docente</button><div className="editor-heading"><div className="join-icon"><Pencil size={27}/></div><span className="eyebrow">CREAZIONE QUIZ</span><h1>Costruisci la tua sfida.</h1><p>Fino a 50 domande; ogni domanda può avere da 2 a 5 opzioni.</p></div>
      <section className="editor-section"><h2>Informazioni generali</h2><div className="editor-grid"><div className="editor-field wide"><label>TITOLO DEL QUIZ</label><input className="field" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Es. Le religioni monoteiste"/></div><div className="editor-field"><label>PERCORSO</label><select className="field" value={quizArea} onChange={e=>setQuizArea(e.target.value)}><option value="biennio">Biennio</option><option value="triennio">Triennio</option></select></div><div className="editor-field"><label>CLASSE</label><select className="field" value={quizClass} onChange={e=>setQuizClass(e.target.value)}>{(quizArea==='biennio'?['1ª','2ª']:['3ª','4ª','5ª']).map(v=><option key={v}>{v}</option>)}</select></div><div className="editor-field wide"><label>ARGOMENTO (FACOLTATIVO)</label><input className="field" value={quizTopic} onChange={e=>setQuizTopic(e.target.value)} placeholder="Es. Bibbia, cristianesimo, etica..."/></div></div></section>
      <section className="editor-section"><h2>Regole del punteggio</h2><p className="section-help">Imposta i valori che verranno applicati durante la partita.</p><div className="score-settings"><div><label>PUNTEGGIO STANDARD</label><input className="field" type="number" min="0" step="50" value={standardPoints} onChange={e=>setStandardPoints(e.target.value)}/></div><div><label>PUNTEGGIO PLUS</label><input className="field" type="number" min="0" step="50" value={plusPoints} onChange={e=>setPlusPoints(e.target.value)}/></div><div><label>PENALITÀ ERRORE</label><input className="field" type="number" min="0" step="50" value={wrongPenalty} onChange={e=>setWrongPenalty(e.target.value)}/></div></div><p className="score-note">Le domande marcate PLUS assegnano il punteggio maggiorato; una risposta sbagliata sottrae la penalità impostata. Una risposta non data vale 0 punti.</p></section>
      <section className="editor-section"><div className="questions-heading"><div><h2>Domande <span className="question-count">{draftQuestions.length}/50</span></h2><p className="section-help">Per ogni domanda scegli il numero di opzioni, la risposta esatta e il valore.</p></div><button className="btn btn-primary" disabled={draftQuestions.length>=50} onClick={addDraftQuestion}><Plus size={17}/> Aggiungi domanda</button></div>
      {draftQuestions.map((item,index)=><article className="question-editor" key={item.id}><div className="question-editor-top"><strong>DOMANDA {index+1}</strong><div className="question-tools"><label>OPZIONI</label><select className="compact-select" value={item.options.length} onChange={e=>changeOptionCount(index,Number(e.target.value))}>{[2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select><label>VALORE</label><select className="compact-select" value={item.kind} onChange={e=>updateDraft(index,{kind:e.target.value})}><option value="standard">Standard</option><option value="plus">Plus</option></select></div></div>
      <label>TESTO DELLA DOMANDA</label><textarea className="field textarea question-input" value={item.text} onChange={e=>updateDraft(index,{text:e.target.value})} placeholder="Scrivi qui la domanda..."/>
      <div className="options-editor">{item.options.map((option,optionIndex)=><div className="option-editor" key={optionIndex}><span className="option-index">{['A','B','C','D','E'][optionIndex]}</span><input className="field" value={option} onChange={e=>updateOption(index,optionIndex,e.target.value)} placeholder={'Opzione '+['A','B','C','D','E'][optionIndex]}/><label className="correct-choice"><input type="radio" name={'correct-'+item.id} checked={item.correct===optionIndex} onChange={()=>updateDraft(index,{correct:optionIndex})}/> Corretta</label></div>)}</div>
      <div className="editor-grid question-extra"><div className="editor-field"><label>TEMPO (SECONDI)</label><select className="field" value={item.seconds} onChange={e=>updateDraft(index,{seconds:Number(e.target.value)})}>{[10,15,20,30,45,60,90,120].map(n=><option key={n} value={n}>{n} secondi</option>)}</select></div><div className="editor-field wide"><label>SPIEGAZIONE DELLA RISPOSTA (FACOLTATIVA)</label><textarea className="field explanation-input" value={item.explanation} onChange={e=>updateDraft(index,{explanation:e.target.value})} placeholder="Facoltativa: aggiungi una breve spiegazione didattica... "/></div></div>
      {draftQuestions.length>1&&<button className="remove-question" onClick={()=>setDraftQuestions(items=>items.filter((_,i)=>i!==index))}>Rimuovi questa domanda</button>}</article>)}</section>
      <div className="editor-actions"><span>{draftQuestions.length} di 50 domande</span><button className="btn btn-primary btn-large" disabled={!teacherSession||teacherBusy||!title.trim()||draftQuestions.some(item=>!item.text.trim()||item.options.some(v=>!v.trim()))||Number(standardPoints)<0||Number(plusPoints)<0||Number(wrongPenalty)<0} onClick={saveDraftQuiz}>Salva quiz <CheckCircle2 size={17}/></button></div>
      {teacherMessage&&<div className="demo-notice">{teacherMessage}</div>}</div></main>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);