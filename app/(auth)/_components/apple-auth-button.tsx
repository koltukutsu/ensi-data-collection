'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { signInWithApple } from '@/lib/firebase/authentication';
import { toast } from 'sonner';

export default function AppleSignInButton() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const handleSignIn = async () => {
    try {
      await signInWithApple();
      // After successful Firebase authentication, redirect to callback URL or dashboard
      window.location.href = callbackUrl ?? '/dashboard';
    } catch (error) {
      toast.error('Failed to sign in with Apple', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    }
  };

  return (
    <Button
      className="w-full"
      variant="outline"
      type="button"
      onClick={handleSignIn}
    >
      <Icons.apple className="mr-2 h-4 w-4" />
      Continue with Apple
    </Button>
  );
}
