import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z
    .string()
    .min(1)
    .max(72)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Correo electrónico", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const email = parsed.data.email.trim().toLowerCase();
      const user = await getPrisma().user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const validPassword = await compare(parsed.data.password, user.passwordHash);
      if (!validPassword) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const googleSignInEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET must be configured in production.");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(getPrisma()),
  secret: process.env.AUTH_SECRET,
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/account" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
};
