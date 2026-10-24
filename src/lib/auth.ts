import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z
    .string()
    .min(1)
    .max(72)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

export async function authorizeCredentials(
  credentials: unknown,
  clientIp = "unknown",
) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const email = parsed.data.email.trim().toLowerCase();
  const rateLimit = await consumeRateLimit({
    scope: "login",
    identifier: `${email}:${clientIp}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) return null;

  const user = await getPrisma().user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
      isActive: true,
    },
  });
  if (!user?.passwordHash || !user.isActive) return null;

  const validPassword = await compare(parsed.data.password, user.passwordHash);
  if (!validPassword) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  };
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Correo electrónico", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials, request) {
      const clientIp =
        request.headers?.["x-real-ip"] ??
        request.headers?.["x-forwarded-for"]?.split(",").at(-1)?.trim() ??
        "unknown";
      return authorizeCredentials(credentials, clientIp);
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
    async signIn({ user }) {
      if (!user.id) return false;
      const currentUser = await getPrisma().user.findUnique({
        where: { id: user.id },
        select: { isActive: true },
      });
      return Boolean(currentUser?.isActive);
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        delete token.authVersion;
      }
      if (!token.userId) return token;

      const currentUser = await getPrisma().user.findUnique({
        where: { id: token.userId },
        select: {
          id: true,
          name: true,
          email: true,
          authVersion: true,
          role: true,
          isActive: true,
        },
      });
      if (
        !currentUser ||
        !currentUser.isActive ||
        (!user && token.authVersion === undefined) ||
        (token.authVersion !== undefined &&
          token.authVersion !== currentUser.authVersion)
      ) {
        delete token.userId;
        delete token.authVersion;
        delete token.name;
        delete token.email;
        delete token.role;
        return token;
      }

      token.userId = currentUser.id;
      token.authVersion = currentUser.authVersion;
      token.name = currentUser.name;
      token.email = currentUser.email;
      token.role = currentUser.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? "";
        session.user.role = token.role ?? "USER";
        if (!token.userId) {
          session.user.name = null;
          session.user.email = null;
          session.user.role = "USER";
        }
      }
      return session;
    },
  },
};
