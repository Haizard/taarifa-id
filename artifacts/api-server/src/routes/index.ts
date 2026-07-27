import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import profileRouter from "./profile.js";
import adminRouter from "./admin.js";
import systemAdminRouter from "./systemAdmin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/admin", adminRouter);
router.use("/system-admin", systemAdminRouter);

export default router;
