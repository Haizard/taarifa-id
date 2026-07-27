import { Router } from "express";
import { connectDB } from "../lib/db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import { isExpired } from "../lib/utils.js";

const router = Router();

// GET /api/profile — current user's profile
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const profile = await Profile.findOne({ profileId: req.user!.profileId });
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
    res.json(profile);
  } catch (err) {
    req.log?.error({ err }, "Get profile failed");
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/profile — update current user's profile
router.put("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const READONLY = ["_id", "userId", "profileId", "accountType", "createdAt"];
    const update = { ...req.body };
    for (const field of READONLY) delete update[field];

    const profile = await Profile.findOneAndUpdate(
      { profileId: req.user!.profileId },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
    res.json(profile);
  } catch (err) {
    req.log?.error({ err }, "Update profile failed");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/profile/:profileId — public profile lookup
router.get("/:profileId", async (req, res) => {
  try {
    await connectDB();
    const { profileId } = req.params;
    const user = await User.findOne({ profileId });
    if (!user) { res.status(404).json({ error: "Profile not found" }); return; }

    if (user.expireDate && isExpired(user.expireDate)) {
      res.status(410).json({ error: "Profile expired", expired: true, profileId });
      return;
    }

    const profile = await Profile.findOne({ profileId });
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    // Return only public-safe fields
    const data = profile.toObject();
    res.json(data);
  } catch (err) {
    req.log?.error({ err }, "Public profile fetch failed");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
