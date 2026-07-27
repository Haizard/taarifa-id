import { Router } from "express";
import { connectDB } from "../lib/db.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";
import User from "../models/User.js";
import { getAnnualExpiry } from "../lib/utils.js";

const router = Router();
router.use(requireAuth, requireRole("system_admin"));

// GET /api/system-admin/users
router.get("/users", async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const { search, page = "1", limit = "20" } = req.query as {
      search?: string; page?: string; limit?: string;
    };

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { profileId: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).select("-password -otpCode -resetToken").skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    req.log?.error({ err }, "Get users failed");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/system-admin/activate
router.post("/activate", async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const { userId, paidAmount } = req.body as { userId: string; paidAmount: number };

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isAccountActive: true,
        paidAmount,
        paidDate: new Date(),
        expireDate: getAnnualExpiry(),
      },
      { new: true }
    ).select("-password");

    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ message: "Account activated", user });
  } catch (err) {
    req.log?.error({ err }, "Activate account failed");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
