import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";
import { sendSMS } from "@/lib/sms/beem";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const adminId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role !== "admin") {
    return NextResponse.json({ message: "Only admin accounts can send SMS" }, { status: 403 });
  }

  try {
    const { message, recipients } = await req.json();
    // recipients: "all" | string[] of user IDs

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ message: "Message cannot be empty" }, { status: 400 });
    }
    if (message.length > 480) {
      return NextResponse.json({ message: "Message too long (max 480 characters)" }, { status: 400 });
    }

    await connectDB();

    let users: { mobile: string; firstName: string }[];

    if (recipients === "all") {
      users = await User.find({ parentAdminId: adminId, isActive: true })
        .select("mobile firstName")
        .lean();
    } else if (Array.isArray(recipients) && recipients.length > 0) {
      users = await User.find({ _id: { $in: recipients }, parentAdminId: adminId })
        .select("mobile firstName")
        .lean();
    } else {
      return NextResponse.json({ message: "No recipients specified" }, { status: 400 });
    }

    if (users.length === 0) {
      return NextResponse.json({ message: "No active sub-accounts found" }, { status: 404 });
    }

    // Send SMS to each recipient
    const results = await Promise.allSettled(
      users.map((u) =>
        sendSMS(u.mobile, `[TAARIFA_ID]: ${message}`)
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      message: `SMS sent to ${sent} member${sent !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}.`,
      sent,
      failed,
      total: users.length,
    });
  } catch (error) {
    console.error("Send SMS error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
