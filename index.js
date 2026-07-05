import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const server = new Server(
  {
    name: "give-me-hands",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_command",
        description: "Execute a command in the terminal securely.",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The command to run.",
            },
          },
          required: ["command"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "execute_command") {
    const { command } = request.params.arguments;
    
    try {
      // Basic security: avoid common dangerous commands or implement a whitelist
      const forbidden = [";", "&&", "||", "|", ">", "<", "`", "$"];
      if (forbidden.some(char => command.includes(char))) {
        throw new Error("Command contains restricted characters.");
      }

      const { stdout, stderr } = await execAsync(command);
      return {
        content: [
          {
            type: "text",
            text: stdout || stderr || "Command executed with no output.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Secure Terminal MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
