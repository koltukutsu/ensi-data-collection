import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { database } from '@/lib/firebase/database';
import { CurrentUser } from './types/models/user';

export const { auth, handlers, signOut, signIn } = NextAuth({
  ...authConfig,
  events: {
    async signIn({ user }) {
      try {
        // Check if user has an ID
        if (!user.id) {
          console.error('No user ID found');
          return;
        }
        console.log('User ID:', user.id);
        // Check if user exists in Firebase
        const existingUser = await database.getOne('users', user.id);

        if (!existingUser) {
          // Create new user if doesn't exist
          const newUser: CurrentUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dailyActionsCompleted: 0,
            dailyActionsTarget: 10
          };
          await database.create('users', newUser);
        }
      } catch (error) {
        console.error('Error handling user sign in:', error);
        // Don't throw error to prevent blocking sign in
      }
    }
  }
});
