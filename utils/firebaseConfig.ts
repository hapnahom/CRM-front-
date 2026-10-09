import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

export const firebaseConfig: Record<string, string> = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID as string,
  appId: process.env.NEXT_PUBLIC_APP_ID as string,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');
// Recommended Microsoft scopes to ensure stable idToken and email access
microsoftProvider.setCustomParameters({ prompt: 'select_account' });
microsoftProvider.addScope('openid');
microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');
