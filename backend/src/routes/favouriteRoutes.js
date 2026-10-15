import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import * as favouriteController from "../controllers/favouriteController.js";

const router = Router();

router.use(requireAuth);

router.get("/", favouriteController.list);
router.get("/:githubRepoId", favouriteController.check);
router.post("/", favouriteController.save);
router.delete("/:githubRepoId", favouriteController.remove);

export default router;
