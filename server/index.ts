import express from "express";
import { registerRoutes } from "./routes";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Simple logging function
function log(message: string) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${message}`);
}

const app = express();
app.use(express.json());

// Basic logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Add basic root route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Discord Crypto Analytics Bot Server',
    timestamp: new Date().toISOString()
  });
});

(async () => {
  // Debug: Check if environment variables are loaded
  console.log("DISCORD_TOKEN available:", !!process.env.DISCORD_TOKEN);
  console.log("Environment variables found:", Object.keys(process.env).filter(key => 
    key === 'DISCORD_TOKEN' || key === 'GUILD_ID').length > 0 ? 'Yes' : 'No');
  console.log("NODE_ENV:", process.env.NODE_ENV);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`Discord bot server started on port ${port}`);
  });
})();