import dotenv from "dotenv";
dotenv.config()

import app from "./app";
import { connectDB } from "./config/db";

const PORT = process.env.PORT || 8080;

// Connect DB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});