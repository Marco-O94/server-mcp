# MCP Database Chat - Project Architecture

## Overview

Full-stack multi-container application implementing Model Context Protocol (MCP) to enable AI-powered natural language queries against multiple databases.

**Architecture**: `User → Chat UI (Next.js) → LLM (Ollama) → MCP Server → [MongoDB, MySQL]`

> **📖 MCP Server Features**: See [instructions/mcp-server-features.md](instructions/mcp-server-features.md) for complete tool documentation (30 tools).

## Services

| Service    | Technology                       | Port  | Purpose                         |
| ---------- | -------------------------------- | ----- | ------------------------------- |
| Frontend   | Next.js 15, React 19, TypeScript | 3000  | Chat UI with streaming          |
| MCP Server | Node.js 20, TypeScript, MCP SDK  | 8080  | Database tools via MCP protocol |
| MongoDB    | mongo:7.0                        | 27017 | Paints industry data            |
| MySQL      | mysql:8.0                        | 3306  | Food industry data              |
| Ollama     | ollama/ollama                    | 11434 | Local LLM (llama3.2/mistral)    |

## Data Flow

```
User → Chat UI → /api/chat → Ollama → Tool Selection
                                ↓
                           MCP Server → MongoDB/MySQL
                                ↓
                        Structured Data → Natural Language Response
```

## Database Schemas

### MongoDB - Paints Industry (`paints_db`)

| Collection       | Description                                | Volume |
| ---------------- | ------------------------------------------ | ------ |
| `products`       | Paint products with colors, specs, pricing | 50-100 |
| `suppliers`      | Paint suppliers with contact info          | 10-15  |
| `color_formulas` | Custom color formulas with pigments        | 20-30  |
| `orders`         | Customer orders with items                 | 30-50  |

### MySQL - Food Industry (`food_industry`)

| Table                    | Description                       | Volume |
| ------------------------ | --------------------------------- | ------ |
| `categories`             | Product categories (hierarchical) | 15-20  |
| `products`               | Food products with nutrition      | 80-120 |
| `suppliers`              | Food suppliers                    | 15-20  |
| `production_batches`     | Batches with expiry               | 50-70  |
| `customers`              | Customer records                  | 30-40  |
| `orders` + `order_items` | Order management                  | 60-100 |

## Quick Start

```bash
# Start all services
docker-compose up -d

# Wait for healthy status
docker-compose ps

# Pull Ollama model (first time)
docker-compose exec ollama ollama pull llama3.2

# Access frontend
open http://localhost:3000
```

## Development Commands

```bash
# View logs
docker-compose logs -f mcp-server

# Rebuild single service
docker-compose up -d --build mcp-server

# Database shells
docker-compose exec mongodb mongosh paints_db
docker-compose exec mysql mysql -u fooduser -pfoodpassword food_industry

# Reset databases
docker-compose down -v && docker-compose up -d
```

## Project Structure

```
db-mcp/
├── frontend/           # Next.js chat interface
│   └── src/app/api/chat/route.ts  # Ollama + MCP integration
├── mcp-server/         # MCP protocol server (30 tools)
│   └── src/tools/      # MongoDB (22) + MySQL (8) tools
├── docker-init/        # Database initialization scripts
├── docker-compose.yml  # All 5 services
└── .github/
    ├── copilot-instructions.md      # This file
    └── instructions/
        └── mcp-server-features.md   # Complete tool documentation
```

## LLM Configuration

### Default: Ollama (Local)

- Model: llama3.2 or mistral
- Endpoint: http://ollama:11434/api/chat

### Alternative: External Providers

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Troubleshooting

| Issue                     | Solution                                 |
| ------------------------- | ---------------------------------------- |
| MCP Server not connecting | `docker-compose logs mcp-server`         |
| Ollama not responding     | `docker-compose exec ollama ollama list` |
| Database errors           | `docker-compose ps` (check health)       |
| Frontend 500 errors       | Check MCP server is running on port 8080 |

## Claude Desktop Integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "database-chat": {
      "command": "node",
      "args": ["/path/to/mcp-server/build/server.js"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017/paints_db",
        "MYSQL_HOST": "localhost",
        "MYSQL_USER": "fooduser",
        "MYSQL_PASSWORD": "foodpassword",
        "MYSQL_DATABASE": "food_industry"
      }
    }
  }
}
```

---

**Last Updated**: November 29, 2025  
**MCP Tools**: 30 (22 MongoDB + 8 MySQL) - See [mcp-server-features.md](instructions/mcp-server-features.md)
