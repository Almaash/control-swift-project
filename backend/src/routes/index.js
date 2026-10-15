import { Router } from "express";
import authRoutes from "./authRoutes.js";
import githubRoutes from "./githubRoutes.js";
import repositoryRoutes from "./repositoryRoutes.js";
import favouriteRoutes from "./favouriteRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/github-analytics", githubRoutes);
router.use("/repositories", repositoryRoutes);
router.use("/favourites", favouriteRoutes);

export default router;
