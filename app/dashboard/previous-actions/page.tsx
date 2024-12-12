'use client';
import * as React from 'react';
import { database as dataCollectionDb } from '@/lib/firebase/data-collection/database';
import { Task, WakeDetectionSubmission } from '@/constants/data';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Clock,
  Mic,
  MessageSquare,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cloudStorage as dataCollectionStorage } from '@/lib/firebase/data-collection/cloud-storage';
import { Progress } from '@/components/ui/progress';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { appDataCollection } from '@/lib/firebase/config';
import { Label } from '@/components/ui/label';
import { PlayIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
interface CombinedTask extends Task {
  type: 'voice';
}

interface CombinedWakeWord extends WakeDetectionSubmission {
  type: 'wake-word';
}

interface PendingChange {
  taskId: string;
  newLabel: 'allowed' | 'rejected';
}

export default function PreviousActionsPage() {
  const router = useRouter();
  const [voiceTasks, setVoiceTasks] = React.useState<CombinedTask[]>([]);
  const [wakeWordTasks, setWakeWordTasks] = React.useState<CombinedWakeWord[]>(
    []
  );
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = React.useState<PendingChange[]>(
    []
  );
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(
    null
  );
  const [audioState, setAudioState] = React.useState({
    isPlaying: false,
    taskId: '',
    currentTime: 0,
    duration: 0,
    audioUrl: '' as string | null
  });
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        console.log('Setup user subscription - session: ', session);
        const userId = session.currentUser?.id;

        if (!userId) {
          toast.error('Session expired', {
            description: 'Please sign in again'
          });
          return;
        }
        setUserId(userId);

        // Fetch voice tasks
        const voiceTasksData = await dataCollectionDb.query<Task>(
          'saved/responses/leaf_instruction_prompts',
          'user_id' as keyof Task,
          '==',
          userId
        );
        console.log('voiceTasksData: ', voiceTasksData);
        const combinedVoiceTasks = voiceTasksData.map((task) => ({
          ...task,
          type: 'voice' as const
        }));

        // Fetch wake word tasks
        const wakeWordTasksData =
          await dataCollectionDb.query<WakeDetectionSubmission>(
            'wake_detections_labeled',
            'user_id',
            '==',
            userId
          );
        const combinedWakeWordTasks = wakeWordTasksData.map((task) => ({
          ...task,
          type: 'wake-word' as const
        }));

        // Sort tasks by creation date
        setVoiceTasks(
          combinedVoiceTasks.sort(
            (a, b) => b.created_at.getTime() - a.created_at.getTime()
          )
        );
        setWakeWordTasks(
          combinedWakeWordTasks.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        );
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast.error('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchAllTasks();
  }, []);

  const handleLabelChange = (
    taskId: string,
    currentLabel: 'allowed' | 'rejected'
  ) => {
    const newLabel = currentLabel === 'allowed' ? 'rejected' : 'allowed';

    // Check if there's already a pending change for this task
    const existingChangeIndex = pendingChanges.findIndex(
      (change) => change.taskId === taskId
    );

    if (existingChangeIndex !== -1) {
      // Remove the pending change if the new label matches the original
      const originalTask = wakeWordTasks.find(
        (task) => task.wake_word_id === taskId
      );
      if (originalTask?.labeled === newLabel) {
        setPendingChanges((prev) =>
          prev.filter((change) => change.taskId !== taskId)
        );
      } else {
        // Update the existing pending change
        setPendingChanges((prev) =>
          prev.map((change) =>
            change.taskId === taskId ? { ...change, newLabel } : change
          )
        );
      }
    } else {
      // Add new pending change
      setPendingChanges((prev) => [...prev, { taskId, newLabel }]);
    }
  };

  const handleSubmitChange = async (taskId: string) => {
    const change = pendingChanges.find((c) => c.taskId === taskId);
    const task = wakeWordTasks.find((t) => t.wake_word_id === taskId);

    if (!change || !task) return;

    try {
      setUpdatingTaskId(taskId);

      // Get the audio file from the current storage path
      const response = await fetch(task.storage_path);
      const audioBlob = await response.blob();

      // Create new storage path
      const newPath = `wake_detection/${change.newLabel}/${task.wake_word_id}.wav`;

      // Upload to new location
      await dataCollectionStorage.upload(
        newPath,
        new File([audioBlob], `${task.wake_word_id}.wav`)
      );

      // Update the database record
      const updatedTask = {
        ...task,
        labeled: change.newLabel,
        storage_path: `gs://ensi-data-collection.firebasestorage.app/${newPath}`
      };

      await dataCollectionDb.update(
        'wake_detections_labeled',
        task.wake_word_id,
        updatedTask
      );

      // Remove old file if path is different
      if (task.storage_path !== updatedTask.storage_path) {
        await dataCollectionStorage.delete(task.storage_path);
      }

      // Update local state
      setWakeWordTasks((prev) =>
        prev.map((t) =>
          t.wake_word_id === taskId ? { ...t, labeled: change.newLabel } : t
        )
      );
      setPendingChanges((prev) => prev.filter((c) => c.taskId !== taskId));

      toast.success('Label updated successfully');
    } catch (error) {
      console.error('Error updating label:', error);
      toast.error('Failed to update label');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getHttpUrl = async (gsUrl: string) => {
    try {
      // Extract the path from gs:// URL
      const path = gsUrl.replace(
        'gs://ensi-data-collection.firebasestorage.app/',
        ''
      );
      const storage = getStorage(appDataCollection);
      const audioRef = ref(storage, path);
      const httpUrl = await getDownloadURL(audioRef);
      return httpUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  };

  const handlePlayAudio = async (task: CombinedWakeWord) => {
    try {
      if (audioState.taskId === task.wake_word_id && audioState.isPlaying) {
        // Stop current audio
        audioRef.current?.pause();
        setAudioState((prev) => ({ ...prev, isPlaying: false }));
        return;
      }

      // Get HTTP URL from storage path
      const httpUrl = await getHttpUrl(task.storage_path);

      setAudioState({
        isPlaying: true,
        currentTime: 0,
        duration: 0,
        audioUrl: httpUrl,
        taskId: task.wake_word_id
      });

      if (audioRef.current) {
        audioRef.current.src = httpUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
      setAudioState((prev) => ({ ...prev, isPlaying: false }));
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  const WakeWordTaskCard = (task: CombinedWakeWord) => {
    const pendingChange = pendingChanges.find(
      (c) => c.taskId === task.wake_word_id
    );
    const currentLabel = pendingChange?.newLabel || task.labeled;
    const hasChanges = pendingChange !== undefined;
    const isUpdating = updatingTaskId === task.wake_word_id;
    const isCurrentlyPlaying =
      audioState.isPlaying && audioState.taskId === task.wake_word_id;

    return (
      <Card className="mb-4 w-full">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col space-y-2">
            {/* Mobile Header */}
            <div className="flex flex-col gap-2 sm:hidden">
              <CardTitle className="break-all text-sm font-medium">
                ID: {task.wake_word_id}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    currentLabel === 'allowed' ? 'success' : 'destructive'
                  }
                >
                  {currentLabel === 'allowed' ? 'Allowed' : 'Rejected'}
                </Badge>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden sm:flex sm:items-center sm:justify-between">
              <CardTitle className="text-lg">ID: {task.wake_word_id}</CardTitle>
              <Badge
                variant={currentLabel === 'allowed' ? 'success' : 'destructive'}
              >
                {currentLabel === 'allowed' ? 'Allowed' : 'Rejected'}
              </Badge>
            </div>

            <CardDescription className="text-xs sm:text-sm">
              Created: {new Date(task.timestamp).toLocaleDateString()}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Metadata Section */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Source</Label>
                <p className="text-muted-foreground">{task.source || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Language</Label>
                <p className="text-muted-foreground">TR</p>
              </div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col gap-2">
              {/* Audio Controls */}
              <div className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlayAudio(task)}
                  className="w-full border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200 sm:w-auto"
                >
                  {isCurrentlyPlaying ? (
                    <>
                      <VolumeX className="mr-2 h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="mr-2 h-4 w-4" />
                      Play
                    </>
                  )}
                </Button>
              </div>

              {/* Decision Buttons */}
              <div className="flex w-full gap-2">
                <Button
                  variant={currentLabel === 'allowed' ? 'success' : 'outline'}
                  size="sm"
                  onClick={() =>
                    handleLabelChange(task.wake_word_id, 'rejected')
                  }
                  disabled={isUpdating || currentLabel === 'allowed'}
                  className="flex-1"
                >
                  Allow
                </Button>
                <Button
                  variant={
                    currentLabel === 'rejected' ? 'destructive' : 'outline'
                  }
                  size="sm"
                  onClick={() =>
                    handleLabelChange(task.wake_word_id, 'allowed')
                  }
                  disabled={isUpdating || currentLabel === 'rejected'}
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>
            </div>

            {/* Audio Progress */}
            {isCurrentlyPlaying && (
              <div className="space-y-2">
                <div className="flex justify-end text-xs text-muted-foreground sm:text-sm">
                  {formatTime(audioState.currentTime)} /{' '}
                  {formatTime(audioState.duration)}
                </div>
                <Progress
                  value={(audioState.currentTime / audioState.duration) * 100}
                  className="h-1"
                />
              </div>
            )}
          </div>
        </CardContent>

        {hasChanges && (
          <CardFooter className="p-4 sm:p-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 sm:w-auto"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Save Change
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Label Change</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to change this wake word review from
                    &quot;
                    {task.labeled}&quot; to &quot;{pendingChange?.newLabel}
                    &quot;?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleSubmitChange(task.wake_word_id)}
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        )}
      </Card>
    );
  };

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

  if (!voiceTasks.length && !wakeWordTasks.length) {
    return (
      <Card className="mx-auto mt-4 w-full max-w-[90vw] sm:max-w-3xl">
        <CardContent className="flex flex-col items-center gap-6 p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Previous Actions</AlertTitle>
            <AlertDescription>
              You haven&apos;t completed any tasks yet. Start contributing by
              completing some tasks!
            </AlertDescription>
          </Alert>
          <div className="flex gap-4">
            <Button onClick={() => router.push('/dashboard/voice-tasks')}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Go to Voice Tasks
            </Button>
            <Button onClick={() => router.push('/dashboard/wake-word')}>
              <Mic className="mr-2 h-4 w-4" />
              Go to Wake Word Reviews
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-4 w-full max-w-[90vw] sm:max-w-3xl">
      <CardHeader className="flex flex-col space-y-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:p-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold sm:text-2xl">
            Previous Actions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review your completed tasks and responses
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Voice Tasks: {voiceTasks.length}</Badge>
          <Badge variant="secondary">Wake Words: {wakeWordTasks.length}</Badge>
        </div>
      </CardHeader>
      <Separator />

      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="mx-6 my-2">
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Voice Tasks
          </TabsTrigger>
          <TabsTrigger value="wake-word" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Wake Word Reviews
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-16rem)]">
          <TabsContent value="voice" className="m-0">
            <CardContent className="p-6">
              {voiceTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Voice Tasks Completed</AlertTitle>
                    <AlertDescription>
                      You haven&apos;t completed any voice tasks yet.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => router.push('/dashboard/voice-tasks')}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Go to Voice Tasks
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {voiceTasks.map((task) => (
                    <Card
                      key={task.document_id}
                      className="border-2 border-muted"
                    >
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
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="wake-word" className="m-0">
            <CardContent className="p-6">
              {wakeWordTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Wake Word Reviews Completed</AlertTitle>
                    <AlertDescription>
                      You haven&apos;t completed any wake word reviews yet.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => router.push('/dashboard/wake-word')}>
                    <Mic className="mr-2 h-4 w-4" />
                    Go to Wake Word Reviews
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {wakeWordTasks.map((task) => WakeWordTaskCard(task))}
                </div>
              )}
            </CardContent>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setAudioState((prev) => ({
              ...prev,
              currentTime: audioRef.current?.currentTime || 0
            }));
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setAudioState((prev) => ({
              ...prev,
              duration: audioRef.current?.duration || 0
            }));
          }
        }}
        onEnded={() => {
          setAudioState((prev) => ({
            ...prev,
            isPlaying: false,
            currentTime: 0
          }));
        }}
      />
    </Card>
  );
}
