'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase/database';
import { useEffect, useState } from 'react';
import { auth } from '@/auth';
import { where } from 'firebase/firestore';
import { CurrentUser } from '@/types/models/user';
import { toast } from 'sonner';
import { createHash } from 'crypto';

export default function PanelView() {
  const router = useRouter();
  const [dailyActionsCompleted, setDailyActionsCompleted] = useState(0);
  const [dailyActionsTarget, setDailyActionsTarget] = useState(10);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupUserSubscription = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        if (!session?.user?.id) {
          toast.error('Session expired', {
            description: 'Please sign in again'
          });
          // router.push('/');
          return;
        }
        const id = createHash('sha256')
          .update(session.user.email! + session.user.name!)
          .digest('hex');

        setUserId(id);

        unsubscribe = await database.subscribe(
          'users',
          (users: CurrentUser[]) => {
            const user = users[0];
            if (user) {
              setDailyActionsCompleted(user.dailyActionsCompleted || 0);
              setDailyActionsTarget(user.dailyActionsTarget || 10);
            }
          },
          where('id', '==', id)
        );
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };

    setupUserSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (!router) return null;

  const remainingActions = dailyActionsTarget - dailyActionsCompleted;
  const progressPercentage = (dailyActionsCompleted / dailyActionsTarget) * 100;

  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center justify-center gap-4 px-4 py-6 sm:gap-8 sm:px-6">
      <Card className="w-full max-w-[90vw] sm:max-w-md">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl">Daily Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <span className="text-xs font-medium sm:text-sm">
                {remainingActions} actions remaining today
              </span>
              <span className="text-xs text-muted-foreground sm:text-sm">
                {dailyActionsCompleted}/{dailyActionsTarget}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>
      <Button
        size="lg"
        className="h-16 w-full max-w-[90vw] text-xl sm:h-24 sm:w-64 sm:text-2xl"
        onClick={() => router.push('/dashboard/action')}
      >
        Start
      </Button>
    </div>
  );
}
