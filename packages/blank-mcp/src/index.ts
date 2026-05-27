import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Blank } from "blank-api";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as readline from "node:readline/promises";

// ── Tool Definitions ──
const PublishPostSchema = z.object({
  title: z.string().describe("The title of the post (max 255 chars)"),
  content: z.string().describe("The main content of the post in standard Markdown format."),
  author: z.string().optional().describe("The name of the author (optional)"),
});

const EditPostSchema = z.object({
  slug: z.string().describe("The slug of the post to edit"),
  editToken: z.string().describe("The secret edit_token returned when the post was originally created"),
  title: z.string().optional().describe("The new title of the post"),
  content: z.string().optional().describe("The new content in standard Markdown format"),
});

const GetPostSchema = z.object({
  slug: z.string().describe("The slug of the post to retrieve"),
});

async function runInstaller() {
  console.log("🚀 Welcome to the Blank MCP 1-Line Installer!");
  console.log("This will automatically configure Claude Desktop to use the Blank API.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const token = await rl.question("\n🔑 Please paste your BLANK_API_TOKEN (starts with blk_): ");
  rl.close();

  if (!token.startsWith("blk_")) {
    console.error("❌ Invalid token. Tokens must start with 'blk_'.");
    process.exit(1);
  }

  // Determine Claude config path
  let configPath = "";
  if (process.platform === "win32") {
    configPath = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Claude", "claude_desktop_config.json");
  } else if (process.platform === "darwin") {
    configPath = path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  } else {
    console.error("❌ Auto-install is currently only supported on Windows and macOS for Claude Desktop.");
    console.log("Please configure manually using the README instructions.");
    process.exit(1);
  }

  // Read or create config
  let config: any = { mcpServers: {} };
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(raw);
      if (!config.mcpServers) config.mcpServers = {};
    } catch (e) {
      console.error(`❌ Failed to parse existing config at ${configPath}. Is it valid JSON?`);
      process.exit(1);
    }
  }

  // Inject MCP Server
  config.mcpServers["blank"] = {
    command: "npx",
    args: ["-y", "blank-mcp"],
    env: {
      BLANK_API_TOKEN: token.trim(),
    },
  };

  // Ensure directory exists
  fs.mkdirSync(path.dirname(configPath), { recursive: true });

  // Save
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n✅ Successfully added Blank MCP server to Claude Desktop!`);
  console.log(`File updated: ${configPath}`);
  console.log(`\n🔄 IMPORTANT: Please restart Claude Desktop completely for the changes to take effect.`);
}

async function startServer() {
  const BLANK_API_TOKEN = process.env.BLANK_API_TOKEN;

  if (!BLANK_API_TOKEN) {
    console.error("FATAL: BLANK_API_TOKEN environment variable is required.");
    process.exit(1);
  }

  const blank = new Blank(BLANK_API_TOKEN, { baseUrl: 'https://blank.o3dn.info' });

  const server = new Server(
    {
      name: "blank-mcp-server",
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
          name: "publish_post",
          description: "Publish a new, beautifully formatted webpage instantly using the Blank Publishing API. Provide standard Markdown for the content.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              author: { type: "string" },
            },
            required: ["title", "content"],
          },
        },
        {
          name: "edit_post",
          description: "Edit an existing Blank post. You must provide the unique slug and the editToken that was returned when you created it.",
          inputSchema: {
            type: "object",
            properties: {
              slug: { type: "string" },
              editToken: { type: "string" },
              title: { type: "string" },
              content: { type: "string" },
            },
            required: ["slug", "editToken"],
          },
        },
        {
          name: "get_post",
          description: "Fetch the contents and metadata of an existing Blank post by its slug.",
          inputSchema: {
            type: "object",
            properties: {
              slug: { type: "string" },
            },
            required: ["slug"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      switch (request.params.name) {
        case "publish_post": {
          const { title, content, author } = PublishPostSchema.parse(request.params.arguments);
          const htmlContent = Blank.markdownToHtml(content);
          const post = await blank.createPost({
            title,
            content: htmlContent,
            author,
            source: "mcp-agent"
          });
          return {
            content: [
              {
                type: "text",
                text: `Successfully published to Blank!\nURL: ${post.url}\nSlug: ${post.slug}\nEdit Token: ${post.edit_token}\n\nIMPORTANT: Save the edit token if you plan on modifying this post later.`,
              },
            ],
          };
        }
        case "edit_post": {
          const { slug, editToken, title, content } = EditPostSchema.parse(request.params.arguments);
          const updateData: any = { editToken };
          if (title) updateData.title = title;
          if (content) updateData.content = Blank.markdownToHtml(content);
          const post = await blank.editPost(slug, updateData);
          return {
            content: [
              {
                type: "text",
                text: `Successfully edited post!\nURL: ${post.url}\nLast Updated: ${post.updated_at}`,
              },
            ],
          };
        }
        case "get_post": {
          const { slug } = GetPostSchema.parse(request.params.arguments);
          const post = await blank.getPost(slug);
          return {
            content: [
              {
                type: "text",
                text: `Post Data:\nTitle: ${post.title}\nAuthor: ${post.author || 'N/A'}\nURL: ${post.url}\n\nContent (HTML):\n${post.content}`,
              },
            ],
          };
        }
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing tool: ${error.message}\n${error.data ? JSON.stringify(error.data, null, 2) : ''}`,
          },
        ],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Blank MCP Server running on stdio");
}

// ── Entry Point ──
if (process.argv.includes("install")) {
  runInstaller().catch((err) => {
    console.error("Installation failed:", err);
    process.exit(1);
  });
} else {
  startServer().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
