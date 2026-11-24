import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomInt } from 'node:crypto';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const games = new Map();

app.get('/health', (_req, res) => res.json({ ok: true, service: 'quiz-scolastico-realtime', activeGames: games.size }));
app.get('/', (_req, res) => res.json({ service: 'Quiz scolastico realtime' }));

const publicState = game => ({
  code: game.code,
  title: game.quiz.title,
  status: game.status,
  questionIndex: game.questionIndex,
  question: game.(game.status === 'question' || game.status === 'reveal') ? {
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

function emitState(game) {
  io.to(game.code).emit('game:state', publicState(game));
}

function stopTimer(game) {
  if (game.timer) clearTimeout(game.timer);
  game.timer = null;
}

function closeQuestion(game, reason = 'teacher') {
  if (game.status !== 'question') return;
  stopTimer(game);
  const question = game.quiz.questions[game.questionIndex];
  const scores = [];
  for (const player of game.players.values()) {
    if (player.answered) {
      if (player.lastCorrect) {
        const points = question.kind === 'plus' ? Number(game.quiz.plusPoints || 1500) : Number(game.quiz.standardPoints || 1000);
        player.score += points;
      } else {
        player.score -= Number(game.quiz.wrongPenalty || 0);
      }
    }
    scores.push({ nickname: player.nickname, score: player.score });
    player.answered = false;
    player.lastCorrect = false;
    player.lastAnswer = null;
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
  game.timer = setTimeout(() => closeQuestion(game, 'timeout'), ms);
}

io.on('connection', socket => {
  socket.on('host:create', (payload, ack = () => {}) => {
    if (!payload?.quiz?.questions?.length || payload.quiz.questions.length > 50) return ack({ ok: false, error: 'Quiz non valido.' });
    let code;
    do { code = String(randomInt(100000, 1000000)); } while (games.has(code));
    const game = {
      code, hostId: socket.id, quiz: payload.quiz, status: 'lobby', questionIndex: -1,
      players: new Map(), timer: null, deadline: null, remainingMs: 0, paused: false, reveal: null
    };
    games.set(code, game);
    socket.join(code);
    ack({ ok: true, code, state: publicState(game) });
    emitState(game);
  });

  socket.on('student:join', ({ code, nickname } = {}, ack = () => {}) => {
    const game = games.get(String(code || '').replace(/\D/g, ''));
    if (!game) return ack({ ok: false, error: 'Codice partita non trovato.' });
    if (game.status !== 'lobby') return ack({ ok: false, error: 'La partita è già iniziata.' });
    const clean = String(nickname || '').trim().slice(0, 18);
    if (!clean) return ack({ ok: false, error: 'Inserisci un nickname.' });
    if ([...game.players.values()].some(p => p.nickname.toLowerCase() === clean.toLowerCase())) return ack({ ok: false, error: 'Nickname già utilizzato in questa partita.' });
    const player = { id: socket.id, nickname: clean, score: 0, answered: false, lastCorrect: false, lastAnswer: null };
    game.players.set(socket.id, player);
    socket.join(game.code);
    ack({ ok: true, state: publicState(game) });
    emitState(game);
  });

  socket.on('host:start', ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game || game.status !== 'lobby') return ack?.({ ok: false, error: 'Partita non disponibile.' });
    if (!game.players.size) return ack?.({ ok: false, error: 'Attendi almeno uno studente.' });
    game.questionIndex = 0;
    game.status = 'question';
    game.reveal = null;
    const q = game.quiz.questions[0];
    armTimer(game, Math.max(5, Number(q.seconds || 20)) * 1000);
    emitState(game);
    ack?.({ ok: true });
  });

  socket.on('host:pause', ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game || game.status !== 'question' || game.paused) return ack?.({ ok: false });
    game.remainingMs = Math.max(0, game.deadline - Date.now());
    stopTimer(game);
    game.paused = true;
    game.deadline = null;
    emitState(game);
    ack?.({ ok: true });
  });

  socket.on('host:resume', ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game || game.status !== 'question' || !game.paused) return ack?.({ ok: false });
    game.paused = false;
    armTimer(game, Math.max(1000, game.remainingMs));
    emitState(game);
    ack?.({ ok: true });
  });

  socket.on('host:close', ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game) return ack?.({ ok: false });
    closeQuestion(game, 'teacher');
    ack?.({ ok: true });
  });

  socket.on('host:next', ack => {
    const game = [...games.values()].find(g => g.hostId === socket.id);
    if (!game || game.status !== 'reveal') return ack?.({ ok: false });
    if (game.questionIndex >= game.quiz.questions.length - 1) {
      game.status = 'finished';
      emitState(game);
      return ack?.({ ok: true, finished: true });
    }
    game.questionIndex += 1;
    game.status = 'question';
    game.reveal = null;
    const q = game.quiz.questions[game.questionIndex];
    armTimer(game, Math.max(5, Number(q.seconds || 20)) * 1000);
    emitState(game);
    ack?.({ ok: true });
  });

  socket.on('student:answer', ({ answer } = {}, ack = () => {}) => {
    const game = [...games.values()].find(g => g.players.has(socket.id));
    if (!game || game.status !== 'question' || game.paused) return ack({ ok: false, error: 'Le risposte sono chiuse.' });
    const player = game.players.get(socket.id);
    const question = game.quiz.questions[game.questionIndex];
    if (player.answered) return ack({ ok: false, error: 'Hai già risposto.' });
    if (!Number.isInteger(answer) || answer < 0 || answer >= question.answers.length) return ack({ ok: false, error: 'Risposta non valida.' });
    player.answered = true;
    player.lastAnswer = answer;
    player.lastCorrect = answer === question.correct;
    ack({ ok: true });
    emitState(game);
  });

  socket.on('disconnect', () => {
    for (const game of games.values()) {
      if (game.hostId === socket.id) {
        stopTimer(game);
        game.status = 'closed';
        io.to(game.code).emit('game:closed');
        games.delete(game.code);
      } else if (game.players.delete(socket.id)) emitState(game);
    }
  });
});

const port = process.env.PORT || 3001;
httpServer.listen(port, '0.0.0.0', () => console.log('Realtime server listening on', port));
