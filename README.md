# Quiz scolastico

Piattaforma didattica per quiz live in stile game-show, con percorsi Biennio e Triennio.

## Stato attuale

Questa prima milestone è una demo frontend navigabile:
- home page e percorsi Biennio/Triennio;
- flusso dimostrativo di ingresso con nickname e codice;
- partita demo con domande a scelta multipla, feedback e punteggio;
- anteprima area docente ed editor segnaposto.

**Non è ancora multiplayer live**: codice partita, sala d'attesa, timer, account docente e archivio persistente richiedono il backend realtime e il database.

## Avvio locale

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Prossime milestone

1. Backend e database Supabase; stanze, codici, nickname e sincronizzazione realtime.
2. Area docente con autenticazione, creazione/modifica quiz e archivio persistente.
3. Modalità live con timer server-side, risposte simultanee, punteggio e classifica.
4. Test su smartphone e LIM; pubblicazione su Render.
