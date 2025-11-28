# Database Initialization Scripts

Questa directory contiene gli script di inizializzazione per i database MongoDB e MySQL.

## Struttura

```
docker-init/
├── mongodb/
│   ├── 01-init-mongo.js      # Creazione database e utenti
│   └── 02-seed-paints-data.js # Popolamento dati industria colori
└── mysql/
    ├── 01-schema.sql          # Creazione schema database
    └── 02-seed-data.sql       # Popolamento dati industria alimentare
```

## MongoDB - Industria Colori e Vernici

Gli script MongoDB vengono eseguiti in ordine alfabetico al primo avvio del container.

**Database**: `paints_db`

**Collections**:

- `products` - Prodotti (pitture, vernici, smalti)
- `suppliers` - Fornitori
- `color_formulas` - Formule personalizzate per colori
- `orders` - Ordini clienti

**Dati Seed**: ~100 prodotti, 15 fornitori, 30 formule, 50 ordini

## MySQL - Industria Alimentare

Gli script SQL vengono eseguiti in ordine alfabetico al primo avvio del container.

**Database**: `food_industry`

**Tabelle**:

- `categories` - Categorie prodotti (gerarchia)
- `products` - Prodotti alimentari
- `suppliers` - Fornitori
- `product_suppliers` - Relazione prodotti-fornitori
- `production_batches` - Lotti di produzione
- `customers` - Clienti
- `orders` - Ordini
- `order_items` - Dettagli ordini

**Dati Seed**: ~120 prodotti, 20 categorie, 20 fornitori, 70 batch, 40 clienti, 100 ordini

## Ricostruzione Database

Per ricaricare i dati da zero:

```bash
# Ferma i container
docker-compose down

# Rimuovi i volumi (ATTENZIONE: cancella tutti i dati!)
docker volume rm db-mcp_mongodb_data db-mcp_mysql_data

# Riavvia i container - gli script di init verranno rieseguiti
docker-compose up -d
```

## Note

- Gli script vengono eseguiti **solo al primo avvio** quando il volume è vuoto
- Per applicare modifiche agli script, è necessario rimuovere i volumi
- Le password e credenziali sono definite nel file `.env`
