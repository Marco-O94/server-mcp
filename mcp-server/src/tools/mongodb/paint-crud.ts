import { ObjectId } from "mongodb";
import { getMongoDBClient } from "../../database/mongodb-client.js";
import pino from "pino";

const logger = pino(
  { name: "paint-crud-tool" },
  pino.destination({ dest: 2, sync: false })
);

/**
 * Create a new paint order
 */
export const createOrderTool = {
  name: "create_order",
  description:
    "Create a new paint order with one or more items. Automatically calculates total and sets initial status.",
  inputSchema: {
    type: "object",
    properties: {
      customer_id: {
        type: "string",
        description: "Customer ID placing the order",
      },
      items: {
        type: "array",
        description: "Array of items to order",
        items: {
          type: "object",
          properties: {
            product_code: {
              type: "string",
              description: "Product code",
            },
            quantity: {
              type: "number",
              description: "Quantity to order",
            },
          },
          required: ["product_code", "quantity"],
        },
      },
      notes: {
        type: "string",
        description: "Optional order notes",
      },
    },
    required: ["customer_id", "items"],
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        customer_id: string;
        items: Array<{ product_code: string; quantity: number }>;
        notes?: string;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      // Resolve product codes to products and calculate prices
      const orderItems = [];
      let totalAmount = 0;
      const errors: string[] = [];

      for (const item of input.items) {
        const product = await db
          .collection("products")
          .findOne({ code: item.product_code });

        if (!product) {
          errors.push(`Product not found: ${item.product_code}`);
          continue;
        }

        if (product.stock_quantity < item.quantity) {
          errors.push(
            `Insufficient stock for ${item.product_code}: requested ${item.quantity}, available ${product.stock_quantity}`
          );
          continue;
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product_id: product._id,
          quantity: item.quantity,
          price: product.price,
          product_name: product.name,
          product_code: product.code,
        });
      }

      if (errors.length > 0 && orderItems.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                errors,
              }),
            },
          ],
        };
      }

      // Generate order number
      const orderCount = await db.collection("orders").countDocuments();
      const orderNumber = `ORD-${new Date().getFullYear()}-${String(
        orderCount + 1
      ).padStart(4, "0")}`;

      // Parse customer_id
      let customerId: ObjectId | string = input.customer_id;
      if (/^[0-9a-fA-F]{24}$/.test(input.customer_id)) {
        customerId = new ObjectId(input.customer_id);
      }

      const newOrder = {
        order_number: orderNumber,
        customer_id: customerId,
        items: orderItems,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        status: "pending",
        notes: input.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await db.collection("orders").insertOne(newOrder);

      // Optionally reduce stock for each item
      for (const item of orderItems) {
        await db.collection("products").updateOne(
          { _id: item.product_id },
          {
            $inc: { stock_quantity: -item.quantity },
            $set: { updated_at: new Date() },
          }
        );
      }

      logger.info(
        { order_number: orderNumber, total: totalAmount },
        "Created new order"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                order_id: result.insertedId.toString(),
                order_number: orderNumber,
                customer_id: input.customer_id,
                items: orderItems.map((i) => ({
                  product: i.product_name,
                  code: i.product_code,
                  quantity: i.quantity,
                  unit_price: i.price,
                  subtotal: parseFloat((i.quantity * i.price).toFixed(2)),
                })),
                total_amount: newOrder.total_amount,
                status: newOrder.status,
                created_at: newOrder.created_at.toISOString(),
                warnings: errors.length > 0 ? errors : undefined,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error creating order");
      throw error;
    }
  },
};

/**
 * Update order status
 */
export const updateOrderStatusTool = {
  name: "update_order_status",
  description:
    "Update the status of an existing paint order. Tracks status transitions and timestamps.",
  inputSchema: {
    type: "object",
    properties: {
      order_number: {
        type: "string",
        description: "The order number (e.g., ORD-2024-0001)",
      },
      new_status: {
        type: "string",
        enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
        description: "New status for the order",
      },
      notes: {
        type: "string",
        description: "Optional notes about the status change",
      },
    },
    required: ["order_number", "new_status"],
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        order_number: string;
        new_status: string;
        notes?: string;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      // Find the order
      const order = await db
        .collection("orders")
        .findOne({ order_number: input.order_number });

      if (!order) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Order not found",
                order_number: input.order_number,
              }),
            },
          ],
        };
      }

      const previousStatus = order.status;

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        pending: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: [],
      };

      if (!validTransitions[previousStatus]?.includes(input.new_status)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Invalid status transition from '${previousStatus}' to '${input.new_status}'`,
                valid_transitions: validTransitions[previousStatus],
              }),
            },
          ],
        };
      }

      // Update fields based on new status
      const updateFields: any = {
        status: input.new_status,
        updated_at: new Date(),
      };

      if (input.new_status === "delivered") {
        updateFields.delivery_date = new Date();
      }

      if (input.new_status === "cancelled") {
        // Restore stock for cancelled orders
        for (const item of order.items) {
          await db.collection("products").updateOne(
            { _id: item.product_id },
            {
              $inc: { stock_quantity: item.quantity },
              $set: { updated_at: new Date() },
            }
          );
        }
      }

      await db.collection("orders").updateOne(
        { order_number: input.order_number },
        {
          $set: updateFields,
          $push: {
            status_history: {
              from: previousStatus,
              to: input.new_status,
              changed_at: new Date(),
              notes: input.notes || null,
            } as any,
          },
        }
      );

      logger.info(
        {
          order_number: input.order_number,
          from: previousStatus,
          to: input.new_status,
        },
        "Updated order status"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                order_number: input.order_number,
                previous_status: previousStatus,
                new_status: input.new_status,
                updated_at: updateFields.updated_at.toISOString(),
                delivery_date: updateFields.delivery_date?.toISOString(),
                stock_restored: input.new_status === "cancelled",
                notes: input.notes,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error updating order status");
      throw error;
    }
  },
};

/**
 * Add a new paint product
 */
export const addProductTool = {
  name: "add_product",
  description:
    "Add a new paint product to the catalog with all specifications.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Product name",
      },
      code: {
        type: "string",
        description: "Unique product code",
      },
      type: {
        type: "string",
        enum: ["vernice", "pittura", "smalto", "primer", "fondo"],
        description: "Product type",
      },
      category: {
        type: "string",
        enum: ["interno", "esterno", "industriale"],
        description: "Product category",
      },
      color: {
        type: "object",
        description: "Color information",
        properties: {
          name: { type: "string" },
          hex: { type: "string" },
          rgb: { type: "string" },
          pantone: { type: "string" },
        },
        required: ["name", "hex"],
      },
      finish: {
        type: "string",
        enum: ["opaco", "satinato", "lucido"],
        description: "Paint finish",
      },
      price: {
        type: "number",
        description: "Price per unit",
      },
      stock_quantity: {
        type: "number",
        description: "Initial stock quantity",
      },
      coverage: {
        type: "number",
        description: "Coverage in m²/L",
      },
      drying_time: {
        type: "string",
        description: "Drying time (e.g., '4-6 ore')",
      },
      supplier_id: {
        type: "string",
        description: "Supplier ID (ObjectId)",
      },
    },
    required: ["name", "code", "type", "category", "color", "finish", "price"],
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        name: string;
        code: string;
        type: string;
        category: string;
        color: { name: string; hex: string; rgb?: string; pantone?: string };
        finish: string;
        price: number;
        stock_quantity?: number;
        coverage?: number;
        drying_time?: string;
        supplier_id?: string;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      // Check if code already exists
      const existing = await db
        .collection("products")
        .findOne({ code: input.code });

      if (existing) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Product code already exists",
                existing_product: {
                  code: existing.code,
                  name: existing.name,
                },
              }),
            },
          ],
        };
      }

      const newProduct: any = {
        name: input.name,
        code: input.code,
        type: input.type,
        category: input.category,
        color: {
          name: input.color.name,
          hex: input.color.hex,
          rgb: input.color.rgb || null,
          pantone: input.color.pantone || null,
        },
        finish: input.finish,
        price: input.price,
        stock_quantity: input.stock_quantity || 0,
        coverage: input.coverage || null,
        drying_time: input.drying_time || null,
        certifications: [],
        technical_specs: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      if (input.supplier_id && /^[0-9a-fA-F]{24}$/.test(input.supplier_id)) {
        newProduct.supplier_id = new ObjectId(input.supplier_id);
      }

      const result = await db.collection("products").insertOne(newProduct);

      logger.info({ code: input.code, name: input.name }, "Added new product");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                product_id: result.insertedId.toString(),
                product: {
                  code: newProduct.code,
                  name: newProduct.name,
                  type: newProduct.type,
                  category: newProduct.category,
                  color: newProduct.color,
                  finish: newProduct.finish,
                  price: newProduct.price,
                  stock_quantity: newProduct.stock_quantity,
                  created_at: newProduct.created_at.toISOString(),
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error adding product");
      throw error;
    }
  },
};

/**
 * Update an existing product
 */
export const updateProductTool = {
  name: "update_product",
  description:
    "Update an existing paint product's information. Only specified fields will be updated.",
  inputSchema: {
    type: "object",
    properties: {
      product_code: {
        type: "string",
        description: "Product code to update",
      },
      updates: {
        type: "object",
        description: "Fields to update",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          category: {
            type: "string",
            enum: ["interno", "esterno", "industriale"],
          },
          finish: {
            type: "string",
            enum: ["opaco", "satinato", "lucido"],
          },
          coverage: { type: "number" },
          drying_time: { type: "string" },
          color: {
            type: "object",
            properties: {
              name: { type: "string" },
              hex: { type: "string" },
            },
          },
        },
      },
    },
    required: ["product_code", "updates"],
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        product_code: string;
        updates: Record<string, any>;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

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

      // Build update object
      const updateFields: Record<string, any> = {
        updated_at: new Date(),
      };

      const allowedFields = [
        "name",
        "price",
        "category",
        "finish",
        "coverage",
        "drying_time",
        "color",
      ];

      for (const field of allowedFields) {
        if (input.updates[field] !== undefined) {
          if (field === "color" && typeof input.updates.color === "object") {
            // Merge color updates
            updateFields.color = {
              ...product.color,
              ...input.updates.color,
            };
          } else {
            updateFields[field] = input.updates[field];
          }
        }
      }

      await db
        .collection("products")
        .updateOne({ code: input.product_code }, { $set: updateFields });

      // Get updated product
      const updatedProduct = await db
        .collection("products")
        .findOne({ code: input.product_code });

      logger.info({ product_code: input.product_code }, "Updated product");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                product_code: input.product_code,
                fields_updated: Object.keys(updateFields).filter(
                  (k) => k !== "updated_at"
                ),
                updated_product: {
                  code: updatedProduct?.code,
                  name: updatedProduct?.name,
                  price: updatedProduct?.price,
                  category: updatedProduct?.category,
                  finish: updatedProduct?.finish,
                  color: updatedProduct?.color,
                },
                updated_at: updateFields.updated_at.toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error updating product");
      throw error;
    }
  },
};

/**
 * Delete a product (soft delete)
 */
export const deleteProductTool = {
  name: "delete_product",
  description:
    "Delete a paint product from the catalog. This is a soft delete that marks the product as inactive.",
  inputSchema: {
    type: "object",
    properties: {
      product_code: {
        type: "string",
        description: "Product code to delete",
      },
      hard_delete: {
        type: "boolean",
        description:
          "If true, permanently removes the product (default: false for soft delete)",
      },
    },
    required: ["product_code"],
  },
  handler: async (args: unknown) => {
    try {
      const input = args as {
        product_code: string;
        hard_delete?: boolean;
      };
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

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

      // Check if product has pending orders
      const pendingOrders = await db.collection("orders").countDocuments({
        "items.product_id": product._id,
        status: { $in: ["pending", "processing"] },
      });

      if (pendingOrders > 0 && !input.hard_delete) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Cannot delete product with pending orders",
                pending_orders: pendingOrders,
                suggestion: "Complete or cancel pending orders first",
              }),
            },
          ],
        };
      }

      if (input.hard_delete) {
        // Permanent delete
        await db.collection("products").deleteOne({ code: input.product_code });
        logger.warn(
          { product_code: input.product_code },
          "Hard deleted product"
        );
      } else {
        // Soft delete
        await db.collection("products").updateOne(
          { code: input.product_code },
          {
            $set: {
              is_active: false,
              deleted_at: new Date(),
              updated_at: new Date(),
            },
          }
        );
        logger.info(
          { product_code: input.product_code },
          "Soft deleted product"
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                product_code: input.product_code,
                product_name: product.name,
                delete_type: input.hard_delete ? "permanent" : "soft",
                deleted_at: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error deleting product");
      throw error;
    }
  },
};
