# Docker Infrastructure - Quick Start Guide

## Prerequisiti

- Docker Desktop installato e in esecuzione
- Almeno 8GB RAM disponibile per i container
- ~20GB spazio disco per volumi e immagini

## Setup Iniziale

1. **Copia il file di configurazione**:

   ```bash
   cp .env.example .env
   ```

2. **Rivedi e personalizza le variabili d'ambiente** in `.env` se necessario

3. **Avvia i servizi**:

   ```bash
   ./docker-utils.sh start
   # oppure
   docker-compose up -d
   ```

4. **Verifica lo stato dei servizi**:
   ```bash
   ./docker-utils.sh status
   # oppure
   docker-compose ps
   ```

## Servizi Disponibili

| Servizio   | Porta | URL                       | Descrizione                   |
| ---------- | ----- | ------------------------- | ----------------------------- |
| Frontend   | 3000  | http://localhost:3000     | Interfaccia chat Next.js      |
| MCP Server | 8080  | http://localhost:8080     | Server MCP (API)              |
| MongoDB    | 27017 | mongodb://localhost:27017 | Database colori e vernici     |
| MySQL      | 3306  | mysql://localhost:3306    | Database industria alimentare |
| Ollama     | 11434 | http://localhost:11434    | LLM locale                    |

## Comandi Utili

### Gestione Servizi

```bash
# Avvia tutti i servizi
./docker-utils.sh start

# Ferma tutti i servizi
./docker-utils.sh stop

# Riavvia i servizi
./docker-utils.sh restart

# Visualizza log (tutti i servizi)
./docker-utils.sh logs

# Visualizza log di un servizio specifico
./docker-utils.sh logs frontend
./docker-utils.sh logs mcp-server

# Controlla lo stato
./docker-utils.sh status

# Verifica la salute dei servizi
./docker-utils.sh health
```

### Gestione Database

```bash
# Connetti alla shell MongoDB
./docker-utils.sh mongo-shell

# Connetti alla shell MySQL
./docker-utils.sh mysql-shell

# Reset database (ATTENZIONE: cancella tutti i dati!)
./docker-utils.sh reset-db
```

### Gestione Ollama

```bash
# Scarica un modello LLM
./docker-utils.sh pull-model llama2
./docker-utils.sh pull-model mistral
./docker-utils.sh pull-model codellama

# Lista modelli disponibili
./docker-utils.sh list-models

# Reset Ollama (rimuove tutti i modelli)
./docker-utils.sh reset-ollama
```

### Build e Manutenzione

```bash
# Rebuild dei servizi
./docker-utils.sh build

# Pulizia completa (rimuove tutto)
./docker-utils.sh clean
```

## Architettura Docker

### Network

Tutti i servizi comunicano attraverso la rete `app-network` di tipo bridge, che fornisce:

- Isolamento dai servizi esterni
- DNS interno per risoluzione nomi (es: `mongodb`, `mysql`)
- Comunicazione sicura tra container

### Volumi

Volumi persistenti per mantenere i dati tra riavvii:

- `mongodb_data`: Dati MongoDB
- `mysql_data`: Dati MySQL
- `ollama_data`: Modelli Ollama

### Health Checks

Ogni servizio implementa health check per verificare:

- MongoDB: ping del database
- MySQL: mysqladmin ping
- MCP Server: endpoint `/health`
- Frontend: risposta HTTP su porta 3000
- Ollama: endpoint `/api/tags`

I servizi dipendenti attendono che i servizi upstream siano "healthy" prima di avviarsi.

## Inizializzazione Database

### MongoDB (Colori e Vernici)

Script in `docker-init/mongodb/`:

- `01-init-mongo.js`: Creazione database e collezioni
- `02-seed-paints-data.js`: Popolamento con ~100 prodotti, 15 fornitori, 30 formule

### MySQL (Industria Alimentare)

Script in `docker-init/mysql/`:

- `01-schema.sql`: Creazione schema e tabelle
- `02-seed-data.sql`: Popolamento con ~120 prodotti, 20 categorie, 40 clienti

**Note**: Gli script di init vengono eseguiti solo al primo avvio quando i volumi sono vuoti.

## Troubleshooting

### Servizio non si avvia

```bash
# Controlla i log
./docker-utils.sh logs <service-name>

# Verifica le porte non siano già in uso
lsof -i :3000  # Frontend
lsof -i :8080  # MCP Server
lsof -i :27017 # MongoDB
lsof -i :3306  # MySQL
lsof -i :11434 # Ollama
```

### Database vuoto dopo avvio

Gli script di init non vengono eseguiti se i volumi esistono già:

```bash
# Reset database
./docker-utils.sh reset-db
```

### Ollama out of memory

Assegna più RAM a Docker Desktop:

- Docker Desktop → Settings → Resources → Memory
- Consigliato: almeno 8GB

### Ricostruire da zero

```bash
# Pulizia completa
./docker-utils.sh clean

# Riavvio
./docker-utils.sh start
```

## Best Practices

1. **Non committare il file `.env`** - contiene credenziali
2. **Usa `.env.example`** come template per condividere configurazioni
3. **Backup dei dati**: esporta regolarmente i database
4. **Monitoring**: usa `./docker-utils.sh health` per verificare lo stato
5. **Logs**: controlla i log regolarmente per errori

## Sviluppo

### Hot Reload

Frontend e MCP Server sono configurati con volumi montati per hot reload:

- Modifiche al codice in `./frontend` → reload automatico
- Modifiche al codice in `./mcp-server` → reload automatico

### Variabili d'Ambiente

Per modificare le configurazioni:

1. Modifica `.env`
2. Riavvia i servizi:
   ```bash
   ./docker-utils.sh restart
   ```

## Prossimi Passi

Dopo aver avviato i servizi:

1. **Configura Ollama**: Scarica un modello LLM

   ```bash
   ./docker-utils.sh pull-model llama2
   ```

2. **Verifica i database**: Connettiti e esplora i dati seed

   ```bash
   ./docker-utils.sh mongo-shell
   ./docker-utils.sh mysql-shell
   ```

3. **Testa il frontend**: Apri http://localhost:3000

4. **Consulta la documentazione** in `.github/core-project.md` per dettagli architetturali
