'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase/data-collection/database';
import { useEffect, useState } from 'react';
import { auth } from '@/auth';
import { database as ensiHomeDb } from '@/lib/firebase/ensi-home/database';
import { where } from 'firebase/firestore';
import { CurrentUser } from '@/types/models/user';
import { toast } from 'sonner';
import { createHash } from 'crypto';

interface WakeDetection {
  document_id: string;
  channels: number;
  filename: string;
  sample_rate: number;
  sample_width: number;
  source: string;
  storage_path: string;
  timestamp: string;
  wake_word: string;
  wake_word_id: string;
  labeled?: boolean;
}

export default function PanelView() {
  const router = useRouter();
  const [dailyActionsCompleted, setDailyActionsCompleted] = useState(0);
  const [dailyActionsTarget, setDailyActionsTarget] = useState(10);
  const [userId, setUserId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupUserSubscription = async () => {
      try {
        console.log('setupUserSubscription');
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        console.log('Setup user subscription - session: ', session);
        const userId = createHash('sha256')
          .update(session.user.email! + session.user.name!)
          .digest('hex');
        console.log('Setup user subscription - userId: ', userId);
        if (!userId) {
          toast.error('Session expired', {
            description: 'Please sign in again'
          });
          // router.push('/');
          return;
        }

        setUserId(userId);

        unsubscribe = await database.subscribe(
          'users',
          (users: CurrentUser[]) => {
            const user = users[0];
            if (user) {
              setDailyActionsCompleted(user.dailyActionsCompleted || 0);
              setDailyActionsTarget(user.dailyActionsTarget || 10);
            }
          },
          where('id', '==', userId)
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

  // const handleUpdateLabeled = async () => {
  //   setIsUpdating(true);
  //   try {
  //     const docs = await ensiHomeDb.getAll<WakeDetection>('wake_detections');
  //     console.log('wake detections docs: ', docs);
  //     const updatePromises = docs.map((doc) => {
  //       console.log('update wake detection labeled: ', doc.document_id);
  //       return ensiHomeDb.set('wake_detections_labeled', doc.document_id, {
  //         channels: doc.channels,
  //         filename: doc.filename,
  //         sample_rate: doc.sample_rate,
  //         sample_width: doc.sample_width,
  //         source: doc.source,
  //         storage_path: doc.storage_path,
  //         timestamp: doc.timestamp,
  //         wake_word: doc.wake_word,
  //         wake_word_id: doc.wake_word_id,
  //         labeled: false
  //       });
  //     });
  //     await Promise.all(updatePromises);
  //     toast.success('Successfully updated all documents as unlabeled');
  //   } catch (error) {
  //     console.error('Error updating documents:', error);
  //     toast.error('Failed to update documents');
  //   } finally {
  //     setIsUpdating(false);
  //   }
  // };

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
      {/* <Button
        variant="outline"
        size="lg"
        className="h-12 w-full max-w-[90vw] sm:w-64"
        onClick={handleUpdateLabeled}
        disabled={isUpdating}
      >
        {isUpdating ? 'Updating...' : 'Mark All as Unlabeled'}
      </Button> */}
    </div>
  );
}
