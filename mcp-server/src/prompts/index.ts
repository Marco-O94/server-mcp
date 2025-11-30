/**
 * MCP Prompts - Pre-defined conversation templates for common tasks
 */

import pino from "pino";

const logger = pino(
  { name: "mcp-prompts" },
  pino.destination({ dest: 2, sync: false })
);

// Prompt definitions
export const PROMPTS = [
  // Sales & Analytics Prompts
  {
    name: "analyze-sales",
    description:
      "Analyze sales performance for a specific time period with detailed breakdown by product, category, and trends",
    arguments: [
      {
        name: "start_date",
        description: "Start date for analysis (YYYY-MM-DD)",
        required: true,
      },
      {
        name: "end_date",
        description: "End date for analysis (YYYY-MM-DD)",
        required: true,
      },
      {
        name: "category",
        description:
          "Optional: Filter by product category (interno, esterno, industriale)",
        required: false,
      },
    ],
  },
  {
    name: "compare-periods",
    description:
      "Compare sales performance between two time periods to identify growth or decline",
    arguments: [
      {
        name: "period1_start",
        description: "First period start date (YYYY-MM-DD)",
        required: true,
      },
      {
        name: "period1_end",
        description: "First period end date (YYYY-MM-DD)",
        required: true,
      },
      {
        name: "period2_start",
        description: "Second period start date (YYYY-MM-DD)",
        required: true,
      },
      {
        name: "period2_end",
        description: "Second period end date (YYYY-MM-DD)",
        required: true,
      },
    ],
  },
  {
    name: "forecast-demand",
    description:
      "Forecast product demand based on historical sales data and trends",
    arguments: [
      {
        name: "days_ahead",
        description: "Number of days to forecast (default: 30)",
        required: false,
      },
      {
        name: "category",
        description: "Product category to forecast",
        required: false,
      },
    ],
  },

  // Inventory Management Prompts
  {
    name: "reorder-report",
    description:
      "Generate a comprehensive reorder report for products that need restocking",
    arguments: [
      {
        name: "threshold",
        description: "Stock threshold to consider low (default: 20)",
        required: false,
      },
      {
        name: "urgency",
        description: "Filter by urgency level: CRITICAL, HIGH, MEDIUM",
        required: false,
      },
      {
        name: "include_supplier",
        description: "Include supplier contact information (true/false)",
        required: false,
      },
    ],
  },
  {
    name: "stock-audit",
    description:
      "Perform a stock audit to identify discrepancies and anomalies in inventory",
    arguments: [
      {
        name: "category",
        description: "Category to audit (or 'all' for complete audit)",
        required: false,
      },
      {
        name: "include_zero_stock",
        description: "Include out-of-stock products (true/false)",
        required: false,
      },
    ],
  },
  {
    name: "expiry-check",
    description:
      "Check for products or batches approaching expiration (food industry)",
    arguments: [
      {
        name: "days_until_expiry",
        description: "Alert threshold in days (default: 30)",
        required: false,
      },
    ],
  },

  // Customer Intelligence Prompts
  {
    name: "customer-analysis",
    description:
      "Analyze customer behavior, preferences, and purchase patterns",
    arguments: [
      {
        name: "customer_id",
        description:
          "Specific customer ID to analyze (or 'top' for top customers)",
        required: false,
      },
      {
        name: "period",
        description: "Analysis period: 'month', 'quarter', 'year'",
        required: false,
      },
    ],
  },
  {
    name: "product-recommendation",
    description:
      "Generate product recommendations based on customer purchase history",
    arguments: [
      {
        name: "customer_id",
        description: "Customer ID to generate recommendations for",
        required: true,
      },
      {
        name: "limit",
        description: "Maximum number of recommendations (default: 5)",
        required: false,
      },
    ],
  },

  // Report Generation Prompts
  {
    name: "monthly-report",
    description:
      "Generate a comprehensive monthly business report with sales, inventory, and customer metrics",
    arguments: [
      {
        name: "month",
        description: "Month number (1-12)",
        required: true,
      },
      {
        name: "year",
        description: "Year (YYYY)",
        required: true,
      },
      {
        name: "format",
        description: "Report format: 'summary', 'detailed', 'executive'",
        required: false,
      },
    ],
  },
  {
    name: "supplier-performance",
    description:
      "Evaluate supplier performance based on delivery, quality, and pricing",
    arguments: [
      {
        name: "supplier_id",
        description: "Specific supplier ID (or 'all' for all suppliers)",
        required: false,
      },
      {
        name: "period_months",
        description: "Evaluation period in months (default: 6)",
        required: false,
      },
    ],
  },
  {
    name: "category-analysis",
    description: "Deep analysis of a specific product category performance",
    arguments: [
      {
        name: "category",
        description: "Category to analyze (interno, esterno, industriale)",
        required: true,
      },
      {
        name: "metrics",
        description:
          "Metrics to include: 'sales', 'inventory', 'trends', 'all'",
        required: false,
      },
    ],
  },

  // Data Entry & Operations Prompts
  {
    name: "new-product-wizard",
    description:
      "Guided wizard for adding a new product to the catalog with all required fields",
    arguments: [
      {
        name: "product_type",
        description: "Type of product: 'paint' or 'food'",
        required: true,
      },
    ],
  },
  {
    name: "bulk-stock-update",
    description: "Update stock levels for multiple products at once",
    arguments: [
      {
        name: "source",
        description: "Source of stock data: 'delivery', 'audit', 'return'",
        required: true,
      },
    ],
  },
  {
    name: "order-creation",
    description:
      "Guided order creation with product selection, quantity validation, and pricing",
    arguments: [
      {
        name: "customer_id",
        description: "Customer ID for the order",
        required: true,
      },
    ],
  },
];

// Get prompt messages (the actual conversation template)
export function getPromptMessages(
  promptName: string,
  args: Record<string, string>
): Array<{ role: "user" | "assistant"; content: string }> {
  logger.info({ promptName, args }, "Generating prompt messages");

  switch (promptName) {
    case "analyze-sales":
      return [
        {
          role: "user",
          content: `Please analyze our sales performance from ${
            args.start_date
          } to ${args.end_date}${
            args.category ? ` for the ${args.category} category` : ""
          }.

I need you to:
1. First, use the get_sales_trends tool to fetch sales data for this period
2. Use get_revenue_by_category to see the category breakdown
3. Use get_top_customers to identify our best customers during this period

Please provide:
- Total revenue and units sold
- Top performing products
- Sales trends (daily/weekly patterns)
- Customer concentration analysis
- Recommendations for improvement`,
        },
      ];

    case "compare-periods":
      return [
        {
          role: "user",
          content: `Compare our sales performance between two periods:
- Period 1: ${args.period1_start} to ${args.period1_end}
- Period 2: ${args.period2_start} to ${args.period2_end}

Use the compare_periods tool to analyze:
1. Revenue growth/decline percentage
2. Volume changes
3. Customer behavior changes
4. Product performance shifts

Provide insights on what's driving the changes and actionable recommendations.`,
        },
      ];

    case "forecast-demand":
      return [
        {
          role: "user",
          content: `Forecast product demand for the next ${
            args.days_ahead || 30
          } days${args.category ? ` for the ${args.category} category` : ""}.

Steps:
1. Use get_sales_trends to analyze historical patterns (look back 90 days)
2. Use predict_stock_out to see current trajectory
3. Use get_stock_summary to see current inventory levels

Based on this data, provide:
- Demand forecast by product
- Recommended order quantities
- Risk assessment for stockouts
- Seasonal factors to consider`,
        },
      ];

    case "reorder-report":
      return [
        {
          role: "user",
          content: `Generate a reorder report for products that need restocking.

Use these tools:
1. check_reorder_needed with threshold ${args.threshold || 20}${
            args.urgency ? ` filtered by urgency: ${args.urgency}` : ""
          }
2. get_stock_summary grouped by supplier
3. predict_stock_out to prioritize orders

Format the report with:
- Products sorted by urgency
- Supplier contact information${
            args.include_supplier === "true" ? " (included)" : " (if available)"
          }
- Recommended order quantities
- Estimated reorder cost
- Lead time considerations`,
        },
      ];

    case "stock-audit":
      return [
        {
          role: "user",
          content: `Perform a comprehensive stock audit${
            args.category && args.category !== "all"
              ? ` for the ${args.category} category`
              : ""
          }.

Steps:
1. Use get_stock_summary to get current levels
2. Use check_reorder_needed to find low stock items
3. Use list_paint_products to verify product status

Identify:
- Products with zero stock${
            args.include_zero_stock === "true" ? " (included)" : ""
          }
- Unusual stock patterns
- Discrepancies between expected and actual levels
- Products that haven't sold recently (dead stock)
- Recommendations for inventory optimization`,
        },
      ];

    case "expiry-check":
      return [
        {
          role: "user",
          content: `Check for products approaching expiration within ${
            args.days_until_expiry || 30
          } days.

Use get_product_batches to find batches expiring soon.

Report:
- Products expiring soon (sorted by date)
- Quantity at risk
- Recommended actions (discounts, donations, disposal)
- Financial impact assessment`,
        },
      ];

    case "customer-analysis":
      return [
        {
          role: "user",
          content: `Analyze customer ${
            args.customer_id === "top"
              ? "ranking and top performers"
              : `${args.customer_id}`
          } for the ${args.period || "quarter"} period.

${
  args.customer_id === "top"
    ? `Use get_top_customers to identify our best customers.`
    : `Use get_customer_insights for customer ${args.customer_id}.
Use get_customer_orders to see their complete history.`
}

Provide:
- Purchase patterns and preferences
- Average order value and frequency
- Product preferences (categories, colors, finishes)
- Customer lifetime value
- Recommendations for engagement`,
        },
      ];

    case "product-recommendation":
      return [
        {
          role: "user",
          content: `Generate product recommendations for customer ${
            args.customer_id
          }.

Steps:
1. Use get_customer_insights to understand their preferences
2. Use get_customer_orders to see purchase history
3. Use list_paint_products to find matching products they haven't bought

Recommend up to ${args.limit || 5} products based on:
- Purchase history patterns
- Category preferences
- Color preferences
- Complementary products (e.g., primer + paint combos)`,
        },
      ];

    case "monthly-report":
      return [
        {
          role: "user",
          content: `Generate a ${
            args.format || "detailed"
          } monthly report for ${args.month}/${args.year}.

Gather data using:
1. get_sales_trends for the month
2. get_revenue_by_category 
3. get_top_customers
4. get_stock_summary
5. check_reorder_needed

Include:
- Executive summary
- Sales performance (vs previous month and same month last year)
- Top products and categories
- Customer metrics
- Inventory status
- Key insights and recommendations
- Action items for next month`,
        },
      ];

    case "supplier-performance":
      return [
        {
          role: "user",
          content: `Evaluate supplier performance${
            args.supplier_id && args.supplier_id !== "all"
              ? ` for supplier ${args.supplier_id}`
              : " for all suppliers"
          } over the last ${args.period_months || 6} months.

Use list_paint_suppliers and analyze:
- Product quality (based on stock and sales)
- Product range and availability
- Pricing competitiveness

Provide:
- Supplier scorecard
- Strengths and weaknesses
- Recommendations for supplier relationships`,
        },
      ];

    case "category-analysis":
      return [
        {
          role: "user",
          content: `Perform deep analysis of the ${args.category} category.

Gather data:
1. list_paint_products filtered by category
2. get_revenue_by_category
3. get_sales_trends for category
4. get_stock_summary grouped by category

Metrics to analyze: ${args.metrics || "all"}

Provide:
- Category performance overview
- Top products in category
- Price point analysis
- Stock health
- Growth opportunities
- Competitive positioning`,
        },
      ];

    case "new-product-wizard":
      return [
        {
          role: "user",
          content: `Help me add a new ${
            args.product_type
          } product to the catalog.

I'll need to collect this information:
${
  args.product_type === "paint"
    ? `
For paint products:
1. Product name and code (format: XXX-YYY-NNN)
2. Type (vernice, pittura, smalto, primer, fondo)
3. Category (interno, esterno, industriale)
4. Color details (name, hex code)
5. Finish (opaco, satinato, lucido)
6. Price per unit
7. Initial stock quantity
8. Coverage (m²/L)
9. Drying time
10. Supplier ID (optional)

Use add_product tool once all information is collected.`
    : `
For food products:
1. Product name and SKU
2. Category
3. Description
4. Unit price
5. Initial stock
6. Nutritional information
7. Allergens`
}

Guide me through each field with validation.`,
        },
      ];

    case "bulk-stock-update":
      return [
        {
          role: "user",
          content: `I need to update stock levels for multiple products. Source: ${args.source}.

Help me:
1. List current stock levels using get_stock_summary
2. For each product update, use update_stock tool
3. Generate a summary of all changes

I'll provide the product codes and quantities. Validate each update and track:
- Previous stock level
- New stock level
- Change amount
- Reason: ${args.source}`,
        },
      ];

    case "order-creation":
      return [
        {
          role: "user",
          content: `Create a new order for customer ${args.customer_id}.

Steps:
1. First, let me know what products they want to order
2. For each product, I'll verify:
   - Product availability using get_paint_product_details
   - Current stock using get_stock_summary
3. Calculate totals including any applicable discounts
4. Create the order using create_order tool

Guide me through product selection with:
- Product code validation
- Stock availability check
- Price confirmation
- Order total preview`,
        },
      ];

    default:
      logger.warn({ promptName }, "Unknown prompt requested");
      return [
        {
          role: "user",
          content: `Unknown prompt: ${promptName}. Please use one of the available prompts.`,
        },
      ];
  }
}
