import express from "express";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
} from "../middleware/validators/auth.validators.js";
import { register, login } from "../controllers/auth.controllers.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

export default router;
