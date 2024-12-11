// import type { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';
// import { FirebaseError } from 'firebase/app';
// import {
//   signInWithPopup,
//   GoogleAuthProvider,
//   GithubAuthProvider
// } from 'firebase/auth';
// import { auth } from './authentication';

// interface Credentials {
//   provider: 'google' | 'github';
// }

// export function FirebaseProvider<
//   P extends Record<string, any> = any
// >(): OAuthConfig<P> & {
//   authorize: (credentials: Credentials) => Promise<any>;
// } {
//   return {
//     id: 'firebase',
//     name: 'Firebase',
//     type: 'oauth',
//     issuer: 'https://<your-firebase-project-id>.firebaseapp.com',
//     authorization: {
//       url: 'https://<your-firebase-project-id>.firebaseapp.com/__/auth/handler',
//       params: { grant_type: 'authorization_code' }
//     },
//     async authorize(credentials: Credentials) {
//       try {
//         let provider;
//         switch (credentials?.provider) {
//           case 'google':
//             provider = new GoogleAuthProvider();
//             break;
//           case 'github':
//             console.log('AAAAAAAAAA');
//             provider = new GithubAuthProvider();
//             break;
//           default:
//             throw new Error('Invalid provider');
//         }

//         const result = await signInWithPopup(auth, provider);
//         const user = result.user;

//         return {
//           id: user.uid,
//           email: user.email,
//           name: user.displayName,
//           image: user.photoURL
//         };
//       } catch (error) {
//         if (error instanceof FirebaseError) {
//           throw new Error(error.message);
//         }
//         throw error;
//       }
//     }
//   };
// }
