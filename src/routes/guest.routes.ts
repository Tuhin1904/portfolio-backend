import { Router } from "express";
import { createGuestQuery } from "../controllers/guest.controller";

const router = Router();

router.post("/query", createGuestQuery);

export default router;