'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { database } from '@/lib/firebase/data-collection/database';
import { useEffect, useState } from 'react';
import { Mic, FileAudio } from 'lucide-react';
import { DataTable } from './data-table';
import { columns } from './columns';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';

interface UserStats {
  id: string;
  name: string;
  email: string;
  dailyActionsCompleted: number;
  totalActionsCompleted: number;
  lastContribution?: string;
}

interface WakeWordStats {
  id: string;
  name: string;
  email: string;
  allowedCount: number;
  rejectedCount: number;
  totalReviewed: number;
  lastReview?: string;
}

export default function LeaderBoardView() {
  const [voiceDataUsers, setVoiceDataUsers] = useState<UserStats[]>([]);
  const [wakeWordUsers, setWakeWordUsers] = useState<WakeWordStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users and their voice data contributions
        const usersSnapshot = await database.getAll('users');
        const voiceUsers = usersSnapshot.map((user: any) => ({
          id: user.id,
          name: user.name || 'Anonymous User',
          email: user.email || 'N/A',
          dailyActionsCompleted: user.dailyActionsCompleted || 0,
          totalActionsCompleted: user.totalActionsCompleted || 0,
          lastContribution: user.lastContributionDate || 'Never'
        }));

        // Fetch wake word detection contributions
        const wakeDetectionsSnapshot = await database.getAll(
          'wake_detections_labeled'
        );

        // Group wake word detections by user
        const wakeWordStats = new Map<string, WakeWordStats>();

        wakeDetectionsSnapshot.forEach((detection: any) => {
          if (!detection.user_id) return;

          const stats = wakeWordStats.get(detection.user_id) || {
            id: detection.user_id,
            name: 'Anonymous User',
            email: 'N/A',
            allowedCount: 0,
            rejectedCount: 0,
            totalReviewed: 0,
            lastReview: detection.timestamp
          };

          if (detection.labeled === 'allowed') {
            stats.allowedCount++;
          } else if (detection.labeled === 'rejected') {
            stats.rejectedCount++;
          }
          stats.totalReviewed++;

          // Update last review time if more recent
          if (!stats.lastReview || detection.timestamp > stats.lastReview) {
            stats.lastReview = detection.timestamp;
          }

          wakeWordStats.set(detection.user_id, stats);
        });

        // Match user details with wake word stats
        usersSnapshot.forEach((user: any) => {
          const stats = wakeWordStats.get(user.id);
          if (stats) {
            stats.name = user.name || 'Anonymous User';
            stats.email = user.email || 'N/A';
          }
        });

        setVoiceDataUsers(
          voiceUsers.sort(
            (a, b) => b.totalActionsCompleted - a.totalActionsCompleted
          )
        );
        setWakeWordUsers(
          Array.from(wakeWordStats.values()).sort(
            (a, b) => b.totalReviewed - a.totalReviewed
          )
        );
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <PageContainer>
      <div className="space-y-4">
        <Heading
          title="Leaderboard"
          description="Track user contributions across different tasks"
        />

        <Tabs defaultValue="voice-data" className="space-y-4">
          <TabsList>
            <TabsTrigger value="voice-data" className="flex items-center gap-2">
              <FileAudio className="h-4 w-4" />
              Voice Data Collection
            </TabsTrigger>
            <TabsTrigger value="wake-words" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Wake Word Reviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voice-data">
            <Card>
              <CardHeader>
                <CardTitle>Voice Data Contributors</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns.voiceData}
                  data={voiceDataUsers}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wake-words">
            <Card>
              <CardHeader>
                <CardTitle>Wake Word Reviewers</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns.wakeWord}
                  data={wakeWordUsers}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
