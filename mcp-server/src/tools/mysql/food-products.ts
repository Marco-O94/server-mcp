import { getMySQLClient } from "../../database/mysql-client.js";
import {
  ListFoodProductsInputSchema,
  SearchFoodProductsInputSchema,
  GetFoodProductDetailsInputSchema,
} from "../../types.js";
import pino from "pino";

const logger = pino(
  { name: "food-products-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const listFoodProductsTool = {
  name: "list_food_products",
  description:
    "List food products from the MySQL database. Supports filtering by category and pagination.",
  inputSchema: {
    type: "object",
    properties: {
      category_id: {
        type: "number",
        description: "Filter by category ID",
      },
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
    },
  },
  handler: async (args: unknown) => {
    try {
      const input = ListFoodProductsInputSchema.parse(args);
      const mysqlClient = getMySQLClient();

      let query = `
        SELECT p.*, c.name as category_name, s.name as supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.is_active = 1
      `;
      const params: any[] = [];

      if (input.category_id) {
        query += " AND p.category_id = ?";
        params.push(input.category_id);
      }

      query += " ORDER BY p.name LIMIT ? OFFSET ?";
      params.push(input.limit, input.offset);

      const products = await mysqlClient.query(query, params);

      // Get total count
      let countQuery =
        "SELECT COUNT(*) as total FROM products WHERE is_active = 1";
      const countParams: any[] = [];
      if (input.category_id) {
        countQuery += " AND category_id = ?";
        countParams.push(input.category_id);
      }
      const countResult = await mysqlClient.query<{ total: number }>(
        countQuery,
        countParams
      );
      const total = countResult[0]?.total || 0;

      logger.info({ count: products.length, total }, "Listed food products");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                products,
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
      logger.error({ error }, "Error listing food products");
      throw error;
    }
  },
};

export const searchFoodProductsTool = {
  name: "search_food_products",
  description:
    "Search for food products by name or description. Supports optional category filtering.",
  inputSchema: {
    type: "object",
    properties: {
      search_term: {
        type: "string",
        description: "Search term for product name or description",
      },
      category_id: {
        type: "number",
        description: "Optional filter by category ID",
      },
    },
    required: ["search_term"],
  },
  handler: async (args: unknown) => {
    try {
      const input = SearchFoodProductsInputSchema.parse(args);
      const mysqlClient = getMySQLClient();

      let query = `
        SELECT p.*, c.name as category_name, s.name as supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.is_active = 1 
        AND (p.name LIKE ? OR p.description LIKE ?)
      `;
      const params: any[] = [
        `%${input.search_term}%`,
        `%${input.search_term}%`,
      ];

      if (input.category_id) {
        query += " AND p.category_id = ?";
        params.push(input.category_id);
      }

      query += " ORDER BY p.name";

      const products = await mysqlClient.query(query, params);

      logger.info(
        { search_term: input.search_term, count: products.length },
        "Searched food products"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                search_query: {
                  search_term: input.search_term,
                  category_id: input.category_id,
                },
                results_count: products.length,
                products,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error searching food products");
      throw error;
    }
  },
};

export const getFoodProductDetailsTool = {
  name: "get_food_product_details",
  description:
    "Get detailed information about a specific food product by ID, including supplier and category information.",
  inputSchema: {
    type: "object",
    properties: {
      product_id: {
        type: "number",
        description: "Product ID to fetch details for",
      },
    },
    required: ["product_id"],
  },
  handler: async (args: unknown) => {
    try {
      const input = GetFoodProductDetailsInputSchema.parse(args);
      const mysqlClient = getMySQLClient();

      const query = `
        SELECT p.*, c.name as category_name, s.name as supplier_name,
               s.contact_person, s.email as supplier_email, s.phone as supplier_phone
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id = ?
      `;

      const products = await mysqlClient.query(query, [input.product_id]);

      if (products.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: `Product with ID ${input.product_id} not found`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      logger.info(
        { product_id: input.product_id },
        "Retrieved food product details"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                product: products[0],
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving food product details");
      throw error;
    }
  },
};
