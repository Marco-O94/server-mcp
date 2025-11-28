#!/usr/bin/env node

/**
 * HTTP Server for MCP Tools
 * Exposes MCP tools via HTTP endpoints for frontend integration
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pino from "pino";

// Import database clients
import { getMongoDBClient } from "./database/mongodb-client.js";
import { getMySQLClient } from "./database/mysql-client.js";

// Import MongoDB tools
import { listPaintProductsTool } from "./tools/mongodb/paint-products.js";
import { searchPaintByColorTool } from "./tools/mongodb/paint-suppliers.js";
import { listPaintSuppliersTool } from "./tools/mongodb/paint-suppliers.js";
import { getColorFormulaTool } from "./tools/mongodb/paint-formulas.js";
import {
  getPaintProductDetailsTool,
  listPaintOrdersTool,
  getProductSalesTool,
} from "./tools/mongodb/paint-orders.js";

// Import MySQL tools
import { listFoodProductsTool } from "./tools/mysql/food-products.js";
import { searchFoodProductsTool } from "./tools/mysql/food-products.js";
import { getFoodProductDetailsTool } from "./tools/mysql/food-products.js";
import { listFoodCategoriesTool } from "./tools/mysql/food-categories.js";
import { getProductBatchesTool } from "./tools/mysql/food-batches.js";
import { getLowStockProductsTool } from "./tools/mysql/food-batches.js";
import { listFoodSuppliersTool } from "./tools/mysql/food-suppliers.js";
import { listFoodOrdersTool } from "./tools/mysql/food-orders.js";

// Load environment variables
dotenv.config();

const logger = pino(
  {
    name: "mcp-http-server",
    level: process.env.LOG_LEVEL || "info",
  },
  pino.destination({ dest: 2, sync: false })
);

// All available tools mapped by name
const TOOLS = {
  list_paint_products: listPaintProductsTool,
  search_paint_by_color: searchPaintByColorTool,
  get_paint_product_details: getPaintProductDetailsTool,
  list_paint_suppliers: listPaintSuppliersTool,
  get_color_formula: getColorFormulaTool,
  list_paint_orders: listPaintOrdersTool,
  get_product_sales: getProductSalesTool,
  list_food_products: listFoodProductsTool,
  search_food_products: searchFoodProductsTool,
  get_food_product_details: getFoodProductDetailsTool,
  list_food_categories: listFoodCategoriesTool,
  get_product_batches: getProductBatchesTool,
  get_low_stock_products: getLowStockProductsTool,
  list_food_suppliers: listFoodSuppliersTool,
  list_food_orders: listFoodOrdersTool,
};

const app = express();
const PORT = process.env.MCP_SERVER_PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, "HTTP request");
  next();
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// List available tools
app.get("/tools", (_req, res) => {
  const toolsList = Object.keys(TOOLS).map((name) => ({
    name,
    description: TOOLS[name as keyof typeof TOOLS].description,
    inputSchema: TOOLS[name as keyof typeof TOOLS].inputSchema,
  }));

  res.json({ tools: toolsList });
});

// Execute tool endpoint
app.post("/tools/:toolName", async (req, res) => {
  const { toolName } = req.params;
  const args = req.body;

  logger.info({ toolName, args }, "Tool execution request");

  const tool = TOOLS[toolName as keyof typeof TOOLS];

  if (!tool) {
    logger.error({ toolName }, "Tool not found");
    return res.status(404).json({ error: `Unknown tool: ${toolName}` });
  }

  try {
    const result = await tool.handler(args);
    logger.info({ toolName, success: true }, "Tool executed successfully");
    return res.json(result);
  } catch (error) {
    logger.error({ toolName, error }, "Tool execution failed");
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      tool: toolName,
    });
  }
});

// Initialize databases and start server
async function main() {
  try {
    logger.info("Initializing database connections...");

    // Initialize MongoDB
    const mongoClient = getMongoDBClient();
    await mongoClient.connect();
    logger.info("MongoDB client initialized");

    // Initialize MySQL
    const mysqlClient = getMySQLClient();
    await mysqlClient.connect();
    logger.info("MySQL client initialized");

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "MCP HTTP Server started");
      console.log(`🚀 MCP HTTP Server running on http://localhost:${PORT}`);
      console.log(`📋 Tools list: http://localhost:${PORT}/tools`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down server...");

      try {
        await mongoClient.disconnect();
        logger.info("MongoDB client closed");
      } catch (error) {
        logger.error({ error }, "Error closing MongoDB client");
      }

      try {
        await mysqlClient.disconnect();
        logger.info("MySQL client closed");
      } catch (error) {
        logger.error({ error }, "Error closing MySQL client");
      }

      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.fatal({ error }, "Failed to start server");
    process.exit(1);
  }
}

main();
