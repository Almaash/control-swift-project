import { Router } from "express";
import rateLimit from "express-rate-limit";
import requireAuth from "../middleware/auth.js";
import * as authController from "../controllers/authController.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
// router.get("/me", requireAuth, authController.me);
router.post("/logout", authController.logout);

export default router;
