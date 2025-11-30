/**
 * MCP Resources - Static and reference data exposed to LLMs
 */

import { getMongoDBClient } from "../database/mongodb-client.js";
import pino from "pino";

const logger = pino(
  { name: "mcp-resources" },
  pino.destination({ dest: 2, sync: false })
);

// Resource definitions
export const RESOURCES = [
  // Schema Resources
  {
    uri: "schema://mongodb/products",
    name: "MongoDB Products Schema",
    description:
      "Schema definition for the paint products collection including all fields and types",
    mimeType: "application/json",
  },
  {
    uri: "schema://mongodb/orders",
    name: "MongoDB Orders Schema",
    description:
      "Schema definition for the paint orders collection with status workflow",
    mimeType: "application/json",
  },
  {
    uri: "schema://mongodb/suppliers",
    name: "MongoDB Suppliers Schema",
    description: "Schema definition for paint suppliers collection",
    mimeType: "application/json",
  },
  {
    uri: "schema://mysql/products",
    name: "MySQL Products Schema",
    description:
      "Schema definition for the food products table with nutritional info",
    mimeType: "application/json",
  },

  // Reference Data Resources
  {
    uri: "reference://colors",
    name: "Paint Color Catalog",
    description:
      "Complete catalog of available paint colors with hex codes and categories",
    mimeType: "application/json",
  },
  {
    uri: "reference://finishes",
    name: "Paint Finishes",
    description:
      "Available paint finishes (opaco, satinato, lucido) with descriptions",
    mimeType: "application/json",
  },
  {
    uri: "reference://categories",
    name: "Product Categories",
    description: "All product categories for both paints and food industries",
    mimeType: "application/json",
  },
  {
    uri: "reference://order-statuses",
    name: "Order Status Workflow",
    description: "Valid order statuses and allowed transitions between them",
    mimeType: "application/json",
  },

  // Business Rules Resources
  {
    uri: "rules://inventory-thresholds",
    name: "Inventory Thresholds",
    description:
      "Reorder thresholds and urgency levels for inventory management",
    mimeType: "application/json",
  },
  {
    uri: "rules://pricing",
    name: "Pricing Rules",
    description: "Pricing tiers, discounts, and markup rules",
    mimeType: "application/json",
  },

  // Analytics Snapshots
  {
    uri: "analytics://inventory-summary",
    name: "Current Inventory Summary",
    description: "Live snapshot of current inventory levels by category",
    mimeType: "application/json",
  },
  {
    uri: "analytics://sales-summary",
    name: "Sales Summary",
    description: "Recent sales performance summary",
    mimeType: "application/json",
  },
];

// Resource content handlers
export async function getResourceContent(uri: string): Promise<string> {
  logger.info({ uri }, "Fetching resource content");

  switch (uri) {
    // Schema Resources
    case "schema://mongodb/products":
      return JSON.stringify(
        {
          collection: "products",
          database: "paints_db",
          fields: {
            _id: { type: "ObjectId", description: "Unique identifier" },
            name: {
              type: "string",
              description: "Product name",
              required: true,
            },
            code: {
              type: "string",
              description: "Unique product code (e.g., INT-LAV-001)",
              required: true,
              unique: true,
            },
            type: {
              type: "string",
              enum: ["vernice", "pittura", "smalto", "primer", "fondo"],
              description: "Product type",
            },
            category: {
              type: "string",
              enum: ["interno", "esterno", "industriale"],
              description: "Usage category",
            },
            color: {
              type: "object",
              properties: {
                name: { type: "string", description: "Color name" },
                hex: {
                  type: "string",
                  description: "Hex color code (#RRGGBB)",
                },
                rgb: { type: "string", description: "RGB values" },
                pantone: { type: "string", description: "Pantone reference" },
              },
            },
            finish: {
              type: "string",
              enum: ["opaco", "satinato", "lucido"],
              description: "Paint finish type",
            },
            coverage: { type: "number", description: "Coverage in m²/L" },
            drying_time: {
              type: "string",
              description: "Drying time (e.g., '4-6 ore')",
            },
            price: { type: "number", description: "Price per unit in EUR" },
            stock_quantity: {
              type: "number",
              description: "Current stock quantity",
            },
            supplier_id: {
              type: "ObjectId",
              description: "Reference to supplier",
            },
            certifications: {
              type: "array",
              items: "string",
              description: "Product certifications",
            },
            technical_specs: {
              type: "object",
              description: "Technical specifications",
            },
            created_at: { type: "Date", description: "Creation timestamp" },
            updated_at: { type: "Date", description: "Last update timestamp" },
          },
          indexes: ["code", "category", "color.name", "supplier_id"],
        },
        null,
        2
      );

    case "schema://mongodb/orders":
      return JSON.stringify(
        {
          collection: "orders",
          database: "paints_db",
          fields: {
            _id: { type: "ObjectId", description: "Unique identifier" },
            order_number: {
              type: "string",
              description: "Order number (ORD-YYYY-XXXX)",
              unique: true,
            },
            customer_id: {
              type: "string|ObjectId",
              description: "Customer identifier",
            },
            items: {
              type: "array",
              items: {
                product_id: {
                  type: "ObjectId",
                  description: "Reference to product",
                },
                quantity: { type: "number", description: "Quantity ordered" },
                price: {
                  type: "number",
                  description: "Unit price at time of order",
                },
              },
            },
            total_amount: { type: "number", description: "Total order amount" },
            status: {
              type: "string",
              enum: [
                "pending",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
              ],
            },
            status_history: {
              type: "array",
              description: "History of status changes",
            },
            notes: { type: "string", description: "Order notes" },
            delivery_date: { type: "Date", description: "Delivery date" },
            created_at: {
              type: "Date",
              description: "Order creation timestamp",
            },
            updated_at: { type: "Date", description: "Last update timestamp" },
          },
          indexes: ["order_number", "customer_id", "status", "created_at"],
        },
        null,
        2
      );

    case "schema://mongodb/suppliers":
      return JSON.stringify(
        {
          collection: "suppliers",
          database: "paints_db",
          fields: {
            _id: { type: "ObjectId", description: "Unique identifier" },
            name: {
              type: "string",
              description: "Supplier name",
              required: true,
            },
            contact_info: {
              type: "object",
              properties: {
                email: { type: "string" },
                phone: { type: "string" },
                address: { type: "string" },
              },
            },
            products_supplied: {
              type: "array",
              items: "ObjectId",
              description: "Products supplied",
            },
            payment_terms: {
              type: "string",
              description: "Payment terms (e.g., Net 30)",
            },
            rating: {
              type: "number",
              min: 0,
              max: 5,
              description: "Supplier rating",
            },
          },
        },
        null,
        2
      );

    case "schema://mysql/products":
      return JSON.stringify(
        {
          table: "products",
          database: "food_industry",
          columns: {
            id: { type: "INT", primaryKey: true, autoIncrement: true },
            name: { type: "VARCHAR(255)", notNull: true },
            sku: { type: "VARCHAR(50)", unique: true },
            category_id: { type: "INT", foreignKey: "categories.id" },
            description: { type: "TEXT" },
            unit_price: { type: "DECIMAL(10,2)" },
            stock_quantity: { type: "INT", default: 0 },
            reorder_level: { type: "INT", default: 10 },
            nutritional_info: {
              type: "JSON",
              description: "Calories, proteins, fats, carbs, etc.",
            },
            allergens: { type: "JSON", description: "Array of allergen codes" },
            created_at: { type: "TIMESTAMP", default: "CURRENT_TIMESTAMP" },
            updated_at: { type: "TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" },
          },
          indexes: ["sku", "category_id", "stock_quantity"],
        },
        null,
        2
      );

    // Reference Data Resources
    case "reference://colors":
      try {
        const mongoClient = getMongoDBClient();
        const db = mongoClient.getDb();
        const colors = await db.collection("products").distinct("color");
        return JSON.stringify(
          {
            description: "Available paint colors from catalog",
            total_colors: colors.length,
            colors: colors
              .filter((c) => c && c.name)
              .map((c: any) => ({
                name: c.name,
                hex: c.hex,
                pantone: c.pantone || null,
              })),
          },
          null,
          2
        );
      } catch {
        return JSON.stringify(
          {
            description: "Available paint colors (static reference)",
            colors: [
              { name: "Bianco", hex: "#FFFFFF", category: "neutro" },
              { name: "Nero", hex: "#000000", category: "neutro" },
              { name: "Grigio", hex: "#808080", category: "neutro" },
              { name: "Rosso", hex: "#FF0000", category: "caldo" },
              { name: "Blu", hex: "#0000FF", category: "freddo" },
              { name: "Verde", hex: "#00FF00", category: "freddo" },
              { name: "Giallo", hex: "#FFFF00", category: "caldo" },
            ],
          },
          null,
          2
        );
      }

    case "reference://finishes":
      return JSON.stringify(
        {
          description: "Available paint finishes and their characteristics",
          finishes: [
            {
              code: "opaco",
              name: "Opaco (Matte)",
              description:
                "No shine, hides imperfections well, ideal for walls and ceilings",
              reflectivity: "0-10%",
              best_for: ["interior walls", "ceilings", "low-traffic areas"],
              durability: "medium",
            },
            {
              code: "satinato",
              name: "Satinato (Satin)",
              description:
                "Soft sheen, easy to clean, versatile for most surfaces",
              reflectivity: "10-35%",
              best_for: ["bathrooms", "kitchens", "hallways", "trim"],
              durability: "high",
            },
            {
              code: "lucido",
              name: "Lucido (Gloss)",
              description:
                "High shine, very durable, highlights surface imperfections",
              reflectivity: "35-70%",
              best_for: ["doors", "trim", "cabinets", "furniture"],
              durability: "very high",
            },
          ],
        },
        null,
        2
      );

    case "reference://categories":
      return JSON.stringify(
        {
          description: "Product categories for paints and food industries",
          paints: {
            categories: [
              {
                code: "interno",
                name: "Interior",
                description: "Paints for indoor use",
              },
              {
                code: "esterno",
                name: "Exterior",
                description: "Weather-resistant outdoor paints",
              },
              {
                code: "industriale",
                name: "Industrial",
                description: "Heavy-duty industrial coatings",
              },
            ],
            types: [
              {
                code: "vernice",
                name: "Varnish",
                description: "Clear protective coating",
              },
              {
                code: "pittura",
                name: "Paint",
                description: "Standard wall paint",
              },
              {
                code: "smalto",
                name: "Enamel",
                description: "Durable glossy finish",
              },
              {
                code: "primer",
                name: "Primer",
                description: "Base coat for adhesion",
              },
              {
                code: "fondo",
                name: "Undercoat",
                description: "Preparation layer",
              },
            ],
          },
          food: {
            categories: [
              "Pasta",
              "Dairy",
              "Meat",
              "Beverages",
              "Snacks",
              "Frozen",
              "Bakery",
              "Produce",
            ],
          },
        },
        null,
        2
      );

    case "reference://order-statuses":
      return JSON.stringify(
        {
          description: "Order status workflow and allowed transitions",
          statuses: [
            {
              code: "pending",
              name: "Pending",
              description: "Order received, awaiting processing",
            },
            {
              code: "processing",
              name: "Processing",
              description: "Order being prepared",
            },
            {
              code: "shipped",
              name: "Shipped",
              description: "Order dispatched for delivery",
            },
            {
              code: "delivered",
              name: "Delivered",
              description: "Order delivered to customer",
            },
            {
              code: "cancelled",
              name: "Cancelled",
              description: "Order cancelled",
            },
          ],
          transitions: {
            pending: ["processing", "cancelled"],
            processing: ["shipped", "cancelled"],
            shipped: ["delivered"],
            delivered: [],
            cancelled: [],
          },
          rules: [
            "Orders can only be cancelled before shipping",
            "Stock is reserved when order is created",
            "Stock is restored when order is cancelled",
            "Delivery date is set when status changes to delivered",
          ],
        },
        null,
        2
      );

    // Business Rules Resources
    case "rules://inventory-thresholds":
      return JSON.stringify(
        {
          description: "Inventory management thresholds and urgency levels",
          thresholds: {
            default_reorder_level: 20,
            critical_level: 5,
            out_of_stock: 0,
          },
          urgency_levels: [
            {
              level: "CRITICAL",
              condition: "stock_quantity == 0",
              action: "Immediate reorder required",
            },
            {
              level: "HIGH",
              condition: "stock_quantity <= 5",
              action: "Urgent reorder needed",
            },
            {
              level: "MEDIUM",
              condition: "stock_quantity <= 20",
              action: "Schedule reorder",
            },
            {
              level: "LOW",
              condition: "stock_quantity > 20",
              action: "No action needed",
            },
          ],
          category_specific: {
            interno: { reorder_level: 25, safety_stock: 10 },
            esterno: { reorder_level: 15, safety_stock: 5 },
            industriale: { reorder_level: 10, safety_stock: 3 },
          },
          reorder_formula:
            "order_quantity = (reorder_level * 2) - current_stock",
        },
        null,
        2
      );

    case "rules://pricing":
      return JSON.stringify(
        {
          description: "Pricing rules and discount structures",
          currency: "EUR",
          pricing_tiers: [
            { name: "Retail", markup: 1.0, min_quantity: 1 },
            { name: "Wholesale", markup: 0.85, min_quantity: 50 },
            { name: "Distributor", markup: 0.7, min_quantity: 200 },
          ],
          volume_discounts: [
            { min_quantity: 10, discount: 0.05 },
            { min_quantity: 25, discount: 0.1 },
            { min_quantity: 50, discount: 0.15 },
            { min_quantity: 100, discount: 0.2 },
          ],
          special_rules: [
            "Industrial category has 10% base discount",
            "Primer + Paint combo: 5% additional discount",
            "Seasonal promotions may override standard pricing",
          ],
        },
        null,
        2
      );

    // Analytics Snapshots (Live Data)
    case "analytics://inventory-summary":
      try {
        const mongoClient = getMongoDBClient();
        const db = mongoClient.getDb();
        const summary = await db
          .collection("products")
          .aggregate([
            {
              $group: {
                _id: "$category",
                total_products: { $sum: 1 },
                total_stock: { $sum: "$stock_quantity" },
                total_value: {
                  $sum: { $multiply: ["$stock_quantity", "$price"] },
                },
                out_of_stock: {
                  $sum: { $cond: [{ $eq: ["$stock_quantity", 0] }, 1, 0] },
                },
                low_stock: {
                  $sum: { $cond: [{ $lte: ["$stock_quantity", 20] }, 1, 0] },
                },
              },
            },
          ])
          .toArray();

        return JSON.stringify(
          {
            description: "Current inventory levels by category",
            generated_at: new Date().toISOString(),
            summary: summary.map((s) => ({
              category: s._id,
              total_products: s.total_products,
              total_stock_units: s.total_stock,
              total_stock_value: parseFloat(s.total_value.toFixed(2)),
              out_of_stock_count: s.out_of_stock,
              low_stock_count: s.low_stock,
            })),
          },
          null,
          2
        );
      } catch {
        return JSON.stringify({ error: "Unable to fetch live inventory data" });
      }

    case "analytics://sales-summary":
      try {
        const mongoClient = getMongoDBClient();
        const db = mongoClient.getDb();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sales = await db
          .collection("orders")
          .aggregate([
            { $match: { created_at: { $gte: thirtyDaysAgo } } },
            { $unwind: "$items" },
            { $match: { "items.price": { $type: "number" } } },
            {
              $group: {
                _id: null,
                total_orders: { $addToSet: "$_id" },
                total_revenue: {
                  $sum: { $multiply: ["$items.quantity", "$items.price"] },
                },
                total_items: { $sum: "$items.quantity" },
              },
            },
          ])
          .toArray();

        const result = sales[0] || {
          total_orders: [],
          total_revenue: 0,
          total_items: 0,
        };

        return JSON.stringify(
          {
            description: "Sales summary for the last 30 days",
            period: "last_30_days",
            generated_at: new Date().toISOString(),
            metrics: {
              total_orders: result.total_orders.length,
              total_revenue: parseFloat(result.total_revenue.toFixed(2)),
              total_items_sold: result.total_items,
              avg_order_value:
                result.total_orders.length > 0
                  ? parseFloat(
                      (
                        result.total_revenue / result.total_orders.length
                      ).toFixed(2)
                    )
                  : 0,
            },
          },
          null,
          2
        );
      } catch {
        return JSON.stringify({ error: "Unable to fetch live sales data" });
      }

    default:
      logger.warn({ uri }, "Unknown resource requested");
      return JSON.stringify({ error: `Unknown resource: ${uri}` });
  }
}
