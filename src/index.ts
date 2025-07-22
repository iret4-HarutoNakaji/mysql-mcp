#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Debug: Log environment variable loading
console.error("Environment variables loaded:");
console.error("DB_HOST:", process.env.DB_HOST || "(not set)");
console.error("DB_PORT:", process.env.DB_PORT || "(not set)");
console.error("DB_USER:", process.env.DB_USER || "(not set)");
console.error("DB_PASSWORD:", process.env.DB_PASSWORD ? "***" : "(not set)");
console.error("DB_NAME:", process.env.DB_NAME || "(not set)");
console.error("Working directory:", process.cwd());

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "",
};

// Security configuration
const securityConfig = {
  allowDDL: process.env.ALLOW_DDL === "true",
  allowDML: process.env.ALLOW_DML === "true",
  maxRows: parseInt(process.env.MAX_ROWS || "1000"),
  allowDrop: process.env.ALLOW_DROP === "true",
  allowCreate: process.env.ALLOW_CREATE === "true",
  allowAlter: process.env.ALLOW_ALTER === "true",
  allowInsert: process.env.ALLOW_INSERT === "true",
  allowUpdate: process.env.ALLOW_UPDATE === "true",
  allowDelete: process.env.ALLOW_DELETE === "true",
  allowTruncate: process.env.ALLOW_TRUNCATE === "true",
};

let connection: mysql.Connection | null = null;

// Security validation functions
function isDangerousQuery(query: string): { isDangerous: boolean; reason: string } {
  const normalizedQuery = query.trim().toUpperCase();
  
  // DDL operations
  if (normalizedQuery.startsWith('DROP ') && !securityConfig.allowDrop) {
    return { isDangerous: true, reason: 'DROP operations are not allowed' };
  }
  
  if (normalizedQuery.startsWith('CREATE ') && !securityConfig.allowCreate) {
    return { isDangerous: true, reason: 'CREATE operations are not allowed' };
  }
  
  if (normalizedQuery.startsWith('ALTER ') && !securityConfig.allowAlter) {
    return { isDangerous: true, reason: 'ALTER operations are not allowed' };
  }
  
  if (normalizedQuery.startsWith('TRUNCATE ') && !securityConfig.allowTruncate) {
    return { isDangerous: true, reason: 'TRUNCATE operations are not allowed' };
  }
  
  // INSERT operations
  if (normalizedQuery.startsWith('INSERT ') && !securityConfig.allowInsert) {
    return { isDangerous: true, reason: 'INSERT operations are not allowed (ALLOW_INSERT=false)' };
  }
  
  // DELETE operations
  if (normalizedQuery.startsWith('DELETE ') && !securityConfig.allowDelete) {
    return { isDangerous: true, reason: 'DELETE operations are not allowed (ALLOW_DELETE=false)' };
  }
  
  // UPDATE operations (require both ALLOW_UPDATE and WHERE clause)
  if (normalizedQuery.startsWith('UPDATE ')) {
    if (!securityConfig.allowUpdate) {
      return { isDangerous: true, reason: 'UPDATE operations are not allowed (ALLOW_UPDATE=false)' };
    }
    if (!normalizedQuery.includes('WHERE ')) {
      return { isDangerous: true, reason: 'UPDATE without WHERE clause is not allowed' };
    }
  }
  
  // System operations
  if (normalizedQuery.includes('SHUTDOWN') || 
      normalizedQuery.includes('KILL ') || 
      normalizedQuery.includes('STOP SLAVE') ||
      normalizedQuery.includes('RESET MASTER')) {
    return { isDangerous: true, reason: 'System operations are not allowed' };
  }
  
  // Grant/Revoke operations
  if (normalizedQuery.startsWith('GRANT ') || normalizedQuery.startsWith('REVOKE ')) {
    return { isDangerous: true, reason: 'Privilege operations are not allowed' };
  }
  
  return { isDangerous: false, reason: '' };
}

function validateQueryLimits(query: string): { isValid: boolean; reason: string } {
  const normalizedQuery = query.trim().toUpperCase();
  
  // Check for LIMIT clause
  if (normalizedQuery.includes('SELECT ') && !normalizedQuery.includes('LIMIT ')) {
    return { isValid: false, reason: 'SELECT queries must include LIMIT clause' };
  }
  
  // Check LIMIT value
  const limitMatch = normalizedQuery.match(/LIMIT\s+(\d+)/);
  if (limitMatch) {
    const limitValue = parseInt(limitMatch[1]);
    if (limitValue > securityConfig.maxRows) {
      return { isValid: false, reason: `LIMIT value exceeds maximum allowed (${securityConfig.maxRows})` };
    }
  }
  
  return { isValid: true, reason: '' };
}

// Initialize MySQL connection
async function connectToDatabase() {
  if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
    console.error("Database configuration is incomplete. Running in demo mode.");
    return;
  }
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.error("Connected to MySQL database");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    console.error("Running in demo mode without database connection");
  }
}

// サーバーインスタンスの作成
const server = new Server(
  {
    name: "mysql-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツールリストの定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "mysql_query",
        description: "Execute SQL queries on MySQL database (SELECT, INSERT, UPDATE, DELETE)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL query to execute",
            },
            params: {
              type: "array",
              description: "Parameters for prepared statement (optional)",
              items: { type: "string" },
            },
          },
          required: ["query"],
        },
      },
      {
        name: "mysql_describe_table",
        description: "Get table structure and schema information",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name to describe",
            },
          },
          required: ["table"],
        },
      },
      {
        name: "mysql_list_tables",
        description: "List all tables in the database",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "mysql_explain",
        description: "Get query execution plan using EXPLAIN",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Query to analyze with EXPLAIN",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// ツール実行ハンドラー
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!connection) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Database connection not established. Please configure DB_USER, DB_PASSWORD, and DB_NAME environment variables.",
        },
      ],
    };
  }

  try {
    switch (name) {
      case "mysql_query": {
        const { query, params = [] } = args as { query: string; params?: any[] };
        
        // Security validation
        const dangerCheck = isDangerousQuery(query);
        if (dangerCheck.isDangerous) {
          return {
            content: [
              {
                type: "text",
                text: `Security Error: ${dangerCheck.reason}`,
              },
            ],
          };
        }
        
        const limitCheck = validateQueryLimits(query);
        if (!limitCheck.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `Security Error: ${limitCheck.reason}`,
              },
            ],
          };
        }
        
        const [results] = await connection.execute(query, params);
        
        return {
          content: [
            {
              type: "text",
              text: `Query executed successfully:\n${JSON.stringify(results, null, 2)}`,
            },
          ],
        };
      }

      case "mysql_describe_table": {
        const { table } = args as { table: string };
        const [results] = await connection.execute("DESCRIBE ??", [table]);
        
        return {
          content: [
            {
              type: "text",
              text: `Table structure for ${table}:\n${JSON.stringify(results, null, 2)}`,
            },
          ],
        };
      }

      case "mysql_list_tables": {
        const [results] = await connection.execute("SHOW TABLES");
        
        return {
          content: [
            {
              type: "text",
              text: `Tables in database:\n${JSON.stringify(results, null, 2)}`,
            },
          ],
        };
      }

      case "mysql_explain": {
        const { query } = args as { query: string };
        const [results] = await connection.execute(`EXPLAIN ${query}`);
        
        return {
          content: [
            {
              type: "text",
              text: `Query execution plan:\n${JSON.stringify(results, null, 2)}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

// サーバーの起動
async function main() {
  try {
    await connectToDatabase();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MySQL MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// グレースフルシャットダウン
process.on("SIGINT", async () => {
  if (connection) {
    await connection.end();
    console.error("Database connection closed");
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (connection) {
    await connection.end();
    console.error("Database connection closed");
  }
  process.exit(0);
});

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});