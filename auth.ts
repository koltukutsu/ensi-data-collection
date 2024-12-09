import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { database } from '@/lib/firebase/database';
import { CurrentUser } from './types/models/user';
import { createHash } from 'crypto';

export const { auth, handlers, signOut, signIn } = NextAuth({
  ...authConfig,
  events: {
    async signIn({ user }) {
      try {
        // using the user email and name, generate a unique id,
        // use a hashing function to generate the id
        const id = createHash('sha256')
          .update(user.email! + user.name!)
          .digest('hex');
        console.log('id given', id);
        const existingUser = await database.getOne('users', id);

        if (!existingUser) {
          // Create new user if doesn't exist
          const newUser: CurrentUser = {
            id: id,
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dailyActionsCompleted: 0,
            dailyActionsTarget: 10
          };
          await database.createWithId('users', id, newUser);
        }
      } catch (error) {
        console.error('Error handling user sign in:', error);
        // Don't throw error to prevent blocking sign in
      }
    }
  }
});

// https://datacollection.solace.com.tr/api/auth/callback/github
