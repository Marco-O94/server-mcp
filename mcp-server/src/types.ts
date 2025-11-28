// Type definitions for MCP Database Server
import { z } from "zod";

// MongoDB Types - Paints Database
export const PaintProductSchema = z.object({
  _id: z.string().optional(),
  product_code: z.string(),
  name: z.string(),
  type: z.enum(["acrilica", "smalto", "idropittura", "finitura", "primer"]),
  color: z.object({
    name: z.string(),
    hex: z.string(),
    pantone: z.string().optional(),
    ral: z.string().optional(),
  }),
  finish: z.enum(["opaca", "satinata", "lucida"]),
  volume_liters: z.number(),
  price_per_liter: z.number(),
  stock_quantity: z.number(),
  supplier_id: z.string(),
  specifications: z.object({
    coverage_sqm_per_liter: z.number(),
    drying_time_hours: z.number(),
    voc_content: z.string(),
    certifications: z.array(z.string()),
  }),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const PaintSupplierSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  contact_info: z.object({
    email: z.string(),
    phone: z.string(),
    address: z.string(),
  }),
  products_supplied: z.array(z.string()),
  payment_terms: z.string(),
  rating: z.number(),
});

export const ColorFormulaSchema = z.object({
  _id: z.string().optional(),
  formula_code: z.string(),
  color_name: z.string(),
  base_type: z.string(),
  pigments: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      percentage: z.number(),
    })
  ),
  mixing_instructions: z.string(),
  created_at: z.date().optional(),
});

export const PaintOrderSchema = z.object({
  _id: z.string().optional(),
  order_number: z.string(),
  customer: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  items: z.array(
    z.object({
      product_id: z.string(),
      product_code: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
    })
  ),
  total_amount: z.number(),
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  order_date: z.date(),
  delivery_address: z.string(),
});

// MySQL Types - Food Database
export const FoodProductSchema = z.object({
  id: z.number().optional(),
  category_id: z.number(),
  supplier_id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  barcode: z.string(),
  unit_price: z.number(),
  stock_quantity: z.number(),
  minimum_stock: z.number(),
  unit_of_measure: z.string(),
  weight_kg: z.number().optional(),
  shelf_life_days: z.number(),
  storage_temperature: z.string().optional(),
  allergens: z.string().optional(),
  certifications: z.string().optional(),
  nutritional_info: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const FoodCategorySchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  description: z.string().optional(),
  parent_category_id: z.number().optional(),
  created_at: z.date().optional(),
});

export const BatchSchema = z.object({
  id: z.number().optional(),
  product_id: z.number(),
  batch_number: z.string(),
  production_date: z.date(),
  expiry_date: z.date(),
  quantity_produced: z.number(),
  quantity_remaining: z.number(),
  production_plant: z.string(),
  quality_status: z.enum(["passed", "pending", "failed"]),
  notes: z.string().optional(),
  created_at: z.date().optional(),
});

export const FoodSupplierSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  vat_number: z.string(),
  contact_person: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  country: z.string(),
  payment_terms: z.string(),
  quality_rating: z.number(),
  is_active: z.boolean(),
  created_at: z.date().optional(),
});

export const FoodOrderSchema = z.object({
  id: z.number().optional(),
  supplier_id: z.number(),
  order_number: z.string(),
  order_date: z.date(),
  expected_delivery_date: z.date().optional(),
  actual_delivery_date: z.date().optional(),
  status: z.enum([
    "draft",
    "submitted",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  total_amount: z.number(),
  notes: z.string().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Tool Input Schemas
export const ListPaintProductsInputSchema = z.object({
  limit: z
    .number()
    .default(50)
    .describe("Maximum number of products to return"),
  offset: z.number().default(0).describe("Number of products to skip"),
  type: z
    .enum(["acrilica", "smalto", "idropittura", "finitura", "primer"])
    .optional()
    .describe("Filter by paint type"),
});

export const SearchPaintByColorInputSchema = z.object({
  color_name: z.string().describe("Color name to search for"),
  finish: z
    .enum(["opaca", "satinata", "lucida"])
    .optional()
    .describe("Filter by finish type"),
});

export const GetPaintProductDetailsInputSchema = z.object({
  product_code: z.string().describe("Product code to fetch details for"),
});

export const GetColorFormulaInputSchema = z.object({
  color_name: z.string().describe("Color name to get formula for"),
});

export const ListPaintOrdersInputSchema = z.object({
  status: z
    .enum([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ])
    .optional()
    .describe("Filter by order status"),
  limit: z.number().default(50).describe("Maximum number of orders to return"),
});

export const ListFoodProductsInputSchema = z.object({
  category_id: z.number().optional().describe("Filter by category ID"),
  limit: z
    .number()
    .default(50)
    .describe("Maximum number of products to return"),
  offset: z.number().default(0).describe("Number of products to skip"),
});

export const SearchFoodProductsInputSchema = z.object({
  search_term: z
    .string()
    .describe("Search term for product name or description"),
  category_id: z.number().optional().describe("Filter by category ID"),
});

export const GetFoodProductDetailsInputSchema = z.object({
  product_id: z.number().describe("Product ID to fetch details for"),
});

export const GetProductBatchesInputSchema = z.object({
  product_id: z.number().describe("Product ID to get batches for"),
  quality_status: z
    .enum(["passed", "pending", "failed"])
    .optional()
    .describe("Filter by quality status"),
});

export const GetLowStockProductsInputSchema = z.object({
  threshold_percentage: z
    .number()
    .default(20)
    .describe("Percentage threshold for low stock (default 20%)"),
});

export const ListFoodOrdersInputSchema = z.object({
  supplier_id: z.number().optional().describe("Filter by supplier ID"),
  status: z
    .enum([
      "draft",
      "submitted",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ])
    .optional()
    .describe("Filter by order status"),
  limit: z.number().default(50).describe("Maximum number of orders to return"),
});

export type PaintProduct = z.infer<typeof PaintProductSchema>;
export type PaintSupplier = z.infer<typeof PaintSupplierSchema>;
export type ColorFormula = z.infer<typeof ColorFormulaSchema>;
export type PaintOrder = z.infer<typeof PaintOrderSchema>;
export type FoodProduct = z.infer<typeof FoodProductSchema>;
export type FoodCategory = z.infer<typeof FoodCategorySchema>;
export type Batch = z.infer<typeof BatchSchema>;
export type FoodSupplier = z.infer<typeof FoodSupplierSchema>;
export type FoodOrder = z.infer<typeof FoodOrderSchema>;
