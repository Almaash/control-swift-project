import { Router } from "express";
import * as githubController from "../controllers/githubController.js";

const router = Router();

router.get("/search", githubController.search);

export default router;
