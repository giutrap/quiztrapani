import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const games = new Map();
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '2mb' }));

async function authenticatedUser(req, res, next) {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database non configurato sul server.' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Autenticazione richiesta.' });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Sessione docente non valida.' });
  req.teacher = data.user;
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, supabaseConfigured: Boolean(supabaseAdmin) }));

app.get('/api/quizzes', authenticatedUser, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('quizzes').select('*').eq('owner_id', req.teacher.id).order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Impossibile caricare i quiz.' });
  res.json({ quizzes: data || [] });
});

app.post('/api/quizzes', authenticatedUser, async (req, res) => {
  const body = req.body || {};
  if (!body.title?.trim() || !Array.isArray(body.questions) || !body.questions.length || body.questions.length > 50) {
    return res.status(400).json({ error: 'Dati del quiz non validi.' });
  }
  const row = {
    owner_id: req.teacher.id,
    title: String(body.title).trim().slice(0, 180),
    subject: String(body.subject || 'IRC').slice(0, 80),
    school_level: String(body.school_level || '').slice(0, 80),
    topic: String(body.topic || '').slice(0, 240),
    questions: body.questions,
    settings: body.settings || {}
  };
  const { data, error } = await supabaseAdmin.from('quizzes').insert(row).select('*').single();
  if (error) { console.error('Supabase quiz insert failed:', error); return res.status(500).json({ error: 'Salvataggio quiz non riuscito.', code: error.code || null, details: error.message || null }); }
  res.status(201).json({ quiz: data });
});

app.delete('/api/quizzes/:id', authenticatedUser, async (req, res) => {
  const { error } = await supabaseAdmin.from('quizzes').delete().eq('id', req.params.id).eq('owner_id', req.teacher.id);
  if (error) return res.status(500).json({ error: 'Eliminazione quiz non riuscita.' });
  res.json({ ok: true });
});

app.get('/api/games', authenticatedUser, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('games').select('id,quiz_id,quiz_snapshot,game_code,status,started_at,finished_at,created_at').eq('host_id', req.teacher.id).order('created_at', { ascending: false }).limit(100);
  if (error) { console.error('Supabase games list failed:', error); return res.status(500).json({ error: 'Impossibile caricare lo storico.' }); }
  res.json({ games: data || [] });
});

app.delete('/api/games/:id', authenticatedUser, async (req, res) => {
  const { data: game, error: lookupError } = await supabaseAdmin.from('games').select('id').eq('id', req.params.id).eq('host_id', req.teacher.id).single();
  if (lookupError || !game) return res.status(404).json({ error: 'Partita non trovata o non autorizzata.' });
  const { error: answersError } = await supabaseAdmin.from('game_answers').delete().eq('game_id', game.id);
  if (answersError) return res.status(500).json({ error: 'Impossibile eliminare le risposte della partita.' });
  const { error: playersError } = await supabaseAdmin.from('game_players').delete().eq('game_id', game.id);
  if (playersError) return res.status(500).json({ error: 'Impossibile eliminare i partecipanti della partita.' });
  const { error: gameError } = await supabaseAdmin.from('games').delete().eq('id', game.id).eq('host_id', req.teacher.id);
  if (gameError) return res.status(500).json({ error: 'Eliminazione della partita non riuscita.' });
  res.json({ ok: true });
});

app.get('/api/games/:id', authenticatedUser, async (req, res) => {
  const { data: game, error } = await supabaseAdmin.from('games').select('*').eq('id', req.params.id).eq('host_id', req.teacher.id).single();
  if (error || !game) return res.status(404).json({ error: 'Partita non trovata.' });
  const { data: players, error: playersError } = await supabaseAdmin.from('game_players').select('*').eq('game_id', game.id).order('score', { ascending: false });
  if (playersError) return res.status(500).json({ error: 'Impossibile caricare i partecipanti.' });
  const { data: answers, error: answersError } = await supabaseAdmin.from('game_answers').select('*').eq('game_id', game.id).order('question_index', { ascending: true });
  if (answersError) return res.status(500).json({ error: 'Impossibile caricare le risposte.' });
  res.json({ game, players: players || [], answers: answers || [] });
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'quiz-scolastico-realtime', activeGames: games.size }));
app.get('/', (_req, res) => res.json({ service: 'Quiz scolastico realtime' }));

const publicState = game => ({
  code: game.code,
  title: game.quiz.title,
  status: game.status,
  questionIndex: game.questionIndex,
  question: (game.status === 'question' || game.status === 'reveal') ? {
    question: game.quiz.questions[game.questionIndex].question,
    answers: game.quiz.questions[game.questionIndex].answers,
    seconds: game.quiz.questions[game.questionIndex].seconds || 20,
    kind: game.quiz.questions[game.questionIndex].kind || 'standard'
  } : null,
  deadline: game.deadline,
  remainingMs: game.paused ? game.remainingMs : Math.max(0, game.deadline - Date.now()),
  paused: game.paused,
  players: [...game.players.values()].map(p => ({ id: p.id, nickname: p.nickname, score: p.score, answered: p.answered })),
  answerCount: [...game.players.values()].filter(p => p.answered).length,
  totalQuestions: game.quiz.questions.length,
  reveal: game.reveal ? { correct: game.reveal.correct, explanation: game.reveal.explanation, scores: game.reveal.scores } : null
});

function emitState(game) { io.to(game.code).emit('game:state', publicState(game)); }
function stopTimer(game) { if (game.timer) clearTimeout(game.timer); game.timer = null; }
async function persistGameStatus(game, status, extra = {}) {
  if (!supabaseAdmin || !game.dbId) return;
  const { error } = await supabaseAdmin.from('games').update({ status, ...extra }).eq('id', game.dbId);
  if (error) console.error('Supabase game update failed:', error);
}

async function closeQuestion(game, reason = 'teacher') {
  if (game.status !== 'question') return;
  stopTimer(game);
  const question = game.quiz.questions[game.questionIndex];
  const scores = [];
  const answerRows = [];
  for (const player of game.players.values()) {
    let points = 0;
    if (player.answered) {
      if (player.lastCorrect) {
        points = question.kind === 'plus' ? Number(game.quiz.plusPoints || 1500) : Number(game.quiz.standardPoints || 1000);
        player.score += points;
      } else {
        points = -Number(game.quiz.wrongPenalty || 0);
        player.score += points;
      }
      if (player.dbId) answerRows.push({
        game_id: game.dbId, player_id: player.dbId, question_index: game.questionIndex,
        answer_index: player.lastAnswer, is_correct: player.lastCorrect, points
      });
    }
    scores.push({ nickname: player.nickname, score: player.score });
    player.answered = false;
    player.lastCorrect = false;
    player.lastAnswer = null;
    if (supabaseAdmin && player.dbId) {
      const { error } = await supabaseAdmin.from('game_players').update({ score: player.score }).eq('id', player.dbId);
      if (error) console.error('Supabase player score update failed:', error);
    }
  }
  if (supabaseAdmin && answerRows.length) {
    const { error } = await supabaseAdmin.from('game_answers').insert(answerRows);
    if (error) console.error('Supabase answer insert failed:', error);
  }
  game.status = 'reveal';
  game.paused = false;
  game.deadline = null;
  game.reveal = { correct: question.correct, explanation: question.explanation || '', scores, reason };
  emitState(game);
}

function armTimer(game, ms) {
  stopTimer(game);
  game.remainingMs = ms;
  game.deadline = Date.now() + ms;
  game.timer = setTimeout(() => { void closeQuestion(game, 'timeout'); }, ms);
}

io.on('connection', socket => {
  socket.on('host:create', async (payload, ack = () => {}) => {
    try {
      if (!supabaseAdmin) return ack({ ok: false, error: 'Database non configurato sul server.' });
      if (!payload?.quiz?.questions?.length || payload.quiz.questions.length > 50) return ack({ ok: false, error: 'Quiz non valido.' });
      const token = String(payload.accessToken || '');
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData?.user) return ack({ ok: false, error: 'Sessione docente non valida. Esci e accedi nuovamente.' });
      let code;
      do { code = String(randomInt(100000, 1000000)); } while (games.has(code));
      const game = {
        code, hostId: socket.id, hostUserId: authData.user.id, quizId: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(payload.quizId || '')) ? payload.quizId : null,
        quiz: payload.quiz, status: 'lobby', questionIndex: -1, players: new Map(),
        timer: null, deadline: null, remainingMs: 0, paused: false, reveal: null, dbId: null
      };
      const { data: row, error } = await supabaseAdmin.from('games').insert({
        quiz_id: game.quizId, host_id: game.hostUserId, quiz_snapshot: game.quiz,
        game_code: code, status: 'waiting'
      }).select('id').single();
      if (error) { console.error('Supabase game create failed:', error); return ack({ ok: false, error: 'Non riesco a registrare la partita nello storico.', details: error.message }); }
      game.dbId = row.id;
      games.set(code, game);
      socket.join(code);
      ack({ ok: true, code, state: publicState(game) });
      emitState(game);
    } catch (error) {
      console.error('host:create failed:', error);
      ack({ ok: false, error: 'Errore durante la creazione della partita.' });
    }
  });

  socket.on('student:join', async ({ code, nickname } = {}, ack = () => {}) => {
    try {
      const game = games.get(String(code || '').replace(/\D/g, ''));
      if (!game) return ack({ ok: false, error: 'Codice partita non trovato.' });
      if (game.status !== 'lobby') return ack({ ok: false, error: 'La partita è già iniziata.' });
      const clean = String(nickname || '').trim().slice(0, 18);
      if (!clean) return ack({ ok: false, error: 'Inserisci un nickname.' });
      if ([...game.players.values()].some(p => p.nickname.toLowerCase() === clean.toLowerCase())) return ack({ ok: false, error: 'Nickname già utilizzato in questa partita.' });
      const { data: row, error } = await supabaseAdmin.from('game_players').insert({ game_id: game.dbId, nickname: clean, score: 0 }).select('id').single();
      if (error) { console.error('Supabase player insert failed:', error); return ack({ ok: false, error: 'Non riesco a registrare il partecipante nello storico.' }); }
      const player = { id: socket.id, dbId: row.id, nickname: clean, score: 0, answered: false, lastCorrect: false, lastAnswer: null, connected: true };
      game.players.set(socket.id, player);
      socket.join(game.code);
      ack({ ok: true, state: publicState(game) });
      emitState(game);
    } catch (error) {
      console.error('student:join failed:', error);
      ack({ ok: false, error: 'Errore durante l’ingresso in partita.' });
    }
  });

  socket.on('host:start', async ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game || game.status !== 'lobby') return ack?.({ ok: false, error: 'Partita non disponibile.' });
    if (!game.players.size) return ack?.({ ok: false, error: 'Attendi almeno uno studente.' });
    game.questionIndex = 0;
    game.status = 'question';
    game.reveal = null;
    await persistGameStatus(game, 'active', { started_at: new Date().toISOString() });
    const q = game.quiz.questions[0];
    armTimer(game, Math.max(5, Number(q.seconds || 20)) * 1000);
    emitState(game);
    ack?.({ ok: true });
  });

  socket.on('host:pause', async ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game || game.status !== 'question' || game.paused) return ack?.({ ok: false });
    game.remainingMs = Math.max(0, game.deadline - Date.now());
    stopTimer(game); game.paused = true; game.deadline = null;
    await persistGameStatus(game, 'paused');
    emitState(game); ack?.({ ok: true });
  });

  socket.on('host:resume', async ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game || game.status !== 'question' || !game.paused) return ack?.({ ok: false });
    game.paused = false;
    await persistGameStatus(game, 'active');
    armTimer(game, Math.max(1000, game.remainingMs));
    emitState(game); ack?.({ ok: true });
  });

  socket.on('host:close', async ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game) return ack?.({ ok: false });
    await closeQuestion(game, 'teacher'); ack?.({ ok: true });
  });

  socket.on('host:next', async ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game || game.status !== 'reveal') return ack?.({ ok: false });
    if (game.questionIndex >= game.quiz.questions.length - 1) {
      game.status = 'finished';
      await persistGameStatus(game, 'finished', { finished_at: new Date().toISOString() });
      emitState(game);
      return ack?.({ ok: true, finished: true });
    }
    game.questionIndex += 1; game.status = 'question'; game.reveal = null;
    await persistGameStatus(game, 'active');
    const q = game.quiz.questions[game.questionIndex];
    armTimer(game, Math.max(5, Number(q.seconds || 20)) * 1000);
    emitState(game); ack?.({ ok: true });
  });

  socket.on('student:answer', async ({ answer } = {}, ack = () => {}) => {
    const game = [...games.values()].find(g => g.players.has(socket.id));
    if (!game || game.status !== 'question' || game.paused) return ack({ ok: false, error: 'Le risposte sono chiuse.' });
    const player = game.players.get(socket.id);
    const question = game.quiz.questions[game.questionIndex];
    if (player.answered) return ack({ ok: false, error: 'Hai già risposto.' });
    if (!Number.isInteger(answer) || answer < 0 || answer >= question.answers.length) return ack({ ok: false, error: 'Risposta non valida.' });
    player.answered = true; player.lastAnswer = answer; player.lastCorrect = answer === question.correct;
    ack({ ok: true }); emitState(game);
  });

  socket.on('disconnect', async () => {
    for (const game of games.values()) {
      if (game.hostId === socket.id) {
        stopTimer(game);
        if (game.status === 'question') await closeQuestion(game, 'host-disconnect');
        if (game.status !== 'finished') await persistGameStatus(game, 'finished', { finished_at: new Date().toISOString() });
        io.to(game.code).emit('game:closed');
        games.delete(game.code);
      } else {
        const player = game.players.get(socket.id);
        if (player) { player.connected = false; emitState(game); }
      }
    }
  });
});

const port = process.env.PORT || 3001;
httpServer.listen(port, '0.0.0.0', () => console.log('Realtime server listening on', port));
