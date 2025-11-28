import { getMySQLClient } from "../../database/mysql-client.js";
import { ListFoodOrdersInputSchema } from "../../types.js";
import pino from "pino";

const logger = pino(
  { name: "food-orders-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const listFoodOrdersTool = {
  name: "list_food_orders",
  description:
    "List food purchase orders from the MySQL database. Can filter by supplier and order status.",
  inputSchema: {
    type: "object",
    properties: {
      supplier_id: {
        type: "number",
        description: "Filter by supplier ID",
      },
      status: {
        type: "string",
        enum: [
          "draft",
          "submitted",
          "confirmed",
          "shipped",
          "delivered",
          "cancelled",
        ],
        description: "Filter by order status",
      },
      limit: {
        type: "number",
        description: "Maximum number of orders to return (default: 50)",
        default: 50,
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = ListFoodOrdersInputSchema.parse(args);
      const mysqlClient = getMySQLClient();

      let query = `
        SELECT o.*, s.name as supplier_name, s.contact_person,
               COUNT(oi.id) as items_count
        FROM purchase_orders o
        LEFT JOIN suppliers s ON o.supplier_id = s.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (input.supplier_id) {
        query += " AND o.supplier_id = ?";
        params.push(input.supplier_id);
      }

      if (input.status) {
        query += " AND o.status = ?";
        params.push(input.status);
      }

      query += " GROUP BY o.id ORDER BY o.order_date DESC LIMIT ?";
      params.push(input.limit);

      const orders = await mysqlClient.query(query, params);

      logger.info(
        { count: orders.length, filter: input },
        "Listed food orders"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                orders_count: orders.length,
                filters: {
                  supplier_id: input.supplier_id,
                  status: input.status,
                },
                orders,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error listing food orders");
      throw error;
    }
  },
};
