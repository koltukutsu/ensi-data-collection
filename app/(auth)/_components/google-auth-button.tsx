'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

export default function GoogleSignInButton() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const handleSignIn = async () => {
    try {
      await signIn('firebase', {
        provider: 'google',
        callbackUrl: callbackUrl ?? '/dashboard'
      });
    } catch (error) {
      toast.error('Failed to sign in with Google', {
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
      <Icons.google className="mr-2 h-4 w-4" />
      Continue with Google
    </Button>
  );
}
