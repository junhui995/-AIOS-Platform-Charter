import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticate } from '@aios/data-service';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'AIOS Account',
      credentials: {
        login: { label: '工号 / 邮箱', type: 'text', placeholder: 'EMP-000' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null;
        const employee = await authenticate(credentials.login, credentials.password);
        if (!employee) return null;
        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = (user as { role?: string | null }).role ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string | null }).role = (token.role as string | null) ?? null;
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
};

export const nextAuthHandler = NextAuth(authOptions);
export type SessionWithId = { user: { id: string; role: string | null } | null };