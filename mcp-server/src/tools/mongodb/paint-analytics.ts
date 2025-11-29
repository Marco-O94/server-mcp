import { ObjectId } from "mongodb";
import { getMongoDBClient } from "../../database/mongodb-client.js";
import pino from "pino";

const logger = pino(
  { name: "paint-analytics-tool" },
  pino.destination({ dest: 2, sync: false })
);

/**
 * Get sales trends over time periods
 */
export const getSalesTrendsTool = {
  name: "get_sales_trends",
  description:
    "Get sales trends for paint products over specified time periods. Shows quantity sold and revenue trends by day, week, or month.",
  inputSchema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["daily", "weekly", "monthly"],
        description: "Time period granularity for trends (default: monthly)",
      },
      start_date: {
        type: "string",
        description:
          "Start date in ISO format (YYYY-MM-DD). Default: 6 months ago",
      },
      end_date: {
        type: "string",
        description: "End date in ISO format (YYYY-MM-DD). Default: today",
      },
      product_code: {
        type: "string",
        description: "Optional: Filter trends for a specific product",
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        period?: string;
        start_date?: string;
        end_date?: string;
        product_code?: string;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const period = input.period || "monthly";
      const endDate = input.end_date ? new Date(input.end_date) : new Date();
      const startDate = input.start_date
        ? new Date(input.start_date)
        : new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 months ago

      // Build date grouping based on period
      let dateGroup: any;
      switch (period) {
        case "daily":
          dateGroup = {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            day: { $dayOfMonth: "$created_at" },
          };
          break;
        case "weekly":
          dateGroup = {
            year: { $year: "$created_at" },
            week: { $week: "$created_at" },
          };
          break;
        case "monthly":
        default:
          dateGroup = {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
          };
      }

      // Build match stage
      const matchStage: any = {
        created_at: { $gte: startDate, $lte: endDate },
      };

      // If product_code is provided, find the product first
      if (input.product_code) {
        let productId;
        if (/^[0-9a-fA-F]{24}$/.test(input.product_code)) {
          productId = new ObjectId(input.product_code);
        } else {
          const product = await db
            .collection("products")
            .findOne({ code: input.product_code });
          if (product) {
            productId = product._id;
          }
        }
        if (productId) {
          matchStage["items.product_id"] = productId;
        }
      }

      const trends = await db
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
              _id: dateGroup,
              total_orders: { $sum: 1 },
              total_quantity: { $sum: "$items.quantity" },
              total_revenue: {
                $sum: { $multiply: ["$items.quantity", "$items.price"] },
              },
              unique_products: { $addToSet: "$items.product_id" },
            },
          },
          {
            $project: {
              _id: 1,
              total_orders: 1,
              total_quantity: 1,
              total_revenue: { $round: ["$total_revenue", 2] },
              unique_products_count: { $size: "$unique_products" },
            },
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.month": 1,
              "_id.week": 1,
              "_id.day": 1,
            },
          },
        ])
        .toArray();

      // Calculate summary statistics
      const totalRevenue = trends.reduce((sum, t) => sum + t.total_revenue, 0);
      const totalQuantity = trends.reduce(
        (sum, t) => sum + t.total_quantity,
        0
      );
      const totalOrders = trends.reduce((sum, t) => sum + t.total_orders, 0);

      logger.info(
        {
          period,
          start_date: startDate,
          end_date: endDate,
          trends_count: trends.length,
        },
        "Retrieved sales trends"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                period,
                date_range: {
                  start: startDate.toISOString().split("T")[0],
                  end: endDate.toISOString().split("T")[0],
                },
                summary: {
                  total_revenue: parseFloat(totalRevenue.toFixed(2)),
                  total_quantity: totalQuantity,
                  total_orders: totalOrders,
                  periods_count: trends.length,
                },
                trends: trends.map((t) => ({
                  period: t._id,
                  orders: t.total_orders,
                  quantity_sold: t.total_quantity,
                  revenue: t.total_revenue,
                  unique_products: t.unique_products_count,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving sales trends");
      throw error;
    }
  },
};

/**
 * Get revenue breakdown by category
 */
export const getRevenueByCategoryTool = {
  name: "get_revenue_by_category",
  description:
    "Get revenue breakdown by product category (interno, esterno, industriale) with totals and percentages.",
  inputSchema: {
    type: "object",
    properties: {
      start_date: {
        type: "string",
        description: "Start date in ISO format (YYYY-MM-DD)",
      },
      end_date: {
        type: "string",
        description: "End date in ISO format (YYYY-MM-DD)",
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = args as { start_date?: string; end_date?: string };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const matchStage: any = {};
      if (input.start_date || input.end_date) {
        matchStage.created_at = {};
        if (input.start_date) {
          matchStage.created_at.$gte = new Date(input.start_date);
        }
        if (input.end_date) {
          matchStage.created_at.$lte = new Date(input.end_date);
        }
      }

      const revenueByCategory = await db
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
            $lookup: {
              from: "products",
              localField: "items.product_id",
              foreignField: "_id",
              as: "product_info",
            },
          },
          { $unwind: "$product_info" },
          {
            $group: {
              _id: "$product_info.category",
              total_revenue: {
                $sum: { $multiply: ["$items.quantity", "$items.price"] },
              },
              total_quantity: { $sum: "$items.quantity" },
              order_count: { $sum: 1 },
              products: { $addToSet: "$product_info.name" },
            },
          },
          {
            $project: {
              category: "$_id",
              total_revenue: { $round: ["$total_revenue", 2] },
              total_quantity: 1,
              order_count: 1,
              unique_products: { $size: "$products" },
            },
          },
          { $sort: { total_revenue: -1 } },
        ])
        .toArray();

      // Calculate grand total for percentages
      const grandTotal = revenueByCategory.reduce(
        (sum, cat) => sum + cat.total_revenue,
        0
      );

      const categoriesWithPercentage = revenueByCategory.map((cat) => ({
        category: cat._id || "uncategorized",
        revenue: cat.total_revenue,
        percentage: parseFloat(
          ((cat.total_revenue / grandTotal) * 100).toFixed(2)
        ),
        quantity_sold: cat.total_quantity,
        order_count: cat.order_count,
        unique_products: cat.unique_products,
      }));

      logger.info(
        { categories_count: categoriesWithPercentage.length },
        "Retrieved revenue by category"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                grand_total: parseFloat(grandTotal.toFixed(2)),
                categories: categoriesWithPercentage,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving revenue by category");
      throw error;
    }
  },
};

/**
 * Compare two time periods
 */
export const comparePeriodsTool = {
  name: "compare_periods",
  description:
    "Compare sales performance between two time periods. Shows growth/decline in revenue, quantity, and orders.",
  inputSchema: {
    type: "object",
    properties: {
      period1_start: {
        type: "string",
        description: "First period start date (YYYY-MM-DD)",
      },
      period1_end: {
        type: "string",
        description: "First period end date (YYYY-MM-DD)",
      },
      period2_start: {
        type: "string",
        description: "Second period start date (YYYY-MM-DD)",
      },
      period2_end: {
        type: "string",
        description: "Second period end date (YYYY-MM-DD)",
      },
    },
    required: ["period1_start", "period1_end", "period2_start", "period2_end"],
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        period1_start: string;
        period1_end: string;
        period2_start: string;
        period2_end: string;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const getPeriodStats = async (startDate: Date, endDate: Date) => {
        const result = await db
          .collection("orders")
          .aggregate([
            {
              $match: {
                created_at: { $gte: startDate, $lte: endDate },
              },
            },
            { $unwind: "$items" },
            {
              $match: {
                "items.price": { $type: "number" },
              },
            },
            {
              $group: {
                _id: null,
                total_orders: { $addToSet: "$_id" },
                total_quantity: { $sum: "$items.quantity" },
                total_revenue: {
                  $sum: { $multiply: ["$items.quantity", "$items.price"] },
                },
                unique_products: { $addToSet: "$items.product_id" },
                unique_customers: { $addToSet: "$customer_id" },
              },
            },
            {
              $project: {
                orders: { $size: "$total_orders" },
                quantity: "$total_quantity",
                revenue: { $round: ["$total_revenue", 2] },
                products: { $size: "$unique_products" },
                customers: { $size: "$unique_customers" },
              },
            },
          ])
          .toArray();

        return (
          result[0] || {
            orders: 0,
            quantity: 0,
            revenue: 0,
            products: 0,
            customers: 0,
          }
        );
      };

      const period1Stats = await getPeriodStats(
        new Date(input.period1_start),
        new Date(input.period1_end)
      );
      const period2Stats = await getPeriodStats(
        new Date(input.period2_start),
        new Date(input.period2_end)
      );

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return parseFloat((((current - previous) / previous) * 100).toFixed(2));
      };

      const comparison = {
        period1: {
          range: `${input.period1_start} to ${input.period1_end}`,
          ...period1Stats,
        },
        period2: {
          range: `${input.period2_start} to ${input.period2_end}`,
          ...period2Stats,
        },
        changes: {
          revenue_change_percent: calculateChange(
            period2Stats.revenue,
            period1Stats.revenue
          ),
          quantity_change_percent: calculateChange(
            period2Stats.quantity,
            period1Stats.quantity
          ),
          orders_change_percent: calculateChange(
            period2Stats.orders,
            period1Stats.orders
          ),
          customers_change_percent: calculateChange(
            period2Stats.customers,
            period1Stats.customers
          ),
        },
        insights: [] as string[],
      };

      // Add insights
      if (comparison.changes.revenue_change_percent > 0) {
        comparison.insights.push(
          `📈 Revenue increased by ${comparison.changes.revenue_change_percent}%`
        );
      } else if (comparison.changes.revenue_change_percent < 0) {
        comparison.insights.push(
          `📉 Revenue decreased by ${Math.abs(
            comparison.changes.revenue_change_percent
          )}%`
        );
      }

      if (comparison.changes.orders_change_percent > 10) {
        comparison.insights.push(`🎯 Strong growth in order volume`);
      }

      logger.info({ comparison }, "Compared periods");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(comparison, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error comparing periods");
      throw error;
    }
  },
};
