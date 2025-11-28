import { getMongoDBClient } from "../../database/mongodb-client.js";
import { GetColorFormulaInputSchema } from "../../types.js";
import pino from "pino";

const logger = pino(
  { name: "paint-formulas-tool" },
  pino.destination({ dest: 2, sync: false })
);

export const getColorFormulaTool = {
  name: "get_color_formula",
  description:
    "Get the detailed mixing formula for a specific paint color, including pigment percentages and mixing instructions.",
  inputSchema: {
    type: "object",
    properties: {
      color_name: {
        type: "string",
        description: "Color name to get the formula for",
      },
    },
    required: ["color_name"],
  },
  handler: async (args: unknown) => {
    try {
      const input = GetColorFormulaInputSchema.parse(args);
      const mongoClient = getMongoDBClient();
      const db = mongoClient.getDb();

      const formulas = await db
        .collection("color_formulas")
        .find({ color_name: { $regex: input.color_name, $options: "i" } })
        .toArray();

      if (formulas.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `No color formula found for "${input.color_name}"`,
                  suggestions:
                    "Try searching for a different color name or check available products.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      logger.info(
        { color_name: input.color_name, count: formulas.length },
        "Retrieved color formulas"
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                color_name: input.color_name,
                formulas_found: formulas.length,
                formulas: formulas.map((f) => ({
                  id: f._id.toString(),
                  formula_code: f.formula_code,
                  color_name: f.color_name,
                  base_type: f.base_type,
                  pigments: f.pigments,
                  mixing_instructions: f.mixing_instructions,
                  created_at: f.created_at,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error({ error }, "Error retrieving color formula");
      throw error;
    }
  },
};
