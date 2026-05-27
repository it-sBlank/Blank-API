import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Blank } from "blank-api";

// Initialize the core Blank SDK instance (relies on env variable)
const BLANK_API_TOKEN = process.env.BLANK_API_TOKEN;

if (!BLANK_API_TOKEN) {
  console.error("FATAL: BLANK_API_TOKEN environment variable is required.");
  process.exit(1);
}

// We use the live production URL
const blank = new Blank(BLANK_API_TOKEN, { baseUrl: 'https://blank.o3dn.info' });

// Initialize MCP Server
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

// ── Register Tools ──
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

// ── Handle Tool Execution ──
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "publish_post": {
        const { title, content, author } = PublishPostSchema.parse(request.params.arguments);
        
        // Convert Markdown from the AI into HTML for Blank API
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

// ── Start Server ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Blank MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
