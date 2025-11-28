// Ollama API URL - using native /api/chat endpoint
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:latest";

// MCP Server URL - will call MCP tools via HTTP proxy
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://mcp-server:8080";

export const maxDuration = 30;

// Fetch available MCP tools from server
async function getMCPTools() {
  const response = await fetch(`${MCP_SERVER_URL}/tools`);
  return response.json();
}

// Call MCP tool
async function callMCPTool(toolName: string, args: any) {
  const response = await fetch(`${MCP_SERVER_URL}/call-tool`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: toolName, arguments: args }),
  });
  return response.json();
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Get available MCP tools
  const mcpTools = await getMCPTools();

  // Format tools for Ollama (OpenAI function calling format)
  const tools =
    mcpTools.tools?.map((tool: any) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    })) || [];

  // Call Ollama with tools
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      tools, // Pass MCP tools to Ollama
      stream: true,
    }),
  });

  // Stream the response back to client with tool call handling
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Parse Ollama's streaming JSON responses
          const text = new TextDecoder().decode(value);
          const lines = text.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const json = JSON.parse(line);

              // Handle tool calls from Ollama
              if (json.message?.tool_calls) {
                for (const toolCall of json.message.tool_calls) {
                  const toolName = toolCall.function.name;
                  const toolArgs = JSON.parse(toolCall.function.arguments);

                  // Call MCP server
                  const toolResult = await callMCPTool(toolName, toolArgs);

                  // Send tool result back in stream
                  const data = `0:${JSON.stringify(
                    `\n[🔧 Tool: ${toolName}]\n${JSON.stringify(
                      toolResult,
                      null,
                      2
                    )}\n\n`
                  )}\n`;
                  controller.enqueue(encoder.encode(data));
                }
              }

              // Handle regular content
              if (json.message?.content) {
                // Send content chunks in SSE format expected by useChat
                const data = `0:${JSON.stringify(json.message.content)}\n`;
                controller.enqueue(encoder.encode(data));
              }

              if (json.done) {
                controller.close();
                return;
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
