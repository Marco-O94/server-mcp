#!/usr/bin/env node

/**
 * MCP Server - Model Context Protocol Server
 * Provides tools for querying MongoDB (Paints Industry) and MySQL (Food Industry) databases
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import pino from "pino";

// Import database clients
import { getMongoDBClient } from "./database/mongodb-client.js";
import { getMySQLClient } from "./database/mysql-client.js";

// Import Resources and Prompts
import { RESOURCES, getResourceContent } from "./resources/index.js";
import { PROMPTS, getPromptMessages } from "./prompts/index.js";

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

// Import MongoDB Analytics tools
import {
  getSalesTrendsTool,
  getRevenueByCategoryTool,
  comparePeriodsTool,
} from "./tools/mongodb/paint-analytics.js";

// Import MongoDB Customer Intelligence tools
import {
  getTopCustomersTool,
  getCustomerInsightsTool,
  getCustomerOrdersTool,
} from "./tools/mongodb/paint-customers.js";

// Import MongoDB Inventory tools
import {
  checkReorderNeededTool,
  getStockSummaryTool,
  predictStockOutTool,
  updateStockTool,
} from "./tools/mongodb/paint-inventory.js";

// Import MongoDB CRUD tools
import {
  createOrderTool,
  updateOrderStatusTool,
  addProductTool,
  updateProductTool,
  deleteProductTool,
} from "./tools/mongodb/paint-crud.js";

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
    name: "mcp-server",
    level: process.env.LOG_LEVEL || "info",
  },
  pino.destination({ dest: 2, sync: false }) // Write to stderr (fd 2) instead of stdout
);

// All available tools
const TOOLS = [
  // MongoDB Core tools (7)
  listPaintProductsTool,
  searchPaintByColorTool,
  getPaintProductDetailsTool,
  listPaintSuppliersTool,
  getColorFormulaTool,
  listPaintOrdersTool,
  getProductSalesTool,

  // MongoDB Analytics tools (3)
  getSalesTrendsTool,
  getRevenueByCategoryTool,
  comparePeriodsTool,

  // MongoDB Customer Intelligence tools (3)
  getTopCustomersTool,
  getCustomerInsightsTool,
  getCustomerOrdersTool,

  // MongoDB Inventory tools (4)
  checkReorderNeededTool,
  getStockSummaryTool,
  predictStockOutTool,
  updateStockTool,

  // MongoDB CRUD tools (5)
  createOrderTool,
  updateOrderStatusTool,
  addProductTool,
  updateProductTool,
  deleteProductTool,

  // MySQL tools (8)
  listFoodProductsTool,
  searchFoodProductsTool,
  getFoodProductDetailsTool,
  listFoodCategoriesTool,
  getProductBatchesTool,
  getLowStockProductsTool,
  listFoodSuppliersTool,
  listFoodOrdersTool,
];

class MCPDatabaseServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "mcp-database-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info("Listing available tools");
      return {
        tools: TOOLS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.info("Listing available resources");
      return {
        resources: RESOURCES,
      };
    });

    // Read resource content
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const uri = request.params.uri;
        logger.info({ uri }, "Reading resource");

        try {
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
        } catch (error) {
          logger.error({ uri, error }, "Error reading resource");
          throw error;
        }
      }
    );

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      logger.info("Listing available prompts");
      return {
        prompts: PROMPTS,
      };
    });

    // Get prompt messages
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const promptName = request.params.name;
      const args = (request.params.arguments || {}) as Record<string, string>;
      logger.info({ promptName, args }, "Getting prompt");

      const messages = getPromptMessages(promptName, args);
      return {
        messages,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      logger.info({ toolName, args: request.params.arguments }, "Tool called");

      const tool = TOOLS.find((t) => t.name === toolName);

      if (!tool) {
        logger.error({ toolName }, "Tool not found");
        throw new Error(`Unknown tool: ${toolName}`);
      }

      try {
        const result = await tool.handler(request.params.arguments ?? {});
        logger.info({ toolName, success: true }, "Tool executed successfully");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error({ toolName, error }, "Tool execution failed");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                  tool: toolName,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      logger.error({ error }, "Server error occurred");
    };

    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      await this.shutdown();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await this.shutdown();
      process.exit(0);
    });
  }

  async initialize(): Promise<void> {
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

      logger.info("MCP Database Server initialized successfully");
    } catch (error) {
      logger.error({ error }, "Failed to initialize server");
      throw error;
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info("MCP Server started with stdio transport");
  }

  async shutdown(): Promise<void> {
    logger.info("Shutting down server...");

    try {
      const mongoClient = getMongoDBClient();
      await mongoClient.disconnect();
      logger.info("MongoDB client closed");
    } catch (error) {
      logger.error({ error }, "Error closing MongoDB client");
    }

    try {
      const mysqlClient = getMySQLClient();
      await mysqlClient.disconnect();
      logger.info("MySQL client closed");
    } catch (error) {
      logger.error({ error }, "Error closing MySQL client");
    }

    await this.server.close();
    logger.info("Server shutdown complete");
  }
}

// Main execution
async function main() {
  const server = new MCPDatabaseServer();

  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.fatal({ error }, "Failed to start server");
    process.exit(1);
  }
}

main();
