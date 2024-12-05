'use client';
import * as React from 'react';
import { database } from '@/lib/firebase/database';
import { Task } from '@/constants/data';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import router from 'next/router';

export default function PreviousActionsPage() {
  const [previousTasks, setPreviousTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPreviousTasks = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        console.log('user session: ', session);
        if (!session?.user?.id) {
          toast.error('Session expired', {
            description: 'Please sign in again'
          });
          // router.push('/');
          return;
        }

        const tasks = await database.getAll<Task>('responses');
        // Sort tasks by creation date, most recent first
        const sortedTasks = tasks.sort(
          (a, b) => b.created_at.getTime() - a.created_at.getTime()
        );
        setPreviousTasks(sortedTasks);
      } catch (error) {
        console.error('Error fetching previous tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreviousTasks();
  }, []);

  if (loading) {
    return (
      <Card className="mx-auto h-[calc(100vh-2rem)] w-full max-w-[90vw] sm:max-w-3xl">
        <CardContent className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!previousTasks.length) {
    return (
      <Card className="mx-auto mt-4 w-full max-w-[90vw] sm:max-w-3xl">
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Previous Actions</AlertTitle>
            <AlertDescription>
              You haven&apos;t completed any tasks yet. Complete some tasks to
              see them here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-4 w-full max-w-[90vw] sm:max-w-3xl">
      <CardHeader className="p-6">
        <CardTitle className="text-2xl font-bold">Previous Actions</CardTitle>
      </CardHeader>
      <Separator />

      <ScrollArea className="h-[calc(100vh-12rem)]">
        <CardContent className="p-6">
          <div className="space-y-6">
            {previousTasks.map((task, index) => (
              <Card key={task.document_id} className="border-2 border-muted">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="px-2 py-1">
                        Task #{task.leaf_id}
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" />
                        {new Date(task.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <Alert variant="default" className="bg-primary/5">
                      <AlertTitle className="text-base font-semibold">
                        Instruction
                      </AlertTitle>
                      <AlertDescription className="mt-2 text-sm">
                        {task.instruction_prompt}
                      </AlertDescription>
                    </Alert>

                    <div className="mt-2">
                      <h4 className="mb-2 font-medium">Context Paths:</h4>
                      <div className="flex flex-wrap gap-2">
                        {task.leaf_path_list.map((path, pathIndex) => (
                          <Badge
                            key={pathIndex}
                            variant="outline"
                            className="bg-background/50"
                          >
                            {path}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
