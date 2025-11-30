# MCP Server Features Documentation

## Overview

The MCP Server is a TypeScript/Node.js application that exposes database tools to LLMs via the Model Context Protocol (MCP). It supports both **stdio transport** (for Claude Desktop) and **HTTP transport** (for web frontend integration).

- **Technology**: Node.js 20, TypeScript, @modelcontextprotocol/sdk
- **Transports**: stdio (JSON-RPC) + HTTP (Express on port 8080)
- **Total Tools**: 30 (22 MongoDB + 8 MySQL)
- **Resources**: 12 (schema, reference, rules, analytics)
- **Prompts**: 14 (sales, inventory, customer, reports, operations)

## Architecture

```
/mcp-server
  /src
    /tools
      /mongodb
        paint-products.ts     # Product listing
        paint-suppliers.ts    # Supplier management & color search
        paint-formulas.ts     # Color formulas
        paint-orders.ts       # Orders & product details & sales
        paint-analytics.ts    # Analytics & reporting
        paint-customers.ts    # Customer intelligence
        paint-inventory.ts    # Inventory management
        paint-crud.ts         # CRUD operations
      /mysql
        food-products.ts      # Food products
        food-categories.ts    # Categories
        food-batches.ts       # Production batches & low stock
        food-suppliers.ts     # Suppliers
        food-orders.ts        # Orders
    /resources
      index.ts                # Resource definitions & handlers
    /prompts
      index.ts                # Prompt templates & message generators
    /database
      mongodb-client.ts       # MongoDB connection pooling
      mysql-client.ts         # MySQL connection pooling
    server.ts                 # MCP stdio server (Claude Desktop)
    http-server.ts            # HTTP server (Frontend)
    types.ts                  # Shared types
```

---

## MongoDB Tools (Paints Industry) - 22 Tools

### Core Tools (7)

#### 1. list_paint_products

- **Description**: List paint and coating products with optional filters
- **Input**: `{ filter?: object, limit?: number }`
- **Example**: "Show me all paints" → lists products

#### 2. search_paint_by_color

- **Description**: Search paints by color name, hex, or finish
- **Input**: `{ color_name?: string, hex?: string, finish?: "opaco"|"satinato"|"lucido" }`
- **Example**: "Find blue matte paints" → `{ color_name: "blue", finish: "opaco" }`

#### 3. get_paint_product_details

- **Description**: Get detailed info about specific paint product by code or ObjectId
- **Input**: `{ product_id: string }`
- **Example**: "Tell me about product VBO-2024-001" → full product details

#### 4. list_paint_suppliers

- **Description**: List paint suppliers with optional filtering
- **Input**: `{ filter?: object }`
- **Example**: "Who are our paint suppliers?"

#### 5. get_color_formula

- **Description**: Get formula to create custom color with pigments and instructions
- **Input**: `{ color_name?: string, formula_id?: string }`
- **Example**: "How do I make Ferrari red?" → formula with pigments

#### 6. list_paint_orders

- **Description**: List paint orders filtered by status
- **Input**: `{ status?: string, limit?: number }`
- **Example**: "Show pending paint orders"

#### 7. get_product_sales

- **Description**: Get sales statistics for a specific product or all products
- **Input**: `{ product_code?: string, limit?: number }`
- **Example**: "How many sales for product VBO-2024-001?"

---

### Analytics & Reporting Tools (3)

#### 8. get_sales_trends

- **Description**: Get sales trends over specified time periods (daily, weekly, monthly)
- **Input**:
  ```json
  {
    "period": "daily|weekly|monthly",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "product_code": "optional filter"
  }
  ```
- **Output**: Trend data with revenue, quantity, orders per period
- **Example**: "Show me monthly sales trends for the last 6 months"

#### 9. get_revenue_by_category

- **Description**: Get revenue breakdown by product category with percentages
- **Input**: `{ start_date?: string, end_date?: string }`
- **Output**: Revenue per category (interno, esterno, industriale) with percentages
- **Example**: "What's our revenue breakdown by category?"

#### 10. compare_periods

- **Description**: Compare sales performance between two time periods
- **Input**:
  ```json
  {
    "period1_start": "YYYY-MM-DD",
    "period1_end": "YYYY-MM-DD",
    "period2_start": "YYYY-MM-DD",
    "period2_end": "YYYY-MM-DD"
  }
  ```
- **Output**: Revenue, quantity, orders comparison with growth percentages and insights
- **Example**: "Compare Q1 vs Q2 sales performance"

---

### Customer Intelligence Tools (3)

#### 11. get_top_customers

- **Description**: Get top customers ranked by revenue, orders, or quantity
- **Input**:
  ```json
  {
    "sort_by": "revenue|orders|quantity",
    "limit": 10,
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD"
  }
  ```
- **Output**: Ranked customer list with revenue share, order count, avg order value
- **Example**: "Who are our top 5 customers by revenue?"

#### 12. get_customer_insights

- **Description**: Get detailed insights and analysis for a specific customer
- **Input**: `{ customer_id: string }`
- **Output**:
  - Summary: total spent, orders, avg order value, purchase frequency
  - Preferences: favorite categories, colors, finishes
  - Top products purchased
  - Recent orders
- **Example**: "Give me insights on customer CUST-003"

#### 13. get_customer_orders

- **Description**: Get complete order history for a specific customer
- **Input**:
  ```json
  {
    "customer_id": "string (required)",
    "status": "pending|processing|shipped|delivered|cancelled",
    "limit": 20
  }
  ```
- **Output**: Full order details with items, products, dates
- **Example**: "Show all orders for customer CUST-003"

---

### Inventory Management Tools (4)

#### 14. check_reorder_needed

- **Description**: Check which products need reordering based on stock levels
- **Input**:
  ```json
  {
    "threshold": 20,
    "category": "interno|esterno|industriale",
    "include_out_of_stock": true
  }
  ```
- **Output**: Products below threshold with urgency levels (CRITICAL, HIGH, MEDIUM) and supplier info
- **Example**: "Which products need reordering?"

#### 15. get_stock_summary

- **Description**: Get stock levels summary grouped by category, type, finish, or supplier
- **Input**: `{ group_by: "category|type|finish|supplier" }`
- **Output**:
  - Totals: products, units, value
  - Per group: stock health status, out of stock count, low stock count
- **Example**: "Give me a stock summary by category"

#### 16. predict_stock_out

- **Description**: Predict when products will run out based on sales velocity
- **Input**:
  ```json
  {
    "days_lookback": 30,
    "category": "interno|esterno|industriale",
    "max_days_until_stockout": 60
  }
  ```
- **Output**: Products with estimated stockout dates and risk levels
- **Example**: "Which products will run out in the next 30 days?"

#### 17. update_stock

- **Description**: Update stock quantity for a product
- **Input**:
  ```json
  {
    "product_code": "string (required)",
    "quantity": "number (required)",
    "adjustment_type": "set|add|subtract",
    "reason": "optional audit note"
  }
  ```
- **Output**: Confirmation with previous and new stock levels
- **Example**: "Add 50 units to product VBO-2024-001"

---

### CRUD Operations (5)

#### 18. create_order

- **Description**: Create a new paint order with automatic stock reduction
- **Input**:
  ```json
  {
    "customer_id": "string (required)",
    "items": [{ "product_code": "string", "quantity": "number" }],
    "notes": "optional"
  }
  ```
- **Output**: Created order with order number, items, total, status
- **Features**:
  - Auto-generates order number (ORD-YYYY-XXXX)
  - Validates stock availability
  - Reduces stock automatically
- **Example**: "Create order for customer CUST-001 with 10 units of VBO-2024-001"

#### 19. update_order_status

- **Description**: Update order status with validation of allowed transitions
- **Input**:
  ```json
  {
    "order_number": "ORD-2024-0001 (required)",
    "new_status": "pending|processing|shipped|delivered|cancelled (required)",
    "notes": "optional"
  }
  ```
- **Status Transitions**:
  - pending → processing, cancelled
  - processing → shipped, cancelled
  - shipped → delivered
  - delivered → (none)
  - cancelled → (none)
- **Features**:
  - Validates transition rules
  - Restores stock on cancellation
  - Maintains status history
- **Example**: "Mark order ORD-2024-0001 as shipped"

#### 20. add_product

- **Description**: Add a new paint product to the catalog
- **Input**:
  ```json
  {
    "name": "string (required)",
    "code": "string (required, unique)",
    "type": "vernice|pittura|smalto|primer|fondo (required)",
    "category": "interno|esterno|industriale (required)",
    "color": { "name": "string", "hex": "#XXXXXX" },
    "finish": "opaco|satinato|lucido (required)",
    "price": "number (required)",
    "stock_quantity": "number",
    "coverage": "number (m²/L)",
    "drying_time": "string",
    "supplier_id": "ObjectId"
  }
  ```
- **Output**: Created product with ID
- **Example**: "Add new product 'Vernice Verde Natura' with code VVN-2024-001"

#### 21. update_product

- **Description**: Update an existing product's information
- **Input**:
  ```json
  {
    "product_code": "string (required)",
    "updates": {
      "name": "string",
      "price": "number",
      "category": "string",
      "finish": "string",
      "coverage": "number",
      "drying_time": "string",
      "color": { "name": "string", "hex": "string" }
    }
  }
  ```
- **Output**: Updated product details
- **Example**: "Update price of VBO-2024-001 to 49.90"

#### 22. delete_product

- **Description**: Delete a product (soft or hard delete)
- **Input**:
  ```json
  {
    "product_code": "string (required)",
    "hard_delete": "boolean (default: false)"
  }
  ```
- **Features**:
  - Soft delete: marks as inactive
  - Hard delete: permanent removal
  - Blocks deletion if product has pending orders
- **Example**: "Delete product VBO-2024-001"

---

## MySQL Tools (Food Industry) - 8 Tools

#### 1. list_food_products

- **Description**: List food products by category
- **Input**: `{ category?: string, limit?: number }`
- **Example**: "Show me all pasta products"

#### 2. search_food_products

- **Description**: Search food products by name or ingredients
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
- **Example**: "Which food products need reordering?"

#### 7. list_food_suppliers

- **Description**: List food suppliers for products
- **Input**: `{ product_id?: number }`
- **Example**: "Who supplies pasta?"

#### 8. list_food_orders

- **Description**: List customer orders
- **Input**: `{ status?: string, customer_id?: number, limit?: number }`
- **Example**: "Show delivered food orders"

---

## HTTP Endpoints

The HTTP server exposes the following endpoints:

| Method | Endpoint           | Description                           |
| ------ | ------------------ | ------------------------------------- |
| GET    | `/health`          | Health check                          |
| GET    | `/tools`           | List all available tools with schemas |
| POST   | `/tools/:toolName` | Execute a specific tool               |
| POST   | `/call-tool`       | Execute tool (alternative endpoint)   |

### Example HTTP Calls

```bash
# List all tools
curl http://localhost:8080/tools

# Execute a tool
curl -X POST http://localhost:8080/tools/get_top_customers \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'

# Health check
curl http://localhost:8080/health
```

---

## Claude Desktop Configuration

To use the MCP server with Claude Desktop, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "database-chat": {
      "command": "node",
      "args": ["/path/to/mcp-server/build/server.js"],
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

---

## Testing Tools

### Using MCP Inspector

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Run inspector pointing to MCP server
mcp-inspector npx tsx mcp-server/src/server.ts
```

### Example Queries for Chat Interface

**Analytics**:

- "Show me monthly sales trends"
- "What's our revenue by category?"
- "Compare this month vs last month sales"

**Customer Intelligence**:

- "Who are our top 10 customers?"
- "Give me insights on customer CUST-003"
- "Show order history for customer CUST-001"

**Inventory**:

- "Which products need reordering?"
- "Show stock summary by category"
- "Predict which products will run out"

**CRUD Operations**:

- "Create an order for customer CUST-001 with 10 units of VBO-2024-001"
- "Mark order ORD-2024-0001 as shipped"
- "Add 50 units to stock for VBO-2024-001"

---

## Resources (12 Total)

Resources provide static and reference data that LLMs can read for context.

### Schema Resources (4)

| URI                          | Description                       |
| ---------------------------- | --------------------------------- |
| `schema://mongodb/products`  | Paint products collection schema  |
| `schema://mongodb/orders`    | Paint orders collection schema    |
| `schema://mongodb/suppliers` | Paint suppliers collection schema |
| `schema://mysql/products`    | Food products table schema        |

### Reference Data Resources (4)

| URI                          | Description                              |
| ---------------------------- | ---------------------------------------- |
| `reference://colors`         | Paint color catalog with hex codes       |
| `reference://finishes`       | Paint finishes (opaco, satinato, lucido) |
| `reference://categories`     | Product categories for paints and food   |
| `reference://order-statuses` | Order status workflow and transitions    |

### Business Rules Resources (2)

| URI                            | Description                           |
| ------------------------------ | ------------------------------------- |
| `rules://inventory-thresholds` | Reorder thresholds and urgency levels |
| `rules://pricing`              | Pricing tiers and discount rules      |

### Analytics Snapshots (2)

| URI                             | Description                       |
| ------------------------------- | --------------------------------- |
| `analytics://inventory-summary` | Live inventory levels by category |
| `analytics://sales-summary`     | Last 30 days sales summary        |

### HTTP Resource Endpoints

```bash
# List all resources
curl http://localhost:8080/resources

# Read specific resource
curl http://localhost:8080/resources/reference://order-statuses
curl http://localhost:8080/resources/analytics://inventory-summary
```

---

## Prompts (14 Total)

Prompts are pre-defined conversation templates that guide LLMs through complex tasks.

### Sales & Analytics (3)

| Prompt            | Description                            | Required Args                                          |
| ----------------- | -------------------------------------- | ------------------------------------------------------ |
| `analyze-sales`   | Analyze sales performance for a period | start_date, end_date                                   |
| `compare-periods` | Compare two time periods               | period1_start, period1_end, period2_start, period2_end |
| `forecast-demand` | Forecast product demand                | (none)                                                 |

### Inventory Management (3)

| Prompt           | Description             | Required Args |
| ---------------- | ----------------------- | ------------- |
| `reorder-report` | Generate reorder report | (none)        |
| `stock-audit`    | Perform stock audit     | (none)        |
| `expiry-check`   | Check expiring products | (none)        |

### Customer Intelligence (2)

| Prompt                   | Description                      | Required Args |
| ------------------------ | -------------------------------- | ------------- |
| `customer-analysis`      | Analyze customer behavior        | (none)        |
| `product-recommendation` | Generate product recommendations | customer_id   |

### Report Generation (3)

| Prompt                 | Description                       | Required Args |
| ---------------------- | --------------------------------- | ------------- |
| `monthly-report`       | Generate monthly business report  | month, year   |
| `supplier-performance` | Evaluate supplier performance     | (none)        |
| `category-analysis`    | Deep analysis of product category | category      |

### Data Entry & Operations (3)

| Prompt               | Description              | Required Args |
| -------------------- | ------------------------ | ------------- |
| `new-product-wizard` | Guided product creation  | product_type  |
| `bulk-stock-update`  | Bulk stock level updates | source        |
| `order-creation`     | Guided order creation    | customer_id   |

### HTTP Prompt Endpoints

```bash
# List all prompts
curl http://localhost:8080/prompts

# Get prompt messages
curl -X POST http://localhost:8080/prompts/analyze-sales \
  -H "Content-Type: application/json" \
  -d '{"start_date":"2024-01-01","end_date":"2024-12-31"}'

curl -X POST http://localhost:8080/prompts/monthly-report \
  -H "Content-Type: application/json" \
  -d '{"month":"11","year":"2024"}'
```

---

## Technical Notes

### Logging

All loggers use Pino configured to write to **stderr** (fd 2) to avoid interfering with the MCP JSON-RPC protocol on stdout.

### Database Connections

- MongoDB: Connection pooling via native driver
- MySQL: Connection pooling via mysql2 library

### Error Handling

- All tools return structured error responses
- Validation errors are caught and returned with descriptive messages
- Database connection errors are logged and propagated

---

**Last Updated**: November 29, 2025
**Total Tools**: 30 (22 MongoDB + 8 MySQL)
**Resources**: 12 (4 schema + 4 reference + 2 rules + 2 analytics)
**Prompts**: 14 (3 sales + 3 inventory + 2 customer + 3 reports + 3 operations)
**MCP SDK Version**: 1.0.4
