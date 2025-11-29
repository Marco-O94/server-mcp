import { getMongoDBClient } from "../../database/mongodb-client.js";
import pino from "pino";

const logger = pino(
  { name: "paint-inventory-tool" },
  pino.destination({ dest: 2, sync: false })
);

/**
 * Check products that need reordering
 */
export const checkReorderNeededTool = {
  name: "check_reorder_needed",
  description:
    "Check which paint products need to be reordered based on current stock levels and reorder thresholds.",
  inputSchema: {
    type: "object",
    properties: {
      threshold: {
        type: "number",
        description: "Stock quantity threshold to consider low (default: 20)",
      },
      category: {
        type: "string",
        enum: ["interno", "esterno", "industriale"],
        description: "Filter by product category",
      },
      include_out_of_stock: {
        type: "boolean",
        description: "Include products with zero stock (default: true)",
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        threshold?: number;
        category?: string;
        include_out_of_stock?: boolean;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const threshold = input.threshold || 20;
      const includeOutOfStock = input.include_out_of_stock !== false;

      const matchStage: any = {};

      if (includeOutOfStock) {
        matchStage.stock_quantity = { $lte: threshold };
      } else {
        matchStage.stock_quantity = { $gt: 0, $lte: threshold };
      }

      if (input.category) {
        matchStage.category = input.category;
      }

      const lowStockProducts = await db
        .collection("products")
        .aggregate([
          { $match: matchStage },
          {
            $lookup: {
              from: "suppliers",
              localField: "supplier_id",
              foreignField: "_id",
              as: "supplier",
            },
          },
          { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              code: 1,
              name: 1,
              category: 1,
              type: 1,
              stock_quantity: 1,
              price: 1,
              color: "$color.name",
              supplier_name: "$supplier.name",
              supplier_contact: "$supplier.contact_info.email",
              urgency: {
                $cond: {
                  if: { $eq: ["$stock_quantity", 0] },
                  then: "CRITICAL",
                  else: {
                    $cond: {
                      if: { $lte: ["$stock_quantity", 5] },
                      then: "HIGH",
                      else: "MEDIUM",
                    },
                  },
                },
              },
            },
          },
          {
            $sort: { stock_quantity: 1 },
          },
        ])
        .toArray();

      // Group by urgency for summary
      const urgencySummary = {
        CRITICAL: lowStockProducts.filter((p) => p.urgency === "CRITICAL")
          .length,
        HIGH: lowStockProducts.filter((p) => p.urgency === "HIGH").length,
        MEDIUM: lowStockProducts.filter((p) => p.urgency === "MEDIUM").length,
      };

      // Estimate reorder value
      const estimatedReorderValue = lowStockProducts.reduce((sum, p) => {
        const unitsToOrder = threshold * 2 - (p.stock_quantity || 0); // Order up to 2x threshold
        return sum + unitsToOrder * (p.price || 0);
      }, 0);

      logger.info(
        { threshold, products_count: lowStockProducts.length },
        "Retrieved low stock products"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                threshold_used: threshold,
                category_filter: input.category || "all",
                summary: {
                  total_low_stock: lowStockProducts.length,
                  ...urgencySummary,
                  estimated_reorder_value: parseFloat(
                    estimatedReorderValue.toFixed(2)
                  ),
                },
                products: lowStockProducts.map((p) => ({
                  code: p.code,
                  name: p.name,
                  category: p.category,
                  type: p.type,
                  color: p.color,
                  current_stock: p.stock_quantity,
                  urgency: p.urgency,
                  unit_price: p.price,
                  supplier: p.supplier_name,
                  supplier_email: p.supplier_contact,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error checking reorder needs");
      throw error;
    }
  },
};

/**
 * Get stock levels summary by category
 */
export const getStockSummaryTool = {
  name: "get_stock_summary",
  description:
    "Get a summary of stock levels grouped by category, type, or finish. Shows total units and value in stock.",
  inputSchema: {
    type: "object",
    properties: {
      group_by: {
        type: "string",
        enum: ["category", "type", "finish", "supplier"],
        description: "How to group the stock summary (default: category)",
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = args as { group_by?: string };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const groupBy = input.group_by || "category";

      let groupField: string;
      let lookupPipeline: any[] = [];

      switch (groupBy) {
        case "type":
          groupField = "$type";
          break;
        case "finish":
          groupField = "$finish";
          break;
        case "supplier":
          groupField = "$supplier._id";
          lookupPipeline = [
            {
              $lookup: {
                from: "suppliers",
                localField: "supplier_id",
                foreignField: "_id",
                as: "supplier",
              },
            },
            {
              $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true },
            },
          ];
          break;
        default:
          groupField = "$category";
      }

      const stockSummary = await db
        .collection("products")
        .aggregate([
          ...lookupPipeline,
          {
            $group: {
              _id: groupBy === "supplier" ? "$supplier.name" : groupField,
              total_products: { $sum: 1 },
              total_units: { $sum: "$stock_quantity" },
              total_value: {
                $sum: { $multiply: ["$stock_quantity", "$price"] },
              },
              avg_stock: { $avg: "$stock_quantity" },
              min_stock: { $min: "$stock_quantity" },
              max_stock: { $max: "$stock_quantity" },
              out_of_stock: {
                $sum: { $cond: [{ $eq: ["$stock_quantity", 0] }, 1, 0] },
              },
              low_stock: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gt: ["$stock_quantity", 0] },
                        { $lte: ["$stock_quantity", 20] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          {
            $project: {
              group: "$_id",
              total_products: 1,
              total_units: 1,
              total_value: { $round: ["$total_value", 2] },
              avg_stock: { $round: ["$avg_stock", 0] },
              min_stock: 1,
              max_stock: 1,
              out_of_stock: 1,
              low_stock: 1,
              health_status: {
                $cond: {
                  if: { $gt: ["$out_of_stock", 0] },
                  then: "CRITICAL",
                  else: {
                    $cond: {
                      if: { $gt: ["$low_stock", 2] },
                      then: "WARNING",
                      else: "HEALTHY",
                    },
                  },
                },
              },
            },
          },
          { $sort: { total_value: -1 } },
        ])
        .toArray();

      // Calculate totals
      const totals = stockSummary.reduce(
        (acc, s) => ({
          total_products: acc.total_products + s.total_products,
          total_units: acc.total_units + s.total_units,
          total_value: acc.total_value + s.total_value,
          out_of_stock: acc.out_of_stock + s.out_of_stock,
          low_stock: acc.low_stock + s.low_stock,
        }),
        {
          total_products: 0,
          total_units: 0,
          total_value: 0,
          out_of_stock: 0,
          low_stock: 0,
        }
      );

      logger.info(
        { group_by: groupBy, groups: stockSummary.length },
        "Retrieved stock summary"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                grouped_by: groupBy,
                totals: {
                  ...totals,
                  total_value: parseFloat(totals.total_value.toFixed(2)),
                },
                groups: stockSummary.map((s) => ({
                  name: s._id || "unknown",
                  products: s.total_products,
                  units_in_stock: s.total_units,
                  stock_value: s.total_value,
                  avg_stock_per_product: s.avg_stock,
                  min_stock: s.min_stock,
                  max_stock: s.max_stock,
                  out_of_stock_count: s.out_of_stock,
                  low_stock_count: s.low_stock,
                  health: s.health_status,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving stock summary");
      throw error;
    }
  },
};

/**
 * Predict when products will run out of stock
 */
export const predictStockOutTool = {
  name: "predict_stock_out",
  description:
    "Predict when products will run out of stock based on historical sales velocity. Shows estimated days until stockout.",
  inputSchema: {
    type: "object",
    properties: {
      days_lookback: {
        type: "number",
        description:
          "Number of past days to calculate sales velocity (default: 30)",
      },
      category: {
        type: "string",
        enum: ["interno", "esterno", "industriale"],
        description: "Filter by product category",
      },
      max_days_until_stockout: {
        type: "number",
        description:
          "Only show products running out within this many days (default: 60)",
      },
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        days_lookback?: number;
        category?: string;
        max_days_until_stockout?: number;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const daysLookback = input.days_lookback || 30;
      const maxDays = input.max_days_until_stockout || 60;
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - daysLookback);

      // Calculate sales velocity per product
      const salesVelocity = await db
        .collection("orders")
        .aggregate([
          {
            $match: {
              created_at: { $gte: lookbackDate },
              status: { $in: ["delivered", "shipped", "processing"] },
            },
          },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product_id",
              total_quantity: { $sum: "$items.quantity" },
              order_count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      // Create a map of product_id -> daily velocity
      const velocityMap = new Map();
      salesVelocity.forEach((v) => {
        velocityMap.set(v._id.toString(), v.total_quantity / daysLookback);
      });

      // Get all products with stock
      const productQuery: any = { stock_quantity: { $gt: 0 } };
      if (input.category) {
        productQuery.category = input.category;
      }

      const products = await db
        .collection("products")
        .find(productQuery)
        .toArray();

      // Calculate days until stockout for each product
      const predictions = products
        .map((p) => {
          const dailyVelocity = velocityMap.get(p._id.toString()) || 0;
          const daysUntilStockout =
            dailyVelocity > 0
              ? Math.floor(p.stock_quantity / dailyVelocity)
              : Infinity;

          return {
            code: p.code,
            name: p.name,
            category: p.category,
            current_stock: p.stock_quantity,
            daily_sales_velocity: parseFloat(dailyVelocity.toFixed(2)),
            days_until_stockout:
              daysUntilStockout === Infinity ? null : daysUntilStockout,
            estimated_stockout_date:
              daysUntilStockout === Infinity
                ? null
                : new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
            risk_level:
              daysUntilStockout <= 7
                ? "CRITICAL"
                : daysUntilStockout <= 14
                ? "HIGH"
                : daysUntilStockout <= 30
                ? "MEDIUM"
                : "LOW",
          };
        })
        .filter(
          (p) =>
            p.days_until_stockout !== null && p.days_until_stockout <= maxDays
        )
        .sort(
          (a, b) => (a.days_until_stockout || 0) - (b.days_until_stockout || 0)
        );

      // Summary by risk level
      const riskSummary = {
        CRITICAL: predictions.filter((p) => p.risk_level === "CRITICAL").length,
        HIGH: predictions.filter((p) => p.risk_level === "HIGH").length,
        MEDIUM: predictions.filter((p) => p.risk_level === "MEDIUM").length,
        LOW: predictions.filter((p) => p.risk_level === "LOW").length,
      };

      logger.info(
        { days_lookback: daysLookback, predictions_count: predictions.length },
        "Generated stock predictions"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                analysis_period_days: daysLookback,
                max_days_forecast: maxDays,
                category_filter: input.category || "all",
                risk_summary: riskSummary,
                predictions: predictions,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error predicting stock out");
      throw error;
    }
  },
};

/**
 * Update stock quantity for a product
 */
export const updateStockTool = {
  name: "update_stock",
  description:
    "Update the stock quantity for a paint product. Can set absolute value or adjust relative to current stock.",
  inputSchema: {
    type: "object",
    properties: {
      product_code: {
        type: "string",
        description: "The product code to update",
      },
      quantity: {
        type: "number",
        description: "New stock quantity (absolute) or adjustment amount",
      },
      adjustment_type: {
        type: "string",
        enum: ["set", "add", "subtract"],
        description:
          "How to apply the quantity: set (absolute), add, or subtract (default: set)",
      },
      reason: {
        type: "string",
        description: "Reason for the stock adjustment (for audit trail)",
      },
    },
    required: ["product_code", "quantity"],
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        product_code: string;
        quantity: number;
        adjustment_type?: string;
        reason?: string;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const adjustmentType = input.adjustment_type || "set";

      // Find the product
      const product = await db
        .collection("products")
        .findOne({ code: input.product_code });

      if (!product) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Product not found",
                product_code: input.product_code,
              }),
            },
          ],
        };
      }

      const oldQuantity = product.stock_quantity || 0;
      let newQuantity: number;

      switch (adjustmentType) {
        case "add":
          newQuantity = oldQuantity + input.quantity;
          break;
        case "subtract":
          newQuantity = Math.max(0, oldQuantity - input.quantity);
          break;
        default:
          newQuantity = input.quantity;
      }

      // Update the product
      await db.collection("products").updateOne(
        { code: input.product_code },
        {
          $set: {
            stock_quantity: newQuantity,
            updated_at: new Date(),
          },
        }
      );

      // Log the adjustment (you could create a separate collection for audit trail)
      logger.info(
        {
          product_code: input.product_code,
          old_quantity: oldQuantity,
          new_quantity: newQuantity,
          adjustment_type: adjustmentType,
          reason: input.reason,
        },
        "Stock updated"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                product_code: input.product_code,
                product_name: product.name,
                previous_stock: oldQuantity,
                new_stock: newQuantity,
                adjustment_type: adjustmentType,
                change: newQuantity - oldQuantity,
                reason: input.reason || "Not specified",
                updated_at: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error updating stock");
      throw error;
    }
  },
};
