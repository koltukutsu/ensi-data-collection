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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, FileAudio, MessageSquare, CheckCircle } from 'lucide-react';

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
  const [dailyVoiceDataCollected, setDailyVoiceDataCollected] = useState(0);
  const [dailyVoiceTarget, setDailyVoiceTarget] = useState(10);
  const [wakeWordDetectionsCount, setWakeWordDetectionsCount] = useState(0);
  const [wakeWordReviewCount, setWakeWordReviewCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [totalVoiceDataCollected, setTotalVoiceDataCollected] = useState(0);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupUserSubscription = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        const userId = session.currentUser?.id;
        if (!userId) {
          console.error('No user ID found in session');
          return;
        }

        setUserId(userId);

        // Subscribe to all users to get total voice data
        const allUsersUnsubscribe = await database.subscribe(
          'users',
          (users: CurrentUser[]) => {
            const total = users.reduce(
              (sum, user) => sum + (user.dailyActionsCompleted || 0),
              0
            );
            setTotalVoiceDataCollected(total);
          }
        );

        // Subscribe to current user
        unsubscribe = await database.subscribe(
          'users',
          (users: CurrentUser[]) => {
            const user = users[0];
            if (user) {
              setDailyVoiceDataCollected(user.dailyActionsCompleted || 0);
              setDailyVoiceTarget(user.dailyActionsTarget || 10);
            }
          },
          where('id', '==', userId)
        );

        // Subscribe to wake word detections
        const wakeDetectionsUnsubscribe = await ensiHomeDb.subscribe(
          'wake_detections',
          (detections: WakeDetection[]) => {
            setWakeWordDetectionsCount(detections.length);
            const reviewedCount = detections.filter((d) => d.labeled).length;
            setWakeWordReviewCount(reviewedCount);
          }
        );

        return () => {
          if (unsubscribe) unsubscribe();
          if (wakeDetectionsUnsubscribe) wakeDetectionsUnsubscribe();
          if (allUsersUnsubscribe) allUsersUnsubscribe();
        };
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

  const remainingVoiceData = dailyVoiceTarget - dailyVoiceDataCollected;
  const progressPercentage = (dailyVoiceDataCollected / dailyVoiceTarget) * 100;
  const wakeWordReviewPercentage =
    wakeWordDetectionsCount > 0
      ? (wakeWordReviewCount / wakeWordDetectionsCount) * 100
      : 0;

  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center justify-start gap-4 px-4 py-6 sm:gap-8 sm:px-6">
      <Tabs
        defaultValue="voice-data"
        className="w-full max-w-[90vw] sm:max-w-2xl"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="voice-data" className="flex items-center gap-2">
            <FileAudio className="h-4 w-4" />
            Voice Data
          </TabsTrigger>
          <TabsTrigger value="wake-words" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Wake Words
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voice-data">
          <Card className="w-full">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl">
                Daily Voice Data Collection
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <span className="text-xs font-medium sm:text-sm">
                    {remainingVoiceData} voice samples remaining today
                  </span>
                  <span className="text-xs text-muted-foreground sm:text-sm">
                    {dailyVoiceDataCollected}/{dailyVoiceTarget}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Together, all users have contributed {totalVoiceDataCollected}{' '}
                  voice samples for LLM improvements! Join the effort!
                </div>
              </div>
              <Button
                size="lg"
                className="mt-6 w-full"
                onClick={() => router.push('/dashboard/voice-data-action')}
              >
                Contribute Voice Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wake-words">
          <Card className="w-full">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl">
                Wake Word Detections
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Total Detections
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {wakeWordDetectionsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Reviewed</span>
                    <span className="text-sm text-muted-foreground">
                      {wakeWordReviewCount} / {wakeWordDetectionsCount}
                    </span>
                  </div>
                  <Progress value={wakeWordReviewPercentage} className="h-2" />
                </div>
              </div>
              <Button
                size="lg"
                className="mt-6 w-full"
                onClick={() => router.push('/dashboard/wake-detection')}
              >
                Review Wake Word Detections
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
