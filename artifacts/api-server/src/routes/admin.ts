import { Router } from "express";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import User from "../models/User.js";
import { generateProfileId, formatTZPhone } from "../lib/utils.js";
import { sendSMS, generateOTP, sendOTPSMS, sendWelcomeSMS } from "../lib/sms.js";

// @ts-ignore
function _generateOTP() { return generateOTP(); }

const router = Router();
router.use(requireAuth);

// GET /api/admin/sub-accounts
router.get("/sub-accounts", async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const subAccounts = await User.find({ parentAdminId: req.user!.id }).select("-password -otpCode -resetToken");
    res.json(subAccounts);
  } catch (err) {
    req.log?.error({ err }, "Get sub-accounts failed");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/sub-accounts — create sub-account
router.post("/sub-accounts", async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const data = req.body as {
      firstName: string; lastName: string; mobile: string; email: string; username: string;
    };

    const exists = await User.findOne({
      $or: [{ username: data.username?.toLowerCase() }, { email: data.email?.toLowerCase() }, { mobile: data.mobile }],
    });
    if (exists) { res.status(409).json({ error: "Username, email or mobile already exists" }); return; }

    const profileId = generateProfileId();
    const { code: otpCode, expiry: otpExpiry } = _generateOTP();
    const tempPassword = await bcrypt.hash("temp_" + otpCode, 10);

    const admin = await User.findById(req.user!.id);
    const subUser = await User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      mobile: data.mobile,
      email: data.email.toLowerCase(),
      username: data.username.toLowerCase(),
      password: tempPassword,
      birthdate: new Date("2000-01-01"),
      gender: "Male",
      accountType: "Individual",
      role: "user",
      nationality: "Tanzanian",
      profileId,
      parentAdminId: req.user!.id,
      isFirstLogin: true,
      otpCode,
      otpExpiry,
    });

    await sendOTPSMS(formatTZPhone(data.mobile), otpCode);
    const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
    await sendWelcomeSMS(formatTZPhone(data.mobile), name, profileId);

    res.status(201).json({ message: "Sub-account created", profileId, subUser });
  } catch (err) {
    req.log?.error({ err }, "Create sub-account failed");
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/admin/sub-accounts — lock/unlock or reset password
router.patch("/sub-accounts", async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const { userId, action } = req.body as { userId: string; action: "lock" | "unlock" | "reset-password" };

    const user = await User.findOne({ _id: userId, parentAdminId: req.user!.id });
    if (!user) { res.status(404).json({ error: "Sub-account not found" }); return; }

    if (action === "lock") { user.isActive = false; await user.save(); res.json({ message: "Account locked" }); return; }
    if (action === "unlock") { user.isActive = true; await user.save(); res.json({ message: "Account unlocked" }); return; }
    if (action === "reset-password") {
      const { code: otpCode, expiry: otpExpiry } = _generateOTP();
      user.otpCode = otpCode;
      user.otpExpiry = otpExpiry;
      user.isFirstLogin = true;
      await user.save();
      await sendOTPSMS(formatTZPhone(user.mobile), otpCode);
      res.json({ message: "Password reset code sent" });
      return;
    }
    res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    req.log?.error({ err }, "Sub-account action failed");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/sms — send SMS to sub-accounts
router.post("/sms", async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const { message, targetUserId } = req.body as { message: string; targetUserId?: string };

    if (targetUserId) {
      const user = await User.findOne({ _id: targetUserId, parentAdminId: req.user!.id });
      if (!user) { res.status(404).json({ error: "Sub-account not found" }); return; }
      await sendSMS(formatTZPhone(user.mobile), message);
    } else {
      const subAccounts = await User.find({ parentAdminId: req.user!.id });
      await Promise.all(subAccounts.map((u) => sendSMS(formatTZPhone(u.mobile), message)));
    }
    res.json({ message: "SMS sent" });
  } catch (err) {
    req.log?.error({ err }, "SMS send failed");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/move-account
router.post("/move-account", async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const { newAdminUsername } = req.body as { newAdminUsername?: string };

    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (!newAdminUsername) {
      user.parentAdminId = undefined;
      user.accountType = "Individual";
      user.role = "individual";
      await user.save();
      res.json({ message: "Account moved to Individual" });
      return;
    }

    const admin = await User.findOne({ username: newAdminUsername.toLowerCase() });
    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }

    user.parentAdminId = admin._id as unknown as typeof user.parentAdminId;
    await user.save();
    res.json({ message: "Account moved successfully" });
  } catch (err) {
    req.log?.error({ err }, "Move account failed");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
