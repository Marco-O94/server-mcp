import { getMongoDBClient } from "../../database/mongodb-client.js";
import { SearchPaintByColorInputSchema } from "../../types.js";
import pino from "pino";

const logger = pino(
  { name: "paint-suppliers-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const searchPaintByColorTool = {
  name: "search_paint_by_color",
  description:
    "Search for paint products by color name. Supports optional filtering by finish type (opaca, satinata, lucida).",
  inputSchema: {
    type: "object",
    properties: {
      color_name: {
        type: "string",
        description:
          "Color name to search for (case-insensitive partial match)",
      },
      finish: {
        type: "string",
        enum: ["opaca", "satinata", "lucida"],
        description: "Optional filter by finish type",
      },
    },
    required: ["color_name"],
  },
  handler: async (args: unknown) => {
    try {
      const input = SearchPaintByColorInputSchema.parse(args);
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const filter: any = {
        "color.name": { $regex: input.color_name, $options: "i" },
      };

      if (input.finish) {
        filter.finish = input.finish;
      }

      const products = await db.collection("products").find(filter).toArray();

      logger.info(
        { color_name: input.color_name, count: products.length },
        "Searched paint by color"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                search_query: {
                  color_name: input.color_name,
                  finish: input.finish,
                },
                results_count: products.length,
                products: products.map((p) => ({
                  id: p._id.toString(),
                  product_code: p.product_code,
                  name: p.name,
                  type: p.type,
                  color: p.color,
                  finish: p.finish,
                  volume_liters: p.volume_liters,
                  price_per_liter: p.price_per_liter,
                  stock_quantity: p.stock_quantity,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error searching paint by color");
      throw error;
    }
  },
};

export const listPaintSuppliersTool = {
  name: "list_paint_suppliers",
  description:
    "List all paint suppliers from the MongoDB database with their contact information and ratings.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (_args: unknown) => {
    try {
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const suppliers = await db
        .collection("suppliers")
        .find({})
        .sort({ rating: -1 })
        .toArray();

      logger.info({ count: suppliers.length }, "Listed paint suppliers");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                suppliers_count: suppliers.length,
                suppliers: suppliers.map((s) => ({
                  id: s._id.toString(),
                  name: s.name,
                  contact_info: s.contact_info,
                  payment_terms: s.payment_terms,
                  rating: s.rating,
                  products_supplied_count: s.products_supplied?.length || 0,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error listing paint suppliers");
      throw error;
    }
  },
};
