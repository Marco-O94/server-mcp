import { getMySQLClient } from "../../database/mysql-client.js";
import pino from "pino";

const logger = pino(
  { name: "food-categories-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const listFoodCategoriesTool = {
  name: "list_food_categories",
  description:
    "List all food product categories from the MySQL database, including hierarchical parent-child relationships.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (_args: unknown) => {
    try {
      const mysqlClient = getMySQLClient();

      const query = `
        SELECT c.*, pc.name as parent_category_name
        FROM categories c
        LEFT JOIN categories pc ON c.parent_category_id = pc.id
        ORDER BY COALESCE(c.parent_category_id, c.id), c.id
      `;

      const categories = await mysqlClient.query(query);

      logger.info({ count: categories.length }, "Listed food categories");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                categories_count: categories.length,
                categories,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error listing food categories");
      throw error;
    }
  },
};
