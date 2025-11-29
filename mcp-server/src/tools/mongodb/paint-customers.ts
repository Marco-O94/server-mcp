import { ObjectId } from "mongodb";
import { getMongoDBClient } from "../../database/mongodb-client.js";
import pino from "pino";

const logger = pino(
  { name: "paint-customers-tool" },
  pino.destination({ dest: 2, sync: false })
);

/**
 * Get top customers by revenue or order count
 */
export const getTopCustomersTool = {
  name: "get_top_customers",
  description:
    "Get top customers ranked by total revenue or order count. Shows customer value analysis.",
  inputSchema: {
    type: "object",
    properties: {
      sort_by: {
        type: "string",
        enum: ["revenue", "orders", "quantity"],
        description:
          "Sort customers by revenue, order count, or quantity purchased (default: revenue)",
      },
      limit: {
        type: "number",
        description: "Number of top customers to return (default: 10)",
      },
      start_date: {
        type: "string",
        description: "Filter orders from this date (YYYY-MM-DD)",
      },
      end_date: {
        type: "string",
        description: "Filter orders until this date (YYYY-MM-DD)",
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        sort_by?: string;
        limit?: number;
        start_date?: string;
        end_date?: string;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const sortBy = input.sort_by || "revenue";
      const limit = input.limit || 10;

      const matchStage: any = {};
      if (input.start_date || input.end_date) {
        matchStage.created_at = {};
        if (input.start_date)
          matchStage.created_at.$gte = new Date(input.start_date);
        if (input.end_date)
          matchStage.created_at.$lte = new Date(input.end_date);
      }

      const sortField =
        sortBy === "orders"
          ? "total_orders"
          : sortBy === "quantity"
          ? "total_quantity"
          : "total_revenue";

      const topCustomers = await db
        .collection("orders")
        .aggregate([
          { $match: matchStage },
          { $unwind: "$items" },
          {
            $match: {
              "items.price": { $type: "number" },
            },
          },
          {
            $group: {
              _id: "$customer_id",
              total_orders: { $addToSet: "$_id" },
              total_quantity: { $sum: "$items.quantity" },
              total_revenue: {
                $sum: { $multiply: ["$items.quantity", "$items.price"] },
              },
              first_order: { $min: "$created_at" },
              last_order: { $max: "$created_at" },
              products_purchased: { $addToSet: "$items.product_id" },
            },
          },
          {
            $project: {
              customer_id: "$_id",
              total_orders: { $size: "$total_orders" },
              total_quantity: 1,
              total_revenue: { $round: ["$total_revenue", 2] },
              first_order: 1,
              last_order: 1,
              unique_products: { $size: "$products_purchased" },
              avg_order_value: {
                $round: [
                  { $divide: ["$total_revenue", { $size: "$total_orders" }] },
                  2,
                ],
              },
            },
          },
          { $sort: { [sortField]: -1 } },
          { $limit: limit },
        ])
        .toArray();

      // Calculate totals for context
      const totalRevenue = topCustomers.reduce(
        (sum, c) => sum + c.total_revenue,
        0
      );

      const customersWithRank = topCustomers.map((c, index) => ({
        rank: index + 1,
        customer_id: c._id?.toString() || "unknown",
        total_revenue: c.total_revenue,
        revenue_share_percent: parseFloat(
          ((c.total_revenue / totalRevenue) * 100).toFixed(2)
        ),
        total_orders: c.total_orders,
        total_quantity: c.total_quantity,
        avg_order_value: c.avg_order_value,
        unique_products: c.unique_products,
        first_order: c.first_order?.toISOString().split("T")[0],
        last_order: c.last_order?.toISOString().split("T")[0],
      }));

      logger.info(
        { sort_by: sortBy, limit, count: topCustomers.length },
        "Retrieved top customers"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                sorted_by: sortBy,
                total_customers_shown: customersWithRank.length,
                aggregate_revenue: parseFloat(totalRevenue.toFixed(2)),
                customers: customersWithRank,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving top customers");
      throw error;
    }
  },
};

/**
 * Get detailed insights for a specific customer
 */
export const getCustomerInsightsTool = {
  name: "get_customer_insights",
  description:
    "Get detailed insights and analysis for a specific customer including purchase history, preferences, and trends.",
  inputSchema: {
    type: "object",
    properties: {
      customer_id: {
        type: "string",
        description: "The customer ID to analyze",
      },
    },
    required: ["customer_id"],
  },
  handler: async (args: unknown) => {
    try {
      const input = args as { customer_id: string };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      let customerId: ObjectId | string = input.customer_id;
      if (/^[0-9a-fA-F]{24}$/.test(input.customer_id)) {
        customerId = new ObjectId(input.customer_id);
      }

      // Get all orders for this customer
      const orders = await db
        .collection("orders")
        .find({ customer_id: customerId })
        .sort({ created_at: -1 })
        .toArray();

      if (orders.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "No orders found for this customer",
                customer_id: input.customer_id,
              }),
            },
          ],
        };
      }

      // Calculate aggregated stats
      const stats = await db
        .collection("orders")
        .aggregate([
          { $match: { customer_id: customerId } },
          { $unwind: "$items" },
          {
            $match: {
              "items.price": { $type: "number" },
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "items.product_id",
              foreignField: "_id",
              as: "product_info",
            },
          },
          {
            $unwind: {
              path: "$product_info",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: null,
              total_spent: {
                $sum: { $multiply: ["$items.quantity", "$items.price"] },
              },
              total_items: { $sum: "$items.quantity" },
              orders: { $addToSet: "$_id" },
              products: { $addToSet: "$product_info.name" },
              categories: { $addToSet: "$product_info.category" },
              colors: { $addToSet: "$product_info.color.name" },
              finishes: { $addToSet: "$product_info.finish" },
            },
          },
        ])
        .toArray();

      // Get favorite products
      const favoriteProducts = await db
        .collection("orders")
        .aggregate([
          { $match: { customer_id: customerId } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product_id",
              quantity: { $sum: "$items.quantity" },
              order_count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: "$product" },
          {
            $project: {
              name: "$product.name",
              code: "$product.code",
              category: "$product.category",
              quantity: 1,
              order_count: 1,
            },
          },
          { $sort: { quantity: -1 } },
          { $limit: 5 },
        ])
        .toArray();

      // Get order frequency
      const orderDates = orders.map((o) => o.created_at).filter((d) => d);
      let avgDaysBetweenOrders = null;
      if (orderDates.length > 1) {
        const sortedDates = orderDates.sort(
          (a: Date, b: Date) => a.getTime() - b.getTime()
        );
        let totalDays = 0;
        for (let i = 1; i < sortedDates.length; i++) {
          totalDays +=
            (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) /
            (1000 * 60 * 60 * 24);
        }
        avgDaysBetweenOrders = Math.round(totalDays / (sortedDates.length - 1));
      }

      const stat = stats[0] || {
        total_spent: 0,
        total_items: 0,
        orders: [],
        products: [],
        categories: [],
        colors: [],
        finishes: [],
      };

      const insights = {
        customer_id: input.customer_id,
        summary: {
          total_orders: stat.orders?.length || orders.length,
          total_spent: parseFloat((stat.total_spent || 0).toFixed(2)),
          total_items_purchased: stat.total_items || 0,
          avg_order_value: parseFloat(
            ((stat.total_spent || 0) / (stat.orders?.length || 1)).toFixed(2)
          ),
          first_order: orders[orders.length - 1]?.created_at
            ?.toISOString()
            .split("T")[0],
          last_order: orders[0]?.created_at?.toISOString().split("T")[0],
          avg_days_between_orders: avgDaysBetweenOrders,
        },
        preferences: {
          favorite_categories: (stat.categories || []).filter((c: any) => c),
          favorite_colors: (stat.colors || [])
            .filter((c: any) => c)
            .slice(0, 5),
          preferred_finishes: (stat.finishes || []).filter((f: any) => f),
          unique_products_tried: (stat.products || []).filter((p: any) => p)
            .length,
        },
        top_products: favoriteProducts.map((p) => ({
          name: p.name,
          code: p.code,
          category: p.category,
          times_ordered: p.order_count,
          total_quantity: p.quantity,
        })),
        recent_orders: orders.slice(0, 5).map((o) => ({
          order_number: o.order_number,
          date: o.created_at?.toISOString().split("T")[0],
          status: o.status,
          total: o.total_amount,
          items_count: o.items?.length || 0,
        })),
      };

      logger.info(
        { customer_id: input.customer_id },
        "Retrieved customer insights"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(insights, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving customer insights");
      throw error;
    }
  },
};

/**
 * Get complete order history for a customer
 */
export const getCustomerOrdersTool = {
  name: "get_customer_orders",
  description:
    "Get complete order history for a specific customer with full order details.",
  inputSchema: {
    type: "object",
    properties: {
      customer_id: {
        type: "string",
        description: "The customer ID",
      },
      status: {
        type: "string",
        enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
        description: "Filter by order status",
      },
      limit: {
        type: "number",
        description: "Maximum number of orders to return (default: 20)",
      },
    },
    required: ["customer_id"],
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        customer_id: string;
        status?: string;
        limit?: number;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      let customerId: ObjectId | string = input.customer_id;
      if (/^[0-9a-fA-F]{24}$/.test(input.customer_id)) {
        customerId = new ObjectId(input.customer_id);
      }

      const query: any = { customer_id: customerId };
      if (input.status) {
        query.status = input.status;
      }

      const orders = await db
        .collection("orders")
        .aggregate([
          { $match: query },
          { $sort: { created_at: -1 } },
          { $limit: input.limit || 20 },
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product_id",
              foreignField: "_id",
              as: "product_info",
            },
          },
          {
            $group: {
              _id: "$_id",
              order_number: { $first: "$order_number" },
              status: { $first: "$status" },
              total_amount: { $first: "$total_amount" },
              created_at: { $first: "$created_at" },
              delivery_date: { $first: "$delivery_date" },
              items: {
                $push: {
                  product_name: { $arrayElemAt: ["$product_info.name", 0] },
                  product_code: { $arrayElemAt: ["$product_info.code", 0] },
                  quantity: "$items.quantity",
                  price: "$items.price",
                },
              },
            },
          },
          { $sort: { created_at: -1 } },
        ])
        .toArray();

      const formattedOrders = orders.map((o) => ({
        order_number: o.order_number,
        status: o.status,
        total_amount: o.total_amount,
        order_date: o.created_at?.toISOString().split("T")[0],
        delivery_date: o.delivery_date?.toISOString().split("T")[0],
        items: o.items.filter((item: any) => item.product_name), // Filter out null lookups
      }));

      logger.info(
        { customer_id: input.customer_id, orders_count: orders.length },
        "Retrieved customer orders"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                customer_id: input.customer_id,
                total_orders: formattedOrders.length,
                status_filter: input.status || "all",
                orders: formattedOrders,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving customer orders");
      throw error;
    }
  },
};
