// lib/authOptions.js
// إعدادات NextAuth. متعزولة في ملف مستقل عشان أي API route تانية (زي /api/admin/users)
// تقدر تستخدم getServerSession(authOptions) بدون ما تستورد route handler.

import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase();

function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        nameOrEmail: { label: "Name or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.nameOrEmail || !credentials?.password) return null;

        try {
          await connectToMongo();
          const AuthModel = getAuthModel();

          const identifier = credentials.nameOrEmail.toLowerCase().trim();

          // ملحوظة: مش .lean() هنا عن قصد — محتاجين نقدر نعمل .save()
          // لو لقينا حساب قديم بباسورد plain text عشان نشفّره فورًا (self-healing migration).
          const users = await AuthModel.find({});
          const userDoc = users.find(
            (u) =>
              u.name?.toLowerCase().trim() === identifier ||
              u.email?.toLowerCase().trim() === identifier
          );

          if (!userDoc) return null;

          const storedPassword = userDoc.password || "";
          let valid = false;

          if (isBcryptHash(storedPassword)) {
            valid = await bcrypt.compare(credentials.password, storedPassword);
          } else {
            // حساب قديم متسجل قبل التحديث بباسورد plain text.
            // نتحقق مرة واحدة بالمقارنة المباشرة، ولو صح نرفّعه لهاش فورًا
            // عشان من اللحظة دي يبقى محمي زي أي حساب جديد.
            valid = storedPassword === credentials.password;
            if (valid) {
              userDoc.password = await bcrypt.hash(credentials.password, 12);
              await userDoc.save();
            }
          }

          if (!valid) return null;

          const role =
            userDoc.role ||
            (userDoc.email?.toLowerCase() === ADMIN_EMAIL ? "admin" : "student");

          return {
            id: userDoc._id?.toString(),
            name: userDoc.name || null,
            email: userDoc.email || null,
            phone: userDoc.phone || null,
            address: userDoc.address || null,
            paymentMethod: userDoc.paymentMethod || "cash",
            role,
          };
        } catch (error) {
          console.error("Auth Error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,

  pages: {
    signIn: "/",
    error: "/",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.phone = user.phone;
        token.address = user.address;
        token.paymentMethod = user.paymentMethod;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.phone = token.phone;
        session.user.address = token.address;
        session.user.paymentMethod = token.paymentMethod;
        session.user.role = token.role;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },

  debug: process.env.NODE_ENV === "development",
};
