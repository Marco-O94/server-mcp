# MCP Database Chat - Project Architecture

## Overview

Full-stack multi-container application implementing Model Context Protocol (MCP) to enable AI-powered natural language queries against multiple databases.

**Architecture**: `User → Chat UI (Next.js) → LLM (Ollama) → MCP Server → [MongoDB, MySQL]`

## Services

### Frontend - Next.js Chat Interface (Port 3000)

- **Technology**: Next.js 15, React 19, TypeScript, shadcn-ui, Tailwind CSS
- **Features**:
  - Modern chat interface with streaming responses
  - Dark mode UI with shadcn components
  - Integration with Ollama via Vercel AI SDK
  - Real-time message streaming
  - Responsive design
- **API Route**: `/api/chat` - Handles LLM communication and tool calling
- **Environment**:
  - `OLLAMA_BASE_URL`: http://ollama:11434/v1
  - `OLLAMA_MODEL`: llama3.2
  - `MCP_SERVER_URL`: http://mcp-server:8080

### MCP Server - TypeScript/Node.js (Port 8080)

- **Technology**: Node.js 20, TypeScript, @modelcontextprotocol/sdk
- **Transport**: stdio (JSON-RPC)
- **Purpose**: Expose database tools to LLM via MCP protocol
- **Features**:
  - Connection pooling for MongoDB and MySQL
  - Structured logging with Pino
  - Error handling and validation
  - Health checks
- **Architecture**:
  ```
  /mcp-server
    /src
      /tools
        /mongodb (6 tools for paints industry)
        /mysql (8 tools for food industry)
      /database
        mongodb-client.ts
        mysql-client.ts
      server.ts
      types.ts
  ```

### MongoDB - Paints & Coatings Industry (Port 27017)

- **Image**: mongo:7.0
- **Database**: `paints_db`
- **Collections**:
  - `products`: Paint products with colors, specs, pricing
  - `suppliers`: Paint suppliers
  - `color_formulas`: Custom color formulas
  - `orders`: Customer orders
- **Data Volume**: 50-100 products, 10-15 suppliers, 20-30 formulas, 30-50 orders

### MySQL - Food Industry (Port 3306)

- **Image**: mysql:8.0
- **Database**: `food_industry`
- **Tables**:
  - `categories`: Product categories with hierarchy
  - `products`: Food products with nutritional info
  - `suppliers`: Food suppliers
  - `product_suppliers`: Many-to-many relation
  - `production_batches`: Production batches with expiry
  - `customers`: Customer records
  - `orders` + `order_items`: Order management
- **Data Volume**: 15-20 categories, 80-120 products, 50-70 batches, 30-40 customers, 60-100 orders

### Ollama - Local LLM (Port 11434)

- **Image**: ollama/ollama:latest
- **Default Model**: llama3.2
- **Purpose**: Run LLM locally for AI chat responses
- **API**: OpenAI-compatible endpoint at `/v1`

## Data Flow

1. **User** types question in chat UI
2. **Frontend** sends message to `/api/chat`
3. **Chat API** calls **Ollama** with message and available MCP tools
4. **Ollama** decides which tool(s) to use
5. **Frontend** proxies tool calls to **MCP Server**
6. **MCP Server** queries **MongoDB** or **MySQL**
7. **MCP Server** returns structured data
8. **Ollama** formats response in natural language
9. **Frontend** streams response to user

## MCP Tools Available

### MongoDB Tools (Paints Industry)

#### 1. list_paint_products

- **Description**: List paint and coating products with optional filters
- **Input**: `{ filter?: object, limit?: number }`
- **Example**: "Show me all paints" → lists products

#### 2. search_paint_by_color

- **Description**: Search paints by color name, hex, or finish
- **Input**: `{ color_name?: string, hex?: string, finish?: "opaco"|"satinato"|"lucido" }`
- **Example**: "Find blue matte paints" → `{ color_name: "blue", finish: "opaco" }`

#### 3. get_paint_product_details

- **Description**: Get detailed info about specific paint product
- **Input**: `{ product_id: string }`
- **Example**: "Tell me about product XYZ" → full product details

#### 4. list_paint_suppliers

- **Description**: List paint suppliers
- **Input**: `{ filter?: object }`
- **Example**: "Who are our paint suppliers?"

#### 5. get_color_formula

- **Description**: Get formula to create custom color
- **Input**: `{ color_name?: string, formula_id?: string }`
- **Example**: "How do I make Ferrari red?" → formula with pigments

#### 6. list_paint_orders

- **Description**: List paint orders by status
- **Input**: `{ status?: string, limit?: number }`
- **Example**: "Show pending paint orders"

### MySQL Tools (Food Industry)

#### 1. list_food_products

- **Description**: List food products by category
- **Input**: `{ category?: string, limit?: number }`
- **Example**: "Show me all pasta products"

#### 2. search_food_products

- **Description**: Search food products by name/ingredients
- **Input**: `{ query: string, category?: string }`
- **Example**: "Find products with tomatoes"

#### 3. get_food_product_details

- **Description**: Get detailed product info including nutrition
- **Input**: `{ product_id: number }`
- **Example**: "Nutritional info for product 123"

#### 4. list_food_categories

- **Description**: List all food categories with hierarchy
- **Input**: `{}`
- **Example**: "What food categories do we have?"

#### 5. get_product_batches

- **Description**: Get production batches with expiry dates
- **Input**: `{ product_id?: number, status?: string }`
- **Example**: "Show batches expiring soon"

#### 6. get_low_stock_products

- **Description**: Find products below reorder threshold
- **Input**: `{ threshold?: number }`
- **Example**: "Which products need reordering?"

#### 7. list_food_suppliers

- **Description**: List food suppliers for products
- **Input**: `{ product_id?: number }`
- **Example**: "Who supplies pasta?"

#### 8. list_food_orders

- **Description**: List customer orders
- **Input**: `{ status?: string, customer_id?: number, limit?: number }`
- **Example**: "Show delivered orders"

## Database Schemas

### MongoDB - Paints Industry

```javascript
// products collection
{
  _id: ObjectId,
  name: "Vernice Blu Oceano",
  code: "VBO-2024-001",
  type: "vernice", // pittura, smalto, primer
  category: "esterno", // interno, industriale
  color: {
    name: "Blu Oceano",
    hex: "#0077BE",
    rgb: "0,119,190",
    pantone: "Process Blue C"
  },
  finish: "satinato", // opaco, lucido
  coverage: 12.5, // m²/L
  drying_time: "4-6 ore",
  price: 45.90,
  stock_quantity: 150,
  supplier_id: ObjectId,
  certifications: ["VOC Low", "EU Ecolabel"],
  technical_specs: {
    viscosity: "85-95 KU",
    density: "1.35 g/ml",
    voc_content: "45 g/L"
  },
  created_at: ISODate,
  updated_at: ISODate
}

// suppliers collection
{
  _id: ObjectId,
  name: "ColorTech Industries",
  contact_info: { email, phone, address },
  products_supplied: [ObjectId],
  payment_terms: "Net 30",
  rating: 4.5
}

// color_formulas collection
{
  _id: ObjectId,
  final_color: "Rosso Ferrari",
  base_color: "Base Bianca",
  pigments: [
    { pigment_id: "P-RED-123", quantity: 50, unit: "ml" },
    { pigment_id: "P-YELLOW-45", quantity: 5, unit: "ml" }
  ],
  mixing_instructions: "..."
}

// orders collection
{
  _id: ObjectId,
  order_number: "ORD-2024-001",
  customer_id: ObjectId,
  items: [
    { product_id: ObjectId, quantity: 10, price: 45.90 }
  ],
  total_amount: 459.00,
  status: "delivered", // pending, processing, shipped
  delivery_date: ISODate,
  created_at: ISODate
}
```

### MySQL - Food Industry

```sql
-- ER Diagram Relationships:
-- categories (self-referencing for hierarchy)
-- products → categories (FK)
-- product_suppliers → products, suppliers (composite PK)
-- production_batches → products (FK)
-- orders → customers (FK)
-- order_items → orders, products, batches (FKs)

-- Key indexes:
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_batches_expiry ON production_batches(expiration_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
```

## LLM Configuration

### Using Ollama (Default)

1. Ollama container runs llama3.2 model
2. Frontend connects via OpenAI-compatible API
3. Models available: llama3.2, mistral, codellama
4. Pull models: `docker-compose exec ollama ollama pull <model>`

### Alternative: External Providers

Set in `.env`:

```bash
# For OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# For Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

Update `frontend/src/app/api/chat/route.ts` to use different provider.

## Development Workflow

### First Time Setup

```bash
# 1. Clone and navigate
cd "db mcp"

# 2. Copy environment file
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Wait for services to be healthy (check logs)
docker-compose logs -f

# 5. Pull Ollama model (first time)
docker-compose exec ollama ollama pull llama3.2

# 6. Access frontend
open http://localhost:3000
```

### Daily Development

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f frontend
docker-compose logs -f mcp-server

# Restart single service after code changes
docker-compose restart mcp-server

# Stop all
docker-compose down
```

### Database Access

```bash
# MongoDB shell
docker-compose exec mongodb mongosh -u admin -p mongopassword paints_db

# MySQL shell
docker-compose exec mysql mysql -u fooduser -p food_industry
# Password: foodpassword

# Re-seed databases
docker-compose restart mongodb mysql
```

### Testing MCP Tools

#### Using MCP Inspector (Recommended)

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Run inspector pointing to MCP server
mcp-inspector npx tsx mcp-server/src/server.ts
```

#### Direct Testing via Frontend

Try these example queries in the chat:

**Paint Queries**:

- "Show me all blue paints"
- "What paints do we have in stock?"
- "Give me details about paint VBO-2024-001"
- "How do I create Ferrari red color?"
- "List pending paint orders"

**Food Queries**:

- "What food categories exist?"
- "Show me pasta products"
- "Which products are low in stock?"
- "List batches expiring this month"
- "Show all delivered orders"

**Cross-Database**:

- "Compare inventory levels between paints and food"

## Seed Data Information

### MongoDB (Paints)

- **Location**: `docker-init/mongodb/02-seed-paints-data.js`
- **Initialization**: Automatic on first MongoDB container start
- **Content**:
  - 50-100 diverse paint products (interior, exterior, industrial)
  - Various colors (hex codes, Pantone references)
  - Different finishes (matte, satin, glossy)
  - 10-15 suppliers with contact info
  - 20-30 custom color formulas
  - 30-50 orders in various statuses

### MySQL (Food)

- **Location**: `docker-init/mysql/02-seed-data.sql`
- **Initialization**: Automatic on first MySQL container start
- **Content**:
  - 15-20 hierarchical categories (pasta, dairy, meat, beverages, etc.)
  - 80-120 products with nutritional info, allergens
  - 15-20 suppliers with ratings
  - 50-70 production batches with expiry tracking
  - 30-40 customers (retailers, wholesalers, restaurants)
  - 60-100 orders with line items

### Regenerating Seed Data

```bash
# Complete reset
docker-compose down -v
docker-compose up -d

# Re-run init scripts manually
docker-compose exec mongodb mongosh /docker-entrypoint-initdb.d/02-seed-paints-data.js
docker-compose exec mysql mysql -u root -p < /docker-entrypoint-initdb.d/02-seed-data.sql
```

## Agent Responsibilities (Development)

### 🏗️ Infrastructure Agent

- ✅ Docker Compose configuration (all 5 services)
- ✅ Network setup (app-network bridge)
- ✅ Volume management (mongodb_data, mysql_data, ollama_data)
- ✅ Health checks for all services
- ✅ Environment variables structure

### 🗄️ Database Agent

- ✅ MongoDB schema design (4 collections)
- ✅ MySQL schema design (8 tables with relations)
- ✅ Seed data generation scripts
- ✅ Indexes for query optimization
- ✅ Data relationships documentation

### ⚙️ MCP Server Agent

- ✅ MCP protocol implementation with official SDK
- ✅ 14 total tools (6 MongoDB + 8 MySQL)
- ✅ Database clients with connection pooling
- ✅ Input validation with Zod schemas
- ✅ Error handling and structured logging
- ✅ Dockerfile with multi-stage build

### 🎨 Frontend Agent

- ✅ Next.js 15 with React 19
- ✅ shadcn-ui components (Avatar, ScrollArea, Button)
- ✅ Chat interface with streaming
- ✅ Ollama integration via AI SDK
- ✅ Tool calling proxied to MCP server
- ✅ Dark mode and responsive design
- ✅ Dockerfile for development and production

### 📚 Documentation Agent

- ✅ This copilot-instructions.md
- ✅ README.md with quickstart
- ✅ Environment variables documentation
- ✅ Database schema documentation
- ✅ MCP tools reference
- ✅ Example queries and workflows

## Project Structure

```
db-mcp/
├── .github/
│   └── core-project.md          # Original project requirements
├── docker-init/
│   ├── mongodb/
│   │   ├── 01-init-mongo.js     # MongoDB initialization
│   │   └── 02-seed-paints-data.js  # Paint industry seed data
│   └── mysql/
│       ├── 01-schema.sql        # MySQL schema creation
│       └── 02-seed-data.sql     # Food industry seed data
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/chat/route.ts  # AI chat endpoint with tools
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── chat.tsx         # Main chat component
│   │   │   └── ui/              # shadcn-ui components
│   │   └── lib/
│   │       └── utils.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
├── mcp-server/
│   ├── src/
│   │   ├── tools/
│   │   │   ├── mongodb/         # 6 MongoDB tools
│   │   │   └── mysql/           # 8 MySQL tools
│   │   ├── database/
│   │   │   ├── mongodb-client.ts
│   │   │   └── mysql-client.ts
│   │   ├── server.ts            # MCP server entry point
│   │   └── types.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml           # All 5 services orchestration
├── .env.example                 # Environment template
├── .gitignore
├── README.md                    # Main project README
└── .github/copilot-instructions.md  # This file
```

## Recent Changes

### 2024-11-22 - Initial Project Setup

- **Infrastructure Agent**: Created complete Docker Compose with 5 services
- **Database Agent**: Designed schemas and seed data for MongoDB and MySQL
- **MCP Server Agent**: Implemented 14 tools with MCP SDK, database clients, logging
- **Frontend Agent**: Built Next.js chat UI with shadcn-ui, Ollama integration
- **Documentation Agent**: Created comprehensive documentation structure

## Next Steps / Roadmap

1. ✅ **MVP Complete**: All core components functional
2. 🔄 **Testing Phase**: Test all 14 MCP tools with various queries
3. 📊 **Performance**: Add caching layer for frequent queries
4. 🔐 **Security**: Add authentication/authorization
5. 📈 **Monitoring**: Add logging aggregation and metrics
6. 🧪 **E2E Tests**: Automated testing for chat flows
7. 🚀 **Production**: Deployment guide for cloud platforms

## Troubleshooting

### MCP Server not connecting

```bash
# Check MCP server logs
docker-compose logs mcp-server

# Verify databases are healthy
docker-compose ps

# Restart MCP server
docker-compose restart mcp-server
```

### Ollama model not responding

```bash
# Check if model is pulled
docker-compose exec ollama ollama list

# Pull model if missing
docker-compose exec ollama ollama pull llama3.2

# Check Ollama logs
docker-compose logs ollama
```

### Frontend not loading

```bash
# Check Next.js build
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

### Database connection issues

```bash
# Check database health
docker-compose ps

# Test MongoDB connection
docker-compose exec mongodb mongosh -u admin -p mongopassword --eval "db.serverStatus()"

# Test MySQL connection
docker-compose exec mysql mysqladmin -u root -p ping
```

---

**Last Updated**: November 22, 2024
**Project Version**: 1.0.0
**MCP SDK Version**: 1.0.4
**Next.js Version**: 15.0.3
