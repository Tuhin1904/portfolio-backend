import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { connectDB } from "./config/db";
import { initSocket } from "./socket";

const PORT = process.env.PORT || 8080;

// Connect DB then start server
connectDB().then(() => {
  const httpServer = http.createServer(app);

  // Attach Socket.IO to the HTTP server
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.IO ready on ws://localhost:${PORT}`);
  });
});