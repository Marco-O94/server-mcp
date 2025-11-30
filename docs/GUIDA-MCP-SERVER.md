# Guida Completa al Model Context Protocol (MCP) Server

## Indice

1. [Introduzione](#introduzione)
2. [Cos'è il Model Context Protocol (MCP)?](#cosè-il-model-context-protocol-mcp)
3. [Architettura del Server](#architettura-del-server)
4. [I Tre Pilastri: Tools, Resources e Prompts](#i-tre-pilastri-tools-resources-e-prompts)
5. [Creazione di un Tool](#creazione-di-un-tool)
6. [Creazione di una Resource](#creazione-di-una-resource)
7. [Creazione di un Prompt](#creazione-di-un-prompt)
8. [Trasporti: Stdio vs HTTP](#trasporti-stdio-vs-http)
9. [Gestione delle Connessioni Database](#gestione-delle-connessioni-database)
10. [Best Practices](#best-practices)
11. [Debugging e Troubleshooting](#debugging-e-troubleshooting)
12. [Configurazione per Claude Desktop](#configurazione-per-claude-desktop)

---

## Introduzione

Questa guida ti accompagnerà nella comprensione e nello sviluppo di un server MCP (Model Context Protocol). Al termine, sarai in grado di:

- Comprendere l'architettura MCP e i suoi componenti
- Creare Tools per esporre funzionalità ai modelli AI
- Definire Resources per fornire dati di contesto
- Configurare Prompts per guidare le conversazioni
- Integrare database e servizi esterni
- Debuggare e ottimizzare il tuo server

---

## Cos'è il Model Context Protocol (MCP)?

Il **Model Context Protocol (MCP)** è uno standard aperto sviluppato da Anthropic che permette ai Large Language Models (LLM) di interagire con sistemi esterni in modo sicuro e strutturato.

### Perché MCP?

Prima di MCP, ogni integrazione tra un LLM e un sistema esterno richiedeva codice personalizzato. MCP standardizza questa comunicazione, permettendo:

- **Interoperabilità**: Un server MCP funziona con qualsiasi client compatibile (Claude Desktop, applicazioni web, ecc.)
- **Sicurezza**: Le capacità sono esposte in modo controllato e documentato
- **Scalabilità**: Aggiungi nuove funzionalità senza modificare il client

### Come Funziona

```
┌─────────────┐     JSON-RPC      ┌─────────────┐     Query      ┌─────────────┐
│   Client    │◄────────────────►│  MCP Server │◄──────────────►│  Database   │
│ (Claude AI) │                   │  (Node.js)  │                │ (MongoDB)   │
└─────────────┘                   └─────────────┘                └─────────────┘
       │                                │
       │  1. Richiede lista tools       │
       │───────────────────────────────►│
       │                                │
       │  2. Restituisce tools          │
       │◄───────────────────────────────│
       │                                │
       │  3. Chiama un tool             │
       │───────────────────────────────►│
       │                                │  4. Esegue query
       │                                │─────────────────►
       │                                │
       │  5. Restituisce risultato      │◄─────────────────
       │◄───────────────────────────────│
```

---

## Architettura del Server

### Struttura del Progetto

```
mcp-server/
├── src/
│   ├── server.ts           # Server principale (trasporto stdio)
│   ├── http-server.ts      # Server HTTP per frontend
│   ├── types.ts            # Definizioni TypeScript e schemi Zod
│   │
│   ├── database/           # Client per database
│   │   ├── mongodb-client.ts
│   │   └── mysql-client.ts
│   │
│   ├── tools/              # Strumenti MCP
│   │   ├── mongodb/
│   │   │   ├── paint-products.ts
│   │   │   ├── paint-orders.ts
│   │   │   └── ...
│   │   └── mysql/
│   │       ├── food-products.ts
│   │       └── ...
│   │
│   ├── resources/          # Risorse MCP
│   │   └── index.ts
│   │
│   └── prompts/            # Template di prompt
│       └── index.ts
│
├── build/                  # Output compilato
├── package.json
└── tsconfig.json
```

### Inizializzazione del Server

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Crea il server con metadata e capabilities
const server = new Server(
  {
    name: "mcp-database-server", // Nome identificativo
    version: "1.0.0", // Versione
  },
  {
    capabilities: {
      tools: {}, // Abilita i Tools
      resources: {}, // Abilita le Resources
      prompts: {}, // Abilita i Prompts
    },
  }
);

// Avvia con trasporto stdio
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## I Tre Pilastri: Tools, Resources e Prompts

MCP espone tre tipi di primitive che un LLM può utilizzare. È fondamentale capire quando usare ciascuna.

### Confronto Rapido

| Aspetto            | Tools            | Resources              | Prompts               |
| ------------------ | ---------------- | ---------------------- | --------------------- |
| **Scopo**          | Eseguire azioni  | Fornire dati           | Guidare conversazioni |
| **Direzione**      | LLM → Sistema    | Sistema → LLM          | Sistema → LLM         |
| **Modifica dati?** | ✅ Sì            | ❌ No (sola lettura)   | ❌ No                 |
| **Quando usare**   | Query, CRUD, API | Schema, configurazioni | Workflow complessi    |
| **Esempio**        | `create_order`   | `schema://products`    | `monthly-report`      |

### Tools: Le Azioni

I **Tools** sono funzioni che il LLM può chiamare per eseguire operazioni. Sono il modo principale per interagire con sistemi esterni.

**Caratteristiche:**

- Ricevono input strutturati (JSON Schema)
- Possono modificare dati (CRUD)
- Restituiscono risultati testualI
- L'LLM decide autonomamente quando chiamarli

**Quando usare un Tool:**

- Leggere dati dinamici dal database
- Creare, modificare o eliminare record
- Chiamare API esterne
- Eseguire calcoli o elaborazioni

### Resources: I Dati di Contesto

Le **Resources** sono dati statici o semi-statici che il LLM può leggere per ottenere contesto. Pensale come "documenti" che l'AI può consultare.

**Caratteristiche:**

- Identificate da URI (`schema://mongodb/products`)
- Sola lettura
- Possono essere statiche o generate dinamicamente
- Ideali per dati di riferimento

**Quando usare una Resource:**

- Fornire schemi di database
- Esporre regole di business
- Condividere configurazioni
- Offrire snapshot di dati

### Prompts: I Template di Conversazione

I **Prompts** sono template predefiniti che guidano l'LLM attraverso task complessi. Generano messaggi strutturati con istruzioni dettagliate.

**Caratteristiche:**

- Accettano argomenti per personalizzazione
- Generano array di messaggi (system, user)
- Orchestrano l'uso di più tools
- Documentano workflow aziendali

**Quando usare un Prompt:**

- Report multi-step
- Workflow guidati
- Analisi complesse
- Onboarding utenti

---

## Creazione di un Tool

### Struttura Base di un Tool

Ogni tool deve avere quattro componenti:

```typescript
export const myTool = {
  // 1. Nome univoco (snake_case)
  name: "list_products",

  // 2. Descrizione per l'LLM (fondamentale!)
  description:
    "List all products with optional filtering by category. Use this when the user asks about products or inventory.",

  // 3. Schema degli input (JSON Schema)
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Filter by product category",
        enum: ["interno", "esterno", "industriale"],
      },
      limit: {
        type: "number",
        description: "Maximum results to return (default: 50)",
        default: 50,
      },
    },
    required: [], // Nessun parametro obbligatorio
  },

  // 4. Handler (la logica)
  handler: async (args: unknown) => {
    // Implementazione...
  },
};
```

### Esempio Completo: Tool per Prodotti

```typescript
import { getMongoDBClient } from "../../database/mongodb-client.js";
import pino from "pino";

// Logger che scrive su stderr (IMPORTANTE per MCP!)
const logger = pino(
  { name: "paint-products-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const listPaintProductsTool = {
  name: "list_paint_products",
  description:
    "List paint products from the database. Supports pagination and " +
    "filtering by paint type. Use when the user asks about available " +
    "paints, inventory, or wants to see product listings.",

  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of products to return",
        default: 50,
      },
      offset: {
        type: "number",
        description: "Number of products to skip for pagination",
        default: 0,
      },
      type: {
        type: "string",
        enum: ["acrilica", "smalto", "idropittura", "finitura", "primer"],
        description: "Filter by paint type",
      },
    },
  },

  handler: async (args: unknown) => {
    try {
      // 1. Parse e valida input
      const input = args as { limit?: number; offset?: number; type?: string };
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;

      // 2. Costruisci filtro
      const filter: any = {};
      if (input.type) {
        filter.type = input.type;
      }

      // 3. Esegui query
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const products = await db
        .collection("products")
        .find(filter)
        .skip(offset)
        .limit(limit)
        .toArray();

      const total = await db.collection("products").countDocuments(filter);

      // 4. Log per debugging
      logger.info({ count: products.length, total, filter }, "Listed products");

      // 5. Restituisci risultato formattato
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                products: products.map((p) => ({
                  id: p._id.toString(),
                  name: p.name,
                  type: p.type,
                  price: p.price_per_liter,
                  stock: p.stock_quantity,
                })),
                pagination: {
                  total,
                  limit,
                  offset,
                  has_more: offset + limit < total,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error listing products");
      throw error;
    }
  },
};
```

### Tips per Description Efficaci

La `description` è cruciale: è ciò che l'LLM legge per decidere quando usare il tool.

**❌ Cattivo:**

```typescript
description: "Get products";
```

**✅ Buono:**

```typescript
description: "List paint products with optional filtering. Use this tool when the " +
  "user asks about available products, wants to see inventory, or needs " +
  "to find paints by type, color, or price range. Returns product details " +
  "including name, code, price, and stock quantity.";
```

### Registrazione del Tool

Dopo aver creato il tool, registralo nel server:

```typescript
// In server.ts
import { listPaintProductsTool } from "./tools/mongodb/paint-products.js";

const TOOLS = [
  listPaintProductsTool,
  // ... altri tools
];

// Handler per listare i tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handler per eseguire i tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS.find((t) => t.name === request.params.name);
  if (!tool) throw new Error(`Unknown tool: ${request.params.name}`);

  return await tool.handler(request.params.arguments ?? {});
});
```

---

## Creazione di una Resource

### Struttura di una Resource

```typescript
export const RESOURCES = [
  {
    uri: "schema://mongodb/products", // URI univoco
    name: "MongoDB Products Schema", // Nome leggibile
    description: "Schema della collezione products con tutti i campi",
    mimeType: "application/json", // Tipo di contenuto
  },
];
```

### Tipi di Resources

#### 1. Resources Statiche

Dati che non cambiano frequentemente:

```typescript
// Definizione
{
  uri: "reference://order-statuses",
  name: "Order Status Workflow",
  description: "Stati validi degli ordini e transizioni permesse",
  mimeType: "application/json",
}

// Contenuto (in getResourceContent)
case "reference://order-statuses":
  return JSON.stringify({
    statuses: ["pending", "processing", "shipped", "delivered", "cancelled"],
    transitions: {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    },
    descriptions: {
      pending: "Ordine ricevuto, in attesa di elaborazione",
      processing: "Ordine in fase di preparazione",
      shipped: "Ordine spedito, in transito",
      delivered: "Ordine consegnato al cliente",
      cancelled: "Ordine annullato",
    },
  }, null, 2);
```

#### 2. Resources Dinamiche

Dati calcolati al momento della richiesta:

```typescript
// Definizione
{
  uri: "analytics://inventory-summary",
  name: "Current Inventory Summary",
  description: "Snapshot live dei livelli di inventario per categoria",
  mimeType: "application/json",
}

// Contenuto (query al database)
case "analytics://inventory-summary":
  const mongoClient = getMongoDBClient();
  const db = mongoClient.getDb();

  const summary = await db.collection("products").aggregate([
    {
      $group: {
        _id: "$category",
        total_products: { $sum: 1 },
        total_stock: { $sum: "$stock_quantity" },
        total_value: {
          $sum: { $multiply: ["$price_per_liter", "$stock_quantity"] }
        },
        avg_price: { $avg: "$price_per_liter" },
      },
    },
  ]).toArray();

  return JSON.stringify({
    generated_at: new Date().toISOString(),
    by_category: summary,
  }, null, 2);
```

### Handler per Resources

```typescript
// Lista delle resources disponibili
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

// Lettura di una specifica resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const content = await getResourceContent(uri);

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: content,
      },
    ],
  };
});
```

---

## Creazione di un Prompt

### Struttura di un Prompt

```typescript
export const PROMPTS = [
  {
    name: "analyze-sales", // Nome univoco
    description: "Analizza le vendite di un periodo specifico",
    arguments: [
      // Parametri richiesti
      {
        name: "start_date",
        description: "Data inizio (YYYY-MM-DD)",
        required: true,
      },
      {
        name: "end_date",
        description: "Data fine (YYYY-MM-DD)",
        required: true,
      },
    ],
  },
];
```

### Generazione dei Messaggi

Un prompt genera un array di messaggi che guidano l'LLM:

```typescript
export function getPromptMessages(
  name: string,
  args: Record<string, string>
): Array<{ role: string; content: { type: string; text: string } }> {
  switch (name) {
    case "analyze-sales":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Analizza le performance di vendita dal ${args.start_date} al ${args.end_date}.

Per favore esegui questi passaggi:

1. **Panoramica Generale**
   - Usa \`get_sales_trends\` con period="daily" per vedere i trend
   - Calcola ricavi totali, ordini totali e prodotti venduti

2. **Analisi per Categoria**
   - Usa \`get_revenue_by_category\` per vedere la distribuzione
   - Identifica la categoria più performante e quella meno

3. **Top Performer**
   - Usa \`get_top_customers\` per i migliori clienti (limit: 5)
   - Identifica pattern nei loro acquisti

4. **Insights e Raccomandazioni**
   - Trend positivi/negativi
   - Anomalie o picchi
   - Suggerimenti per migliorare le vendite

Presenta i risultati in modo chiaro con tabelle dove appropriato.`,
          },
        },
      ];

    case "monthly-report":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Genera il report mensile per ${args.month}/${args.year}.

Il report deve includere:

## 📊 Executive Summary
- KPI principali del mese

## 💰 Performance Vendite
- Ricavi totali vs mese precedente
- Usa \`compare_periods\` per il confronto

## 📦 Stato Inventario  
- Usa \`get_stock_summary\` per overview
- Usa \`check_reorder_needed\` per prodotti critici

## 👥 Analisi Clienti
- Nuovi clienti vs clienti ricorrenti
- Top 5 clienti per valore

## ⚠️ Azioni Richieste
- Prodotti da riordinare urgentemente
- Follow-up necessari

Formatta il report in modo professionale.`,
          },
        },
      ];

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}
```

### Handler per Prompts

```typescript
// Lista dei prompts disponibili
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: PROMPTS };
});

// Ottieni messaggi per un prompt specifico
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments || {};

  const messages = getPromptMessages(name, args);
  return { messages };
});
```

---

## Trasporti: Stdio vs HTTP

MCP supporta diversi metodi di comunicazione tra client e server.

### Trasporto Stdio

Utilizzato da **Claude Desktop** e altri client locali. La comunicazione avviene tramite stdin/stdout.

```typescript
// server.ts - Per Claude Desktop
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Vantaggi:**

- Zero configurazione di rete
- Sicuro (nessuna porta aperta)
- Ideale per uso locale

**Svantaggi:**

- Solo processi locali
- Un client alla volta

### Trasporto HTTP

Utilizzato per **applicazioni web** e integrazioni remote.

```typescript
// http-server.ts - Per frontend
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint per listare tools
app.get("/tools", (req, res) => {
  const tools = Object.values(TOOLS).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
  res.json({ tools });
});

// Endpoint per eseguire un tool
app.post("/tools/:toolName", async (req, res) => {
  const tool = TOOLS[req.params.toolName];
  if (!tool) {
    return res.status(404).json({ error: "Tool not found" });
  }

  try {
    const result = await tool.handler(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(8080);
```

**Vantaggi:**

- Accessibile da rete
- Multipli client simultanei
- Integrazione con frontend

**Svantaggi:**

- Richiede gestione sicurezza
- Configurazione CORS

### Quando Usare Quale

| Scenario         | Trasporto | Motivo                       |
| ---------------- | --------- | ---------------------------- |
| Claude Desktop   | Stdio     | Nativo, sicuro               |
| Applicazione web | HTTP      | Accessibilità browser        |
| Microservizi     | HTTP      | Comunicazione inter-processo |
| CLI tool         | Stdio     | Semplicità                   |
| Mobile app       | HTTP      | Accessibilità remota         |

---

## Gestione delle Connessioni Database

### Pattern Singleton

Per evitare connessioni multiple, usa il pattern singleton:

```typescript
// database/mongodb-client.ts
import { MongoClient, Db } from "mongodb";

export class MongoDBClient {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private readonly uri: string;
  private readonly dbName: string;

  constructor(uri: string, dbName: string = "paints_db") {
    this.uri = uri;
    this.dbName = dbName;
  }

  async connect(): Promise<void> {
    if (this.client) return; // Già connesso

    this.client = new MongoClient(this.uri);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    logger.info({ dbName: this.dbName }, "Connected to MongoDB");
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }
}

// Singleton
let instance: MongoDBClient | null = null;

export function getMongoDBClient(): MongoDBClient {
  if (!instance) {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    instance = new MongoDBClient(uri);
  }
  return instance;
}
```

### Inizializzazione all'Avvio

```typescript
// server.ts
async function main() {
  // 1. Inizializza database
  const mongoClient = getMongoDBClient();
  await mongoClient.connect();

  const mysqlClient = getMySQLClient();
  await mysqlClient.connect();

  // 2. Avvia server MCP
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Gestione shutdown graceful
process.on("SIGINT", async () => {
  await mongoClient.disconnect();
  await mysqlClient.disconnect();
  process.exit(0);
});
```

---

## Best Practices

### 1. Logging su Stderr

**CRITICO**: I log devono andare su `stderr` (fd 2), non `stdout`. Il protocollo MCP usa `stdout` per JSON-RPC.

```typescript
// ✅ Corretto
const logger = pino(
  { name: "my-tool" },
  pino.destination({ dest: 2, sync: false }) // stderr
);

// ❌ SBAGLIATO - Rompe il protocollo MCP!
console.log("Debug message"); // Va su stdout
```

### 2. Gestione Errori Robusta

```typescript
handler: async (args: unknown) => {
  try {
    // Logica principale
    const result = await doSomething(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  } catch (error) {
    logger.error({ error, args }, "Tool execution failed");

    // Restituisci errore strutturato, non lanciare
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
            details: "Check server logs for more information",
          }),
        },
      ],
      isError: true,
    };
  }
};
```

### 3. Validazione Input

Usa Zod per validare gli input:

```typescript
import { z } from "zod";

const InputSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  category: z.enum(["interno", "esterno", "industriale"]).optional(),
});

handler: async (args: unknown) => {
  const input = InputSchema.parse(args); // Valida e fornisce default
  // ...
};
```

### 4. Descrizioni Dettagliate

Le descrizioni guidano l'LLM. Sii specifico:

```typescript
// Tool
description: "Search paint products by color name, hex code, or finish type. " +
  "Returns matching products with availability and pricing. " +
  "Use when user asks to find paints of a specific color or finish.";

// Resource
description: "Valid order statuses and allowed transitions between them. " +
  "Read this before creating or updating orders to ensure valid status flow.";

// Prompt
description: "Generate a comprehensive monthly business report including sales, " +
  "inventory, and customer analysis. Requires month and year parameters.";
```

### 5. Formattazione Output

Restituisci JSON ben formattato e leggibile:

```typescript
return {
  content: [
    {
      type: "text",
      text: JSON.stringify(
        {
          success: true,
          data: result,
          metadata: {
            timestamp: new Date().toISOString(),
            count: result.length,
          },
        },
        null,
        2 // Indentazione per leggibilità
      ),
    },
  ],
};
```

### 6. Organizzazione Codice

Raggruppa tools correlati in file separati:

```
tools/
├── mongodb/
│   ├── paint-products.ts   # CRUD prodotti
│   ├── paint-orders.ts     # Gestione ordini
│   ├── paint-analytics.ts  # Analisi e report
│   ├── paint-inventory.ts  # Gestione stock
│   └── paint-customers.ts  # Intelligence clienti
└── mysql/
    ├── food-products.ts
    └── food-orders.ts
```

---

## Debugging e Troubleshooting

### Problemi Comuni

| Problema                | Causa                   | Soluzione                         |
| ----------------------- | ----------------------- | --------------------------------- |
| Claude non vede i tools | `console.log` su stdout | Usa logger su stderr              |
| Tool restituisce vuoto  | Connessione DB fallita  | Verifica URI nel .env             |
| Timeout                 | Query troppo lenta      | Aggiungi indici, limita risultati |
| "Unknown tool"          | Tool non registrato     | Verifica import e array TOOLS     |

### Verifica via HTTP

```bash
# Lista tutti i tools
curl http://localhost:8080/tools | jq

# Esegui un tool
curl -X POST http://localhost:8080/tools/list_paint_products \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}' | jq

# Lista resources
curl http://localhost:8080/resources | jq

# Leggi una resource
curl "http://localhost:8080/resources/reference://order-statuses" | jq

# Lista prompts
curl http://localhost:8080/prompts | jq
```

### MCP Inspector

Strumento ufficiale per debug:

```bash
# Installa
npm install -g @modelcontextprotocol/inspector

# Esegui
mcp-inspector npx tsx mcp-server/src/server.ts
```

### Log del Container Docker

```bash
# Segui i log in tempo reale
docker-compose logs -f mcp-server

# Ultimi 100 log
docker-compose logs --tail=100 mcp-server
```

---

## Configurazione per Claude Desktop

### File di Configurazione

Percorso: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "database-chat": {
      "command": "node",
      "args": ["/percorso/assoluto/mcp-server/build/server.js"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017/paints_db",
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "fooduser",
        "MYSQL_PASSWORD": "foodpassword",
        "MYSQL_DATABASE": "food_industry"
      }
    }
  }
}
```

### Verifica Configurazione

1. **Riavvia Claude Desktop** dopo modifiche al config
2. **Apri una nuova chat** e chiedi "Quali tools hai disponibili?"
3. **Controlla i log** di Claude per errori

### Uso con Docker

Se il server MCP gira in Docker, usa questo config:

```json
{
  "mcpServers": {
    "database-chat": {
      "command": "docker",
      "args": ["exec", "-i", "mcp-server", "node", "/app/build/server.js"]
    }
  }
}
```

---

## Riepilogo

### Checklist per Nuovo Tool

- [ ] Nome in `snake_case`
- [ ] Description dettagliata
- [ ] inputSchema con tutti i parametri
- [ ] Handler con try/catch
- [ ] Logging su stderr
- [ ] Validazione input
- [ ] Output formattato JSON
- [ ] Registrato in TOOLS array
- [ ] Testato via HTTP o Inspector
- [ ] Documentato

### Checklist per Nuova Resource

- [ ] URI con schema appropriato (`schema://`, `reference://`, `analytics://`)
- [ ] Description chiara
- [ ] Contenuto JSON valido
- [ ] Registrata in RESOURCES array
- [ ] Handler in getResourceContent()
- [ ] Testata via HTTP

### Checklist per Nuovo Prompt

- [ ] Nome descrittivo
- [ ] Argomenti ben documentati
- [ ] Messaggi con istruzioni chiare
- [ ] Riferimenti ai tools da usare
- [ ] Registrato in PROMPTS array
- [ ] Handler in getPromptMessages()
- [ ] Testato via HTTP

---

## Risorse Aggiuntive

- [Documentazione MCP Ufficiale](https://modelcontextprotocol.io/)
- [MCP SDK su GitHub](https://github.com/modelcontextprotocol/sdk)
- [Esempi di Server MCP](https://github.com/modelcontextprotocol/servers)
- [Claude Desktop Documentation](https://claude.ai/docs)

---

**Versione**: 1.0  
**Ultimo Aggiornamento**: Novembre 2025  
**Autore**: MCP Database Chat Team
