```markdown
# Prompt Ottimizzato per Agente di Sviluppo

## Contesto del Progetto

Sviluppo di un'applicazione full-stack multi-container con architettura a microservizi, che integra un frontend moderno con server MCP (Model Context Protocol) per consentire a un'IA di interrogare database multipli attraverso conversazioni naturali.

## Architettura del Sistema
```

User ↔ Frontend (Next.js Chat UI) ↔ LLM (Ollama/Claude/etc) ↔ MCP Server ↔ [MongoDB, MySQL]

````

L'utente interagisce con una chat interface, che comunica con un LLM (Ollama o altri), il quale utilizza il server MCP per accedere ai dati nei database.

## Strategia Multi-Agente

**Se necessario, utilizza più subagents specializzati** per dividere efficacemente lo sviluppo e la documentazione del progetto:

### Subagents Suggeriti

1. **🏗️ Infrastructure Subagent**
   - Setup Docker Compose e configurazione container
   - Gestione network e volumi
   - Configurazione environment variables
   - Health checks e orchestrazione

2. **⚙️ MCP Server Subagent**
   - Sviluppo server MCP seguendo le specifiche del protocollo
   - Implementazione tools/functions per interrogare MongoDB
   - Implementazione tools/functions per interrogare MySQL
   - Gestione connessioni ai database con connection pooling
   - Error handling e logging strutturato

3. **🗄️ Database Subagent**
   - Design schema MongoDB (industria colori e vernici)
   - Design schema MySQL (industria alimentare)
   - Creazione seed data e script di popolamento
   - Ottimizzazione query e indici

4. **🎨 Frontend Subagent**
   - Sviluppo interfaccia chat Next.js con shadcn-ui
   - Integrazione con LLM (Ollama o altri provider)
   - Gestione streaming delle risposte
   - UI/UX per conversazioni con l'IA

5. **📚 Documentation Subagent**
   - Manutenzione copilot-instructions.md
   - Aggiornamento README.md
   - Documentazione MCP tools disponibili
   - Diagrammi di architettura
   - Change logs

### Coordinamento tra Subagents
- Gli subagents devono comunicare attraverso la documentazione condivisa
- Ogni subagent aggiorna il proprio contesto nel copilot-instructions.md
- Il Documentation Subagent consolida e organizza gli update degli altri subagents
- Usa branch Git separati per sviluppi paralleli quando appropriato

## Obiettivi Tecnici

### 1. Frontend Next.js - Chat Interface
- **Framework**: Next.js (ultima versione stabile)
- **UI Library**: shadcn-ui con componenti chat aggiornati
- **Funzionalità**:
  - Interfaccia chat centrata nella pagina
  - Componenti per messaggi user/assistant
  - Input testuale per conversazioni
  - Streaming delle risposte in tempo reale
  - Indicatori di typing/loading
  - Storia della conversazione
- **Integrazione LLM**:
  - Connessione a Ollama (locale) o altri provider (Claude API, OpenAI, etc)
  - Configurazione dinamica del provider LLM
  - Gestione del context window e memoria conversazione
- **Styling**: Design moderno con Tailwind CSS, dark mode support, responsive
- **Containerizzazione**: Dockerfile ottimizzato per produzione con multi-stage build
- **Porta esposta**: 3000

### 2. Infrastruttura Database

#### Container MongoDB - Industria Colori e Vernici
- **Immagine**: `mongo:latest` (o versione specifica)
- **Porta**: 27017
- **Configurazione**:
  - Volume persistente per i dati
  - Credenziali di accesso configurabili via environment variables
  - Network interno per comunicazione con MCP server

- **Schema e Dati Dummy**:
  ```javascript
  // Collections suggerite:
  - products: {
      _id,
      name,
      code,
      type (pittura, vernice, smalto, primer, etc),
      category (interno, esterno, industriale),
      color: {
        name,
        hex,
        rgb,
        pantone
      },
      finish (opaco, satinato, lucido),
      coverage (m²/L),
      drying_time,
      price,
      stock_quantity,
      supplier_id,
      certifications [],
      technical_specs: {
        viscosity,
        density,
        voc_content
      },
      created_at,
      updated_at
    }

  - suppliers: {
      _id,
      name,
      contact_info,
      products_supplied [],
      payment_terms,
      rating
    }

  - color_formulas: {
      _id,
      final_color,
      base_color,
      pigments: [{
        pigment_id,
        quantity,
        unit
      }],
      mixing_instructions
    }

  - orders: {
      _id,
      order_number,
      customer_id,
      items: [{
        product_id,
        quantity,
        price
      }],
      total_amount,
      status,
      delivery_date,
      created_at
    }
````

**Popola con almeno**:

- 50-100 prodotti diversi (varie tipologie di colori e vernici)
- 10-15 fornitori
- 20-30 formule di colori personalizzati
- 30-50 ordini con stati diversi

#### Container MySQL - Industria Alimentare

- **Immagine**: `mysql:latest` (o versione specifica)
- **Porta**: 3306
- **Configurazione**:

  - Volume persistente per i dati
  - Credenziali di accesso configurabili via environment variables
  - Network interno per comunicazione con MCP server

- **Schema e Dati Dummy**:

  ```sql
  -- Tabelle suggerite:

  CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(id)
  );

  CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category_id INT,
    description TEXT,
    ingredients TEXT,
    nutritional_info JSON,
    allergens VARCHAR(255),
    weight DECIMAL(10,2),
    unit VARCHAR(20),
    price DECIMAL(10,2),
    cost DECIMAL(10,2),
    stock_quantity INT,
    reorder_level INT,
    expiration_days INT,
    storage_temperature VARCHAR(50),
    certifications VARCHAR(255), -- bio, dop, igp, etc
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    vat_number VARCHAR(50),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    payment_terms VARCHAR(100),
    quality_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE product_suppliers (
    product_id INT,
    supplier_id INT,
    lead_time_days INT,
    minimum_order_quantity INT,
    price_per_unit DECIMAL(10,2),
    PRIMARY KEY (product_id, supplier_id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE production_batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    product_id INT,
    production_date DATE,
    expiration_date DATE,
    quantity_produced INT,
    quality_check_status ENUM('pending', 'approved', 'rejected'),
    storage_location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200),
    vat_number VARCHAR(50),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    customer_type ENUM('retailer', 'wholesaler', 'restaurant', 'individual'),
    credit_limit DECIMAL(12,2),
    payment_terms VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT,
    order_date DATE,
    delivery_date DATE,
    status ENUM('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'),
    total_amount DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(10,2),
    discount_percent DECIMAL(5,2),
    subtotal DECIMAL(12,2),
    batch_id INT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (batch_id) REFERENCES production_batches(id)
  );
  ```

  **Popola con almeno**:

  - 15-20 categorie (pasta, conserve, latticini, carni, bevande, etc)
  - 80-120 prodotti diversi
  - 15-20 fornitori
  - 50-70 batch di produzione
  - 30-40 clienti (mix di tipologie)
  - 60-100 ordini con relativi order_items

### 3. MCP Server (Model Context Protocol)

- **Linguaggio**: Node.js/TypeScript o Python
- **Protocollo**: Implementazione completa delle specifiche MCP
- **Porta**: Configurabile (stdio o SSE)
- **Transport**: stdio, SSE o WebSocket secondo specifiche MCP

**Funzionalità MCP Server**:

```typescript
// Tools da implementare per MongoDB (Colori e Vernici):

1. list_paint_products
   - Input: { filter?: object, limit?: number }
   - Output: Array di prodotti con dettagli
   - Descrizione: Elenca prodotti di colori e vernici con filtri opzionali

2. search_paint_by_color
   - Input: { color_name?: string, hex?: string, finish?: string }
   - Output: Prodotti che corrispondono ai criteri di colore
   - Descrizione: Cerca vernici per nome colore, codice hex o finitura

3. get_paint_product_details
   - Input: { product_id: string }
   - Output: Dettagli completi del prodotto
   - Descrizione: Recupera informazioni dettagliate su un prodotto specifico

4. list_paint_suppliers
   - Input: { filter?: object }
   - Output: Array di fornitori
   - Descrizione: Elenca fornitori di colori e vernici

5. get_color_formula
   - Input: { color_name?: string, formula_id?: string }
   - Output: Formula del colore con pigmenti
   - Descrizione: Recupera la formula per creare un colore specifico

6. list_paint_orders
   - Input: { status?: string, limit?: number }
   - Output: Array di ordini
   - Descrizione: Elenca ordini con filtri opzionali

// Tools da implementare per MySQL (Industria Alimentare):

1. list_food_products
   - Input: { category?: string, limit?: number }
   - Output: Array di prodotti alimentari
   - Descrizione: Elenca prodotti alimentari con filtri opzionali

2. search_food_products
   - Input: { query: string, category?: string }
   - Output: Prodotti che corrispondono alla ricerca
   - Descrizione: Ricerca prodotti per nome, ingredienti o caratteristiche

3. get_food_product_details
   - Input: { product_id: number }
   - Output: Dettagli completi del prodotto incluse info nutrizionali
   - Descrizione: Recupera informazioni dettagliate su un prodotto alimentare

4. list_food_categories
   - Input: {}
   - Output: Array di categorie con gerarchia
   - Descrizione: Elenca tutte le categorie alimentari

5. get_product_batches
   - Input: { product_id?: number, status?: string }
   - Output: Batch di produzione con date scadenza
   - Descrizione: Recupera informazioni sui lotti di produzione

6. get_low_stock_products
   - Input: { threshold?: number }
   - Output: Prodotti con stock basso
   - Descrizione: Identifica prodotti da riordinare

7. list_food_suppliers
   - Input: { product_id?: number }
   - Output: Array di fornitori
   - Descrizione: Elenca fornitori di prodotti alimentari

8. list_food_orders
   - Input: { status?: string, customer_id?: number, limit?: number }
   - Output: Array di ordini con dettagli
   - Descrizione: Elenca ordini clienti con filtri

// Tools cross-database (opzionali):

1. compare_inventory_levels
   - Input: { industry: 'paint' | 'food' }
   - Output: Statistiche inventory
   - Descrizione: Confronta livelli di inventario tra le due industrie
```

**Struttura MCP Server**:

```
/mcp-server
  /src
    /tools
      /mongodb
        paint-products.ts
        paint-suppliers.ts
        paint-formulas.ts
        paint-orders.ts
      /mysql
        food-products.ts
        food-categories.ts
        food-batches.ts
        food-suppliers.ts
        food-orders.ts
    /database
      mongodb-client.ts
      mysql-client.ts
    server.ts
    types.ts
  package.json
  tsconfig.json
  Dockerfile
```

**Configurazione**:

- Espone tools tramite protocollo MCP
- Gestione errori con messaggi descrittivi
- Logging di tutte le operazioni
- Validazione input parametri
- Connection pooling per database
- Health checks

### 4. Orchestrazione Docker Compose

Crea un `docker-compose.yml` che:

- Definisce tutti i servizi (frontend, mongodb, mysql, mcp-server)
- Configura le network per isolare i servizi appropriatamente
- Gestisce le dipendenze tra container (depends_on)
- Utilizza variabili d'ambiente tramite file `.env`
- Include health checks per verificare lo stato dei servizi
- Configura volumi per persistenza dati
- Espone le porte necessarie
- **Include script di inizializzazione per popolare i database con dati dummy**

**Struttura suggerita per init scripts**:

```
/docker-init/
  /mongodb/
    init-mongo.js
    seed-paints-data.js
  /mysql/
    01-schema.sql
    02-seed-data.sql
```

**Configurazione per LLM**:

```yaml
# Nel docker-compose.yml, considera l'aggiunta di:

# Opzione 1: Ollama locale (consigliato per sviluppo)
ollama:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama-data:/root/.ollama
# Il frontend si connetterà all'LLM che a sua volta utilizzerà il MCP server
```

## Requisiti Critici di Sviluppo

### 📋 Documentazione Continua

**IMPORTANTE**: Ad ogni nuova feature o modifica significativa:

1. **Aggiorna immediatamente** il file `.github/copilot-instructions.md` (o `.copilot/instructions.md` se usi quella struttura)
2. **Documenta**:

   - Tools MCP disponibili con esempi di utilizzo
   - Strutture dati e modelli (schema MongoDB e MySQL)
   - Dipendenze tra servizi
   - Configurazioni specifiche LLM e MCP
   - Pattern architetturali implementati
   - Decisioni tecniche e motivazioni
   - **Quale agente ha lavorato su quale componente**
   - **Logica dei dati dummy e relazioni tra entità**
   - **Come testare i tools MCP**

3. **Mantieni aggiornato**:
   - README.md del progetto
   - Documentazione MCP tools (con esempi di prompt per l'IA)
   - Diagrammi di architettura
   - **Diagrammi ER per database relazionali**
   - **Schema documenti per MongoDB**
   - Log delle modifiche per agente

### Struttura Suggerita per copilot-instructions.md

```markdown
# Project Architecture

## Services

- Frontend: Next.js Chat Interface (port 3000)
- MCP Server: TypeScript/Node.js (stdio/SSE)
- MongoDB: Database NoSQL - Industria Colori e Vernici (port 27017)
- MySQL: Database relazionale - Industria Alimentare (port 3306)
- LLM: Ollama locale o provider esterno

## Data Flow

User → Chat UI → LLM (Ollama/Claude/etc) → MCP Server → [MongoDB, MySQL]

## Agent Responsibilities

### Infrastructure Agent

[Componenti gestiti e configurazioni]

### MCP Server Agent

[Tools implementati e protocollo MCP]

### Database Agent

[Schema design e seed data]

### Frontend Agent

[Chat UI e integrazione LLM]

### Documentation Agent

[Documentazione e knowledge base]

## MCP Tools Available

### MongoDB Tools (Paints Industry)

[Lista tools con descrizioni e esempi]

### MySQL Tools (Food Industry)

[Lista tools con descrizioni e esempi]

## Database Schemas

### MongoDB - Colori e Vernici

[Schema collections con esempi]

### MySQL - Industria Alimentare

[Schema tabelle e relazioni]

## LLM Configuration

[Come configurare e connettere l'LLM al MCP server]

## Example Conversations

[Esempi di prompt utente e come l'IA risponde usando MCP tools]

## Development Workflow

[Come avviare il progetto, testare MCP tools, ecc.]

## Seed Data Information

[Informazioni sui dati dummy e come rigenerarli]

## Recent Changes

[Log delle ultime modifiche significative con indicazione dell'agente]
```

## Deliverable Attesi

1. ✅ Struttura di progetto organizzata e scalabile
2. ✅ Dockerfile per ogni servizio
3. ✅ docker-compose.yml funzionante con init scripts
4. ✅ File .env.example con tutte le variabili necessarie
5. ✅ **Frontend Next.js con interfaccia chat moderna**
6. ✅ **Integrazione LLM (Ollama o provider configurabile)**
7. ✅ **MCP Server completo con tutti i tools documentati**
8. ✅ **MongoDB popolato con dati dummy industria colori e vernici**
9. ✅ **MySQL popolato con dati dummy industria alimentare**
10. ✅ **Script di seed per entrambi i database**
11. ✅ README.md con istruzioni di setup e avvio
12. ✅ copilot-instructions.md inizializzato e strutturato
13. ✅ Documentazione della divisione del lavoro tra agenti
14. ✅ **Documentazione degli schema database con diagrammi**
15. ✅ **Guida per testare MCP tools con esempi di conversazioni**

## Comandi Utili da Includere

```bash
# Avvio completo (con popolamento automatico database)
docker-compose up -d

# Stop di tutti i servizi
docker-compose down

# Stop e rimozione volumi (per reset completo database)
docker-compose down -v

# Rebuild dopo modifiche
docker-compose up -d --build

# Logs di un servizio specifico
docker-compose logs -f [service-name]

# Rebuild di un singolo servizio
docker-compose up -d --build [service-name]

# Accesso a MongoDB shell
docker-compose exec mongodb mongosh -u admin -p password

# Accesso a MySQL shell
docker-compose exec mysql mysql -u root -p

# Test MCP server (se esposto via HTTP per debug)
curl http://localhost:8080/tools

# Re-seed database (se necessario)
docker-compose exec mongodb mongosh /docker-entrypoint-initdb.d/seed-paints-data.js
docker-compose exec mysql mysql -u root -p < /docker-entrypoint-initdb.d/02-seed-data.sql

# Pull modello Ollama (esempio)
docker-compose exec ollama ollama pull llama2
```

## Testing MCP Server

**Come testare i tools MCP**:

1. Usa il MCP Inspector (tool ufficiale Anthropic)
2. Testa ogni tool individualmente
3. Verifica che i parametri vengano validati correttamente
4. Controlla che le risposte siano nel formato JSON corretto
5. Testa scenari di errore (database non disponibile, parametri invalidi, etc)

**Esempi di conversazioni di test**:

```
User: "Quali prodotti di vernice blu hai disponibili?"
→ LLM usa: search_paint_by_color({ color_name: "blu" })

User: "Mostrami i prodotti alimentari in scadenza"
→ LLM usa: get_product_batches({ status: "approved" }) + filtra per date

User: "Quali sono i fornitori di pasta?"
→ LLM usa: search_food_products({ query: "pasta" }) + list_food_suppliers()

User: "Dammi la formula per creare un rosso Ferrari"
→ LLM usa: get_color_formula({ color_name: "rosso Ferrari" })
```

## Best Practices da Seguire

- ♻️ Usa multi-stage builds per ottimizzare le immagini Docker
- 🔒 Non committare credenziali o segreti (usa .env e .gitignore)
- 📝 Commenta il codice complesso
- 🧪 Predisponi la struttura per test dei tools MCP
- 🔍 Implementa logging appropriato in tutti i servizi (specialmente MCP server)
- ⚡ Configura hot-reload per development
- 🤝 Mantieni sincronizzazione tra agenti attraverso documentazione condivisa
- 🔄 Effettua commit atomici e descrittivi per tracciare il lavoro di ogni agente
- 🗄️ **Usa transazioni quando appropriato (MySQL)**
- 📊 **Crea indici appropriati per ottimizzare le query più comuni**
- 🔗 **Documenta le relazioni tra entità per facilitare query complesse**
- 🛠️ **Ogni MCP tool deve avere descrizioni chiare per l'LLM**
- 🎯 **Testa l'integrazione end-to-end: Chat → LLM → MCP → Database**

## Workflow Multi-Agente Suggerito

1. **Infrastructure Agent** inizia con setup Docker e orchestrazione
2. **Database Agent** progetta schema e prepara seed scripts
3. **MCP Server Agent** implementa tools seguendo specifiche MCP
4. **Frontend Agent** sviluppa chat UI e integra LLM
5. **Documentation Agent** lavora continuamente durante tutto il processo

**Sincronizzazione**: Gli agenti si aggiornano reciprocamente attraverso commit documentati e aggiornamenti del copilot-instructions.md

---

**Priorità**:

1. Configurazione Docker Compose con volumi e network
2. Setup database con init scripts e seed data
3. Sviluppo MCP server con tools base
4. Testing MCP tools con MCP Inspector
5. Sviluppo frontend chat interface
6. Integrazione LLM con MCP server
7. Testing end-to-end dell'intero flusso
8. Documentazione finale con esempi di utilizzo

Utilizza agenti specializzati per parallelizzare il lavoro quando possibile. Aggiorna la documentazione incrementalmente dopo ogni milestone significativa.

## Note Importanti sul MCP Server

- Il server MCP NON espone API REST tradizionali
- Il server comunica tramite protocollo MCP (JSON-RPC over stdio/SSE)
- L'LLM scopre automaticamente i tools disponibili tramite il protocollo
- Ogni tool deve avere uno schema JSON ben definito per parametri input/output
- Il frontend comunica con l'LLM, non direttamente con il MCP server
- Riferimenti: https://modelcontextprotocol.io/
