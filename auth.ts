import NextAuth, { DefaultSession } from 'next-auth';
import authConfig from './auth.config';
import { database } from '@/lib/firebase/data-collection/database';
import { CurrentUser } from './types/models/user';
import { createHash } from 'crypto';

// Extend the built-in session type to include currentUser
declare module 'next-auth' {
  interface Session {
    currentUser?: CurrentUser;
  }
}

export const { auth, handlers, signOut, signIn } = NextAuth({
  ...authConfig,
  callbacks: {
    async session({ session }) {
      const id = createHash('sha256')
        .update(session.user?.email! + session.user?.name!)
        .digest('hex');

      const dbUser = await database.getOne<CurrentUser>('users', id);

      return {
        ...session,
        currentUser: dbUser || null
      };
    }
  },
  events: {
    async signIn({ user }) {
      try {
        const id = createHash('sha256')
          .update(user.email! + user.name!)
          .digest('hex');

        const existingUser = await database.getOne('users', id);

        if (!existingUser) {
          const newUser: CurrentUser = {
            id: id,
            admin: false,
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dailyActionsCompleted: 0,
            dailyActionsTarget: 10,
            wakeWordReviewCount: 0
          };
          await database.createWithId('users', id, newUser);
        }
      } catch (error) {
        console.error('Error handling user sign in:', error);
      }
    }
  }
});

// https://datacollection.solace.com.tr/api/auth/callback/github
