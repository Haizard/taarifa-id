/**
 * Beem Africa SMS integration for Tanzania
 * Docs: https://apidocs.beemafrica.com
 */

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
    console.warn("Beem SMS credentials not configured");
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

    const data = await response.json();
    return data.code === 100;
  } catch (error) {
    console.error("SMS send failed:", error);
    return false;
  }
}

export function generateOTP(): { code: string; expiry: Date } {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { code, expiry };
}

export async function sendOTPSMS(mobile: string, otp: string): Promise<boolean> {
  const message = `TAARIFA_ID: Your verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;
  return sendSMS(mobile, message);
}

export async function sendWelcomeSMS(mobile: string, name: string, profileId: string): Promise<boolean> {
  const message = `Welcome to TAARIFA_ID, ${name}! Your Profile ID is: ${profileId}. Login at ${process.env.NEXT_PUBLIC_APP_URL}`;
  return sendSMS(mobile, message);
}

export async function sendExpiryReminderSMS(mobile: string, name: string, expireDate: string): Promise<boolean> {
  const message = `TAARIFA_ID: Dear ${name}, your profile expires on ${expireDate}. Please renew to keep your QR code active.`;
  return sendSMS(mobile, message);
}
