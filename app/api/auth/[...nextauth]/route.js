// app/api/auth/[...nextauth]/route.js
// السلوك بالكامل دلوقتي جوه lib/authOptions.js — الملف ده بقى مجرد wiring لـ NextAuth.

import NextAuth from "next-auth";
import { authOptions } from "@/app/lib/authOptions";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
