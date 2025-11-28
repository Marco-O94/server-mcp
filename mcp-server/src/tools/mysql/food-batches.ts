import { getMySQLClient } from "../../database/mysql-client.js";
import {
  GetProductBatchesInputSchema,
  GetLowStockProductsInputSchema,
} from "../../types.js";
import pino from "pino";

const logger = pino(
  { name: "food-batches-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const getProductBatchesTool = {
  name: "get_product_batches",
  description:
    "Get all production batches for a specific food product, including quality status and expiry information.",
  inputSchema: {
    type: "object",
    properties: {
      product_id: {
        type: "number",
        description: "Product ID to get batches for",
      },
      quality_status: {
        type: "string",
        enum: ["passed", "pending", "failed"],
        description: "Optional filter by quality status",
      },
    },
    required: ["product_id"],
  },
  handler: async (args: unknown) => {
    try {
      const input = GetProductBatchesInputSchema.parse(args);
      const mysqlClient = getMySQLClient();

      let query = `
        SELECT b.*, p.name as product_name, p.barcode
        FROM production_batches b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.product_id = ?
      `;
      const params: any[] = [input.product_id];

      if (input.quality_status) {
        query += " AND b.quality_status = ?";
        params.push(input.quality_status);
      }

      query += " ORDER BY b.production_date DESC";

      const batches = await mysqlClient.query(query, params);

      logger.info(
        { product_id: input.product_id, count: batches.length },
        "Retrieved product batches"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                product_id: input.product_id,
                batches_count: batches.length,
                batches,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving product batches");
      throw error;
    }
  },
};

export const getLowStockProductsTool = {
  name: "get_low_stock_products",
  description:
    "Get products that are running low on stock (below minimum threshold). Helps identify products that need reordering.",
  inputSchema: {
    type: "object",
    properties: {
      threshold_percentage: {
        type: "number",
        description: "Percentage threshold for low stock alert (default: 20%)",
        default: 20,
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = GetLowStockProductsInputSchema.parse(args);
      const mysqlClient = getMySQLClient();

      const query = `
        SELECT p.*, c.name as category_name, s.name as supplier_name,
               (p.stock_quantity / p.minimum_stock * 100) as stock_percentage
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.is_active = 1
        AND p.stock_quantity < (p.minimum_stock * (? / 100))
        ORDER BY (p.stock_quantity / p.minimum_stock) ASC
      `;

      const products = await mysqlClient.query(query, [
        input.threshold_percentage,
      ]);

      logger.info(
        { count: products.length, threshold: input.threshold_percentage },
        "Retrieved low stock products"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                threshold_percentage: input.threshold_percentage,
                low_stock_count: products.length,
                products,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving low stock products");
      throw error;
    }
  },
};
