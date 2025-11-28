// MongoDB Initialization Script - Paints Industry Database

db = db.getSiblingDB("paints_db");

// Create collections with validation
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "code", "type", "category", "price"],
      properties: {
        name: { bsonType: "string" },
        code: { bsonType: "string" },
        type: { bsonType: "string" },
        category: { bsonType: "string" },
        price: { bsonType: "number", minimum: 0 },
      },
    },
  },
});

db.createCollection("suppliers");
db.createCollection("color_formulas");
db.createCollection("orders");

// Create indexes for optimized queries
db.products.createIndex({ code: 1 }, { unique: true });
db.products.createIndex({ "color.hex": 1 });
db.products.createIndex({ type: 1, category: 1 });
db.products.createIndex({ name: "text", code: "text" });

db.suppliers.createIndex({ name: 1 });
db.color_formulas.createIndex({ final_color: 1 });
db.orders.createIndex({ order_number: 1 }, { unique: true });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ customer_id: 1 });

print("MongoDB initialization completed for paints_db");
