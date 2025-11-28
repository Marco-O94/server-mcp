import { ObjectId } from "mongodb";
import { getMongoDBClient } from "../../database/mongodb-client.js";
import {
  GetPaintProductDetailsInputSchema,
  ListPaintOrdersInputSchema,
} from "../../types.js";
import pino from "pino";

const logger = pino(
  { name: "paint-orders-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const getPaintProductDetailsTool = {
  name: "get_paint_product_details",
  description:
    "Get detailed information about a specific paint product by its product code or ObjectId.",
  inputSchema: {
    type: "object",
    properties: {
      product_code: {
        type: "string",
        description:
          "The product code (e.g., 'INT-LAV-001') or MongoDB ObjectId (e.g., '692372db03f8705993b1de07') to fetch details for",
      },
    },
    required: ["product_code"],
  },
  handler: async (args: unknown) => {
    try {
      const input = GetPaintProductDetailsInputSchema.parse(args);
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      // Try to find by code first, then by ObjectId if it looks like one
      let product;

      // Check if input looks like an ObjectId (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(input.product_code)) {
        product = await db
          .collection("products")
          .findOne({ _id: new ObjectId(input.product_code) });
      }

      // If not found by ObjectId or input is not an ObjectId, try by code
      if (!product) {
        product = await db
          .collection("products")
          .findOne({ code: input.product_code });
      }

      if (!product) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: `Product with code "${input.product_code}" not found`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Get supplier information
      const supplier = await db
        .collection("suppliers")
        .findOne({ _id: product.supplier_id });

      logger.info(
        { product_code: input.product_code },
        "Retrieved paint product details"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                product: {
                  id: product._id.toString(),
                  code: product.code,
                  name: product.name,
                  type: product.type,
                  category: product.category,
                  color: product.color,
                  finish: product.finish,
                  coverage: product.coverage,
                  drying_time: product.drying_time,
                  price: product.price,
                  stock_quantity: product.stock_quantity,
                  certifications: product.certifications,
                  technical_specs: product.technical_specs,
                  created_at: product.created_at,
                  updated_at: product.updated_at,
                },
                supplier: supplier
                  ? {
                      id: supplier._id.toString(),
                      name: supplier.name,
                      contact_info: supplier.contact_info,
                      rating: supplier.rating,
                    }
                  : null,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving paint product details");
      throw error;
    }
  },
};

export const listPaintOrdersTool = {
  name: "list_paint_orders",
  description:
    "List paint orders from the database. Can filter by order status and supports pagination.",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: [
          "pending",
          "confirmed",
          "processing",
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
      const input = ListPaintOrdersInputSchema.parse(args);
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const filter: any = {};
      if (input.status) {
        filter.status = input.status;
      }

      const orders = await db
        .collection("orders")
        .find(filter)
        .sort({ order_date: -1 })
        .limit(input.limit)
        .toArray();

      const total = await db.collection("orders").countDocuments(filter);

      logger.info(
        { count: orders.length, total, status: input.status },
        "Listed paint orders"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                orders_count: orders.length,
                total_orders: total,
                filter: input.status ? { status: input.status } : {},
                orders: orders.map((o) => ({
                  id: o._id.toString(),
                  order_number: o.order_number,
                  customer: o.customer,
                  items_count: o.items?.length || 0,
                  total_amount: o.total_amount,
                  status: o.status,
                  order_date: o.order_date,
                  delivery_address: o.delivery_address,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error listing paint orders");
      throw error;
    }
  },
};

export const getProductSalesTool = {
  name: "get_product_sales",
  description:
    "Get sales statistics for paint products, including total quantity sold and revenue. Can filter by specific product or show all products ranked by sales.",
  inputSchema: {
    type: "object",
    properties: {
      product_code: {
        type: "string",
        description:
          "Optional: Product code or ObjectId to get sales for a specific product",
      },
      limit: {
        type: "number",
        description:
          "Optional: Limit the number of products returned (default 10)",
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = args as { product_code?: string; limit?: number };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const limit = input.limit || 10;
      let matchStage: any = {};

      // If product_code is provided, filter for that specific product
      if (input.product_code) {
        let productId;

        // Check if it's an ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(input.product_code)) {
          productId = new ObjectId(input.product_code);
        } else {
          // Find product by code to get its ObjectId
          const product = await db
            .collection("products")
            .findOne({ code: input.product_code });

          if (!product) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error: `Product with code "${input.product_code}" not found`,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
          productId = product._id;
        }

        matchStage = { "items.product_id": productId };
      }

      // Aggregate sales by product
      const salesData = await db
        .collection("orders")
        .aggregate([
          { $match: matchStage },
          { $unwind: "$items" },
          ...(input.product_code
            ? [
                {
                  $match: {
                    "items.product_id": matchStage["items.product_id"],
                  },
                },
              ]
            : []),
          {
            $group: {
              _id: "$items.product_id",
              total_quantity: { $sum: "$items.quantity" },
              total_revenue: {
                $sum: { $multiply: ["$items.quantity", "$items.price"] },
              },
              order_count: { $sum: 1 },
            },
          },
          { $sort: { total_revenue: -1 } },
          { $limit: limit },
        ])
        .toArray();

      // Enrich with product details
      const enrichedSales = await Promise.all(
        salesData.map(async (sale) => {
          const product = await db
            .collection("products")
            .findOne({ _id: sale._id });

          return {
            product_id: sale._id.toString(),
            product_code: product?.code,
            product_name: product?.name,
            color: product?.color?.name,
            total_quantity_sold: sale.total_quantity,
            total_revenue: parseFloat(sale.total_revenue.toFixed(2)),
            number_of_orders: sale.order_count,
            average_quantity_per_order: parseFloat(
              (sale.total_quantity / sale.order_count).toFixed(2)
            ),
          };
        })
      );

      logger.info(
        {
          product_code: input.product_code,
          results: enrichedSales.length,
        },
        "Retrieved product sales statistics"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total_products: enrichedSales.length,
                sales_data: enrichedSales,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving product sales");
      throw error;
    }
  },
};
