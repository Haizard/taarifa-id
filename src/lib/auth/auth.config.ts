import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        otpCode: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({
          $or: [
            { username: credentials.username },
            { email: credentials.username },
            { mobile: credentials.username },
          ],
        }).select("+password");

        if (!user || !user.isActive) return null;

        // First login: use OTP
        if (user.isFirstLogin) {
          if (!credentials.otpCode) return null;
          if (
            user.otpCode !== credentials.otpCode ||
            !user.otpExpiry ||
            user.otpExpiry < new Date()
          ) {
            return null;
          }
          // Clear OTP and mark first login done
          user.otpCode = undefined;
          user.otpExpiry = undefined;
          user.isFirstLogin = false;
          await user.save();
        } else {
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          if (!isValid) return null;
        }

        return {
          id: user._id.toString(),
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          username: user.username,
          role: user.role,
          accountType: user.accountType,
          profileId: user.profileId,
          isAccountActive: user.isAccountActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.accountType = (user as any).accountType;
        token.profileId = (user as any).profileId;
        token.isAccountActive = (user as any).isAccountActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).accountType = token.accountType;
        (session.user as any).profileId = token.profileId;
        (session.user as any).isAccountActive = token.isAccountActive;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
};
