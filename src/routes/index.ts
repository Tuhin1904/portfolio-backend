import { Router } from "express";
import guestRoutes from "./guest.routes";
import getQueries from "./getQueries.routes"

const router = Router();

// group all routes here
router.use("/guests", guestRoutes);
router.use("/queries", getQueries);

export default router;