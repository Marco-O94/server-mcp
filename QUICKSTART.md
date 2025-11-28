# MCP Database Chat - Quick Start Guide

## 🚀 Avvio Rapido

### 1. Preparazione

```bash
# Clona o naviga nella directory del progetto
cd "db mcp"

# Copia le variabili d'ambiente
cp .env.example .env
```

### 2. Avvia i Servizi

```bash
# Avvia tutti i container
docker-compose up -d

# Monitora i log (opzionale)
docker-compose logs -f
```

### 3. Scarica il Modello LLM

```bash
# Scarica llama3.2 (raccomandato, ~2GB)
docker-compose exec ollama ollama pull llama3.2

# Alternative:
# docker-compose exec ollama ollama pull mistral
# docker-compose exec ollama ollama pull codellama
```

### 4. Verifica lo Stato

```bash
# Controlla che tutti i servizi siano healthy
docker-compose ps

# Dovresti vedere tutti i servizi con stato "healthy" o "running"
```

### 5. Accedi all'Applicazione

Apri il browser su: **http://localhost:3000**

## 📝 Esempi di Domande da Provare

### Industria Vernici (MongoDB)

- "Mostrami tutte le vernici blu"
- "Quali fornitori abbiamo per le pitture?"
- "Come creo il colore Rosso Ferrari?"
- "Lista gli ordini in sospeso"

### Industria Alimentare (MySQL)

- "Quali categorie di prodotti hai?"
- "Cerca prodotti con pomodoro"
- "Mostrami i prodotti con scorte basse"
- "Lista i lotti in scadenza"

## 🔧 Comandi Utili

```bash
# Stop tutti i servizi
docker-compose down

# Reset completo (cancella anche i dati)
docker-compose down -v

# Ricostruisci dopo modifiche al codice
docker-compose up -d --build

# Vedi log di un servizio specifico
docker-compose logs -f frontend
docker-compose logs -f mcp-server
docker-compose logs -f ollama

# Accedi al database MongoDB
docker-compose exec mongodb mongosh -u admin -p mongopassword paints_db

# Accedi al database MySQL
docker-compose exec mysql mysql -u fooduser -pfoodpassword food_industry
```

## ⚠️ Troubleshooting

### Frontend non si carica

```bash
docker-compose logs frontend
# Controlla errori di build

docker-compose restart frontend
```

### MCP Server non risponde

```bash
docker-compose logs mcp-server
# Verifica connessioni database

docker-compose restart mcp-server
```

### Ollama non ha modelli

```bash
# Lista modelli disponibili
docker-compose exec ollama ollama list

# Se vuoto, scarica un modello
docker-compose exec ollama ollama pull llama3.2
```

### Porta già in uso

```bash
# Trova processo che usa la porta 3000
lsof -i :3000

# Fermalo o cambia porta in .env
```

## 📊 Porte dei Servizi

| Servizio   | Porta | URL                       |
| ---------- | ----- | ------------------------- |
| Frontend   | 3000  | http://localhost:3000     |
| MCP Server | 8080  | http://localhost:8080     |
| MongoDB    | 27017 | mongodb://localhost:27017 |
| MySQL      | 3306  | mysql://localhost:3306    |
| Ollama     | 11434 | http://localhost:11434    |

## 🎯 Prossimi Passi

1. ✅ Testa le conversazioni con l'AI
2. 📖 Leggi la documentazione completa in [README.md](./README.md)
3. 🔧 Esplora il codice in `frontend/` e `mcp-server/`
4. 📚 Consulta [.github/copilot-instructions.md](./.github/copilot-instructions.md) per dettagli architetturali

---

Per assistenza completa, vedi [README.md](./README.md) e [DOCKER-GUIDE.md](./DOCKER-GUIDE.md)
