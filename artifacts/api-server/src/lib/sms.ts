import { logger } from "./logger";

interface BeemSMSPayload {
  source_addr: string;
  encoding: number;
  schedule_time: string;
  message: string;
  recipients: { recipient_id: number; dest_addr: string }[];
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const apiKey = process.env.BEEM_API_KEY;
  const secretKey = process.env.BEEM_SECRET_KEY;
  const senderName = process.env.BEEM_SENDER_NAME || "TAARIFAID";

  if (!apiKey || !secretKey) {
    logger.warn("Beem SMS credentials not configured — skipping SMS");
    return false;
  }

  const payload: BeemSMSPayload = {
    source_addr: senderName,
    encoding: 0,
    schedule_time: "",
    message,
    recipients: [{ recipient_id: 1, dest_addr: to }],
  };

  try {
    const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
    const response = await fetch("https://apigw.beemafrica.com/v2/sms/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as { code: number };
    return data.code === 100;
  } catch (err) {
    logger.error({ err }, "SMS send failed");
    return false;
  }
}

export function generateOTP(): { code: string; expiry: Date } {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);
  return { code, expiry };
}

export async function sendOTPSMS(mobile: string, otp: string): Promise<boolean> {
  return sendSMS(mobile, `TAARIFA_ID: Your verification code is ${otp}. Valid for 10 minutes. Do not share this code.`);
}

export async function sendWelcomeSMS(mobile: string, name: string, profileId: string): Promise<boolean> {
  const appUrl = process.env.APP_URL || "https://taarifa-id.repl.co";
  return sendSMS(mobile, `Welcome to TAARIFA_ID, ${name}! Your Profile ID is: ${profileId}. Login at ${appUrl}`);
}
