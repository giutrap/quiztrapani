# TOMBOLA CAZZARA

Minisito multiplayer: console organizzatore da PC, accesso giocatori via QR/codice, cartelle italiane da 15 numeri, estrazioni manuali con suspense minima di 15 secondi.

## Avvio
```bash
npm install
npm start
```

## Deploy Render
- Runtime: Node
- Root directory: `tombola-cazzara`
- Build command: `npm install`
- Start command: `npm start`
- Region: Frankfurt
- Environment: `PUBLIC_URL=https://<dominio-del-servizio>`

## Nota sulla prima versione
La prima milestone usa memoria del processo per conservare lo stato della partita. È adatta a prove e partite demo; riavvii o sospensioni del servizio azzerano la partita. Prima dell'uso per eventi importanti va aggiunta persistenza su PostgreSQL/Supabase e testata la ripresa dopo disconnessione.
