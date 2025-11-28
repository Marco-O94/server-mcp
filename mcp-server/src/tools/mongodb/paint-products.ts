import { getMongoDBClient } from "../../database/mongodb-client.js";
import { ListPaintProductsInputSchema } from "../../types.js";
import pino from "pino";

const logger = pino(
  { name: "paint-products-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const listPaintProductsTool = {
  name: "list_paint_products",
  description:
    "List paint products from the MongoDB paints database. Supports pagination and filtering by paint type.",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of products to return (default: 50)",
        default: 50,
      },
      offset: {
        type: "number",
        description: "Number of products to skip for pagination (default: 0)",
        default: 0,
      },
      type: {
        type: "string",
        enum: ["acrilica", "smalto", "idropittura", "finitura", "primer"],
        description: "Filter by paint type",
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = ListPaintProductsInputSchema.parse(args);
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const filter: any = {};
      if (input.type) {
        filter.type = input.type;
      }

      const products = await db
        .collection("products")
        .find(filter)
        .skip(input.offset)
        .limit(input.limit)
        .toArray();

      const total = await db.collection("products").countDocuments(filter);

      logger.info(
        { count: products.length, total, filter },
        "Listed paint products"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
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
                  specifications: p.specifications,
                })),
                pagination: {
                  total,
                  limit: input.limit,
                  offset: input.offset,
                  has_more: input.offset + input.limit < total,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error listing paint products");
      throw error;
    }
  },
};
