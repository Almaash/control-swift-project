import { Router } from "express";
import * as repositoryController from "../controllers/repositoryController.js";

const router = Router();

router.get("/:owner/:repo", repositoryController.getRepository);

export default router;
