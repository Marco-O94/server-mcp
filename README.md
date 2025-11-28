# Multi-Database MCP Server Project

Sistema full-stack multi-container che integra un frontend Next.js con un server MCP (Model Context Protocol) per consentire a un'IA di interrogare database multipli attraverso conversazioni naturali.

## 🏗️ Architettura

```
User ↔ Frontend (Next.js) ↔ LLM (Ollama/Claude) ↔ MCP Server ↔ [MongoDB, MySQL]
```

### Componenti

- **Frontend**: Next.js con interfaccia chat (shadcn-ui)
- **MCP Server**: Server Node.js/TypeScript che implementa il protocollo MCP
- **MongoDB**: Database NoSQL per industria colori e vernici
- **MySQL**: Database relazionale per industria alimentare
- **Ollama**: LLM locale per elaborazione linguaggio naturale

## 🚀 Quick Start

### Prerequisiti

- Docker Desktop installato e in esecuzione
- Almeno 8GB RAM disponibile
- ~20GB spazio disco

### Installazione

1. **Clona il repository** (se necessario)

2. **Configura le variabili d'ambiente**:

   ```bash
   cp .env.example .env
   ```

3. **Avvia i servizi**:

   ```bash
   ./docker-utils.sh start
   ```

4. **Scarica un modello LLM** (consigliato):

   ```bash
   ./docker-utils.sh pull-model llama2
   # oppure
   ./docker-utils.sh pull-model mistral
   ```

5. **Verifica lo stato**:

   ```bash
   ./docker-utils.sh health
   ```

6. **Apri il frontend**: http://localhost:3000

## 📋 Servizi e Porte

| Servizio   | Porta | Descrizione              |
| ---------- | ----- | ------------------------ |
| Frontend   | 3000  | Interfaccia chat Next.js |
| MCP Server | 8080  | API server MCP           |
| MongoDB    | 27017 | DB colori e vernici      |
| MySQL      | 3306  | DB industria alimentare  |
| Ollama     | 11434 | LLM locale               |

## 🗄️ Database

### MongoDB - Industria Colori e Vernici

**Collections**:

- `products`: ~100 prodotti (pitture, vernici, smalti)
- `suppliers`: ~15 fornitori
- `color_formulas`: ~30 formule personalizzate
- `orders`: ~50 ordini

### MySQL - Industria Alimentare

**Tabelle principali**:

- `products`: ~120 prodotti alimentari
- `categories`: ~20 categorie (gerarchia)
- `suppliers`: ~20 fornitori
- `production_batches`: ~70 lotti di produzione
- `customers`: ~40 clienti
- `orders` + `order_items`: ~100 ordini

## 🛠️ Comandi Utili

### Gestione servizi

```bash
./docker-utils.sh start          # Avvia tutti i servizi
./docker-utils.sh stop           # Ferma tutti i servizi
./docker-utils.sh restart        # Riavvia i servizi
./docker-utils.sh status         # Mostra stato servizi
./docker-utils.sh logs [service] # Visualizza log
./docker-utils.sh health         # Health check completo
```

### Database

```bash
./docker-utils.sh mongo-shell    # Shell MongoDB
./docker-utils.sh mysql-shell    # Shell MySQL
./docker-utils.sh reset-db       # Reset database (ATTENZIONE!)
```

### Ollama

```bash
./docker-utils.sh pull-model <name>  # Scarica modello
./docker-utils.sh list-models        # Lista modelli
```

### Build e Manutenzione

```bash
./docker-utils.sh build          # Rebuild servizi
./docker-utils.sh clean          # Pulizia completa
```

Per la guida completa, vedi [DOCKER-GUIDE.md](./DOCKER-GUIDE.md)

## 📁 Struttura Progetto

```
.
├── docker-compose.yml           # Orchestrazione container
├── docker-utils.sh              # Script utility Docker
├── .env.example                 # Template variabili d'ambiente
├── .gitignore                   # File da ignorare in Git
│
├── docker-init/                 # Script inizializzazione DB
│   ├── mongodb/
│   │   ├── 01-init-mongo.js
│   │   └── 02-seed-paints-data.js
│   └── mysql/
│       ├── 01-schema.sql
│       └── 02-seed-data.sql
│
├── frontend/                    # Next.js Chat UI
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── mcp-server/                  # MCP Server
│   ├── src/
│   │   ├── tools/
│   │   │   ├── mongodb/
│   │   │   └── mysql/
│   │   └── database/
│   ├── package.json
│   └── Dockerfile
│
└── .github/
    └── core-project.md          # Specifiche dettagliate progetto
```

## 🔧 Sviluppo

### Hot Reload

Entrambi frontend e MCP server supportano hot reload:

- Modifica i file in `./frontend` o `./mcp-server`
- Le modifiche verranno applicate automaticamente

### Variabili d'Ambiente

Modifica `.env` e riavvia i servizi:

```bash
./docker-utils.sh restart
```

### Testing Database

```bash
# MongoDB
./docker-utils.sh mongo-shell
> db.products.countDocuments()

# MySQL
./docker-utils.sh mysql-shell
mysql> SELECT COUNT(*) FROM products;
```

## 🤖 MCP Tools Disponibili

Il server MCP espone tools per interrogare entrambi i database:

### MongoDB (Colori e Vernici)

- `list_paint_products` - Elenca prodotti
- `search_paint_by_color` - Cerca per colore
- `get_paint_product_details` - Dettagli prodotto
- `list_paint_suppliers` - Elenca fornitori
- `get_color_formula` - Recupera formula colore
- `list_paint_orders` - Elenca ordini

### MySQL (Industria Alimentare)

- `list_food_products` - Elenca prodotti
- `search_food_products` - Ricerca prodotti
- `get_food_product_details` - Dettagli prodotto
- `list_food_categories` - Elenca categorie
- `get_product_batches` - Info lotti produzione
- `get_low_stock_products` - Prodotti in esaurimento
- `list_food_suppliers` - Elenca fornitori
- `list_food_orders` - Elenca ordini

## 💬 Esempi di Conversazioni

Prova queste domande nella chat UI (http://localhost:3000):

**Domande sui Colori/Vernici**:

- "Mostrami tutte le vernici blu disponibili"
- "Quali sono i fornitori di pitture?"
- "Dammi i dettagli della vernice con codice VBO-2024-001"
- "Come posso creare il colore Rosso Ferrari?"
- "Elenca gli ordini in stato pending"

**Domande sull'Industria Alimentare**:

- "Quali categorie di prodotti alimentari avete?"
- "Mostrami tutti i prodotti di pasta"
- "Cerca prodotti che contengono pomodoro"
- "Quali prodotti hanno scorte basse?"
- "Lista i lotti di produzione in scadenza"
- "Chi sono i fornitori di prodotti freschi?"

**Domande Complesse**:

- "Confronta i livelli di inventario tra vernici e prodotti alimentari"
- "Mostrami tutti i prodotti bio certificati"
- "Quali ordini sono stati consegnati questa settimana?"

## 📚 Documentazione

- [DOCKER-GUIDE.md](./DOCKER-GUIDE.md) - Guida completa Docker
- [.github/core-project.md](./.github/core-project.md) - Specifiche architetturali
- [docker-init/README.md](./docker-init/README.md) - Info inizializzazione DB

## 🐛 Troubleshooting

### Servizio non si avvia

```bash
./docker-utils.sh logs <service-name>
```

### Porta già in uso

```bash
lsof -i :<port-number>
```

### Database vuoto

```bash
./docker-utils.sh reset-db
```

### Ricostruzione completa

```bash
./docker-utils.sh clean
./docker-utils.sh start
```

## 🔐 Sicurezza

- **NON** committare il file `.env`
- Usa credenziali forti in produzione
- Cambia le password di default in `.env.example`
- Limita l'accesso alle porte dei database in produzione

## 📝 Note per lo Sviluppo Multi-Agente

Questo progetto è progettato per essere sviluppato con un approccio multi-agente:

1. **Infrastructure Subagent** - Docker, orchestrazione
2. **MCP Server Subagent** - Implementazione server MCP
3. **Database Subagent** - Schema e dati
4. **Frontend Subagent** - UI e integrazione LLM
5. **Documentation Subagent** - Documentazione

Vedi [.github/core-project.md](./.github/core-project.md) per dettagli sulla strategia multi-agente.

## 🤝 Contributing

Quando aggiungi nuove features:

1. Mantieni aggiornata la documentazione
2. Aggiungi test appropriati
3. Aggiorna gli script di seed se modifichi gli schema
4. Documenta nuovi MCP tools nel README

## 📄 License

[Inserire licenza]

## 👥 Team

[Inserire informazioni team]

---

**Status**: ✅ Progetto Completato - Pronto per il Testing  
**Version**: 1.0.0  
**Last Updated**: November 22, 2024

### Componenti Implementati

- ✅ Frontend Next.js con Chat UI (shadcn-ui)
- ✅ MCP Server con 14 tools (6 MongoDB + 8 MySQL)
- ✅ MongoDB con database industria vernici
- ✅ MySQL con database industria alimentare
- ✅ Ollama per LLM locale
- ✅ Docker Compose orchestration
- ✅ Seed data completi
- ✅ Documentazione completa
