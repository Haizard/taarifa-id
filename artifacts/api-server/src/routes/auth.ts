import { Router } from "express";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db.js";
import { signToken } from "../lib/jwt.js";
import { generateProfileId, formatTZPhone } from "../lib/utils.js";
import { generateOTP, sendOTPSMS, sendWelcomeSMS } from "../lib/sms.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    await connectDB();
    const { username, password, otpCode } = req.body as {
      username: string; password: string; otpCode?: string;
    };

    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }

    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() },
        { mobile: username },
      ],
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // First login via OTP
    if (user.isFirstLogin) {
      if (!otpCode) {
        res.status(401).json({ error: "OTP required for first login", requiresOTP: true });
        return;
      }
      if (!user.otpCode || !user.otpExpiry || user.otpCode !== otpCode || user.otpExpiry < new Date()) {
        res.status(401).json({ error: "Invalid or expired OTP code" });
        return;
      }
      user.isFirstLogin = false;
      user.otpCode = undefined;
      user.otpExpiry = undefined;
      await user.save();
    } else {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
    }

    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const token = signToken({
      id: (user._id as string).toString(),
      name,
      role: user.role,
      profileId: user.profileId,
      accountType: user.accountType,
      isAccountActive: user.isAccountActive,
      isFirstLogin: user.isFirstLogin,
    });

    res.json({
      token,
      user: {
        id: (user._id as string).toString(),
        name,
        role: user.role,
        profileId: user.profileId,
        accountType: user.accountType,
        isAccountActive: user.isAccountActive,
      },
    });
  } catch (err) {
    req.log?.error({ err }, "Login failed");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    await connectDB();
    const data = req.body as {
      firstName: string; middleName?: string; lastName: string;
      birthdate: string; gender: "Male" | "Female";
      mobile: string; email: string; username: string; password: string;
      accountType: string; nationality: "Tanzanian" | "Foreigner";
      nidaNumber?: string; passportNumber?: string;
    };

    // Check uniqueness
    const exists = await User.findOne({
      $or: [
        { username: data.username.toLowerCase() },
        { email: data.email.toLowerCase() },
        { mobile: data.mobile },
      ],
    });
    if (exists) {
      res.status(409).json({ message: "Username, email or mobile already registered" });
      return;
    }

    const hashed = await bcrypt.hash(data.password, 12);
    const profileId = generateProfileId();
    const { code: otpCode, expiry: otpExpiry } = generateOTP();

    const user = await User.create({
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      birthdate: new Date(data.birthdate),
      gender: data.gender,
      mobile: data.mobile,
      email: data.email.toLowerCase(),
      username: data.username.toLowerCase(),
      password: hashed,
      accountType: data.accountType,
      nationality: data.nationality,
      nidaNumber: data.nidaNumber,
      passportNumber: data.passportNumber,
      profileId,
      isFirstLogin: true,
      otpCode,
      otpExpiry,
      role: "individual",
    });

    await Profile.create({
      userId: user._id,
      profileId,
      accountType: data.accountType,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      gender: data.gender,
      birthdate: new Date(data.birthdate),
      nationality: data.nationality,
      nidaNumber: data.nidaNumber,
      passportNumber: data.passportNumber,
    });

    const formattedMobile = formatTZPhone(data.mobile);
    const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
    await sendOTPSMS(formattedMobile, otpCode);
    await sendWelcomeSMS(formattedMobile, name, profileId);

    res.status(201).json({ message: "Account created successfully", profileId });
  } catch (err) {
    req.log?.error({ err }, "Registration failed");
    res.status(500).json({ message: "Registration failed" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string; newPassword: string;
    };

    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    req.log?.error({ err }, "Change password failed");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    await connectDB();
    const { identifier } = req.body as { identifier: string };

    const user = await User.findOne({
      $or: [{ mobile: identifier }, { email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const { code: resetToken, expiry: resetTokenExpiry } = generateOTP();
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    await sendOTPSMS(formatTZPhone(user.mobile), resetToken);
    res.json({ message: "Reset code sent to your mobile number" });
  } catch (err) {
    req.log?.error({ err }, "Forgot password failed");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    await connectDB();
    const { identifier, token, newPassword } = req.body as {
      identifier: string; token: string; newPassword: string;
    };

    const user = await User.findOne({
      $or: [{ mobile: identifier }, { email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
    });
    if (!user || user.resetToken !== token || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    req.log?.error({ err }, "Reset password failed");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
