import { getMySQLClient } from "../../database/mysql-client.js";
import pino from "pino";

const logger = pino(
  { name: "food-suppliers-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const listFoodSuppliersTool = {
  name: "list_food_suppliers",
  description:
    "List all food suppliers from the MySQL database with their contact information and quality ratings.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (_args: unknown) => {
    try {
      const mysqlClient = getMySQLClient();

      const query = `
        SELECT s.*, 
               COUNT(DISTINCT p.id) as products_count
        FROM suppliers s
        LEFT JOIN products p ON s.id = p.supplier_id AND p.is_active = 1
        WHERE s.is_active = 1
        GROUP BY s.id
        ORDER BY s.quality_rating DESC, s.name
      `;

      const suppliers = await mysqlClient.query(query);

      logger.info({ count: suppliers.length }, "Listed food suppliers");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                suppliers_count: suppliers.length,
                suppliers,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error listing food suppliers");
      throw error;
    }
  },
};
