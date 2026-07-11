import dotenv from "dotenv";
dotenv.config();

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import app from "./app";
import { connectDB } from "./config/db";
import http from "http";
import { initSocket } from "./utils/socket";

const PORT = process.env.PORT || 8080;

// Create HTTP server wrapping express app
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect DB then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});