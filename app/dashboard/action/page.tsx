'use client';
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Square, Send, Play, Pause, Loader2, X } from 'lucide-react';
import { database } from '@/lib/firebase/database';
import { cloudStorage } from '@/lib/firebase/cloud-storage';
import { Task } from '@/constants/data';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CurrentUser } from '@/types/models/user';
import { where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileX, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';
import { ResponseData } from '@/types/models/response_data';
import { createHash } from 'crypto';
import { useSession } from 'next-auth/react';

const formSchema = z.object({
  response: z.string().min(1, {
    message: 'Response is required.'
  })
});

// Define the type for responseData

export default function ActionPage() {
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout>();
  const [task, setTask] = React.useState<Task | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [transcriptionDone, setTranscriptionDone] = React.useState(false);
  const router = useRouter();
  const [dailyActionsCompleted, setDailyActionsCompleted] = React.useState(0);
  const [dailyActionsTarget, setDailyActionsTarget] = React.useState(10);
  const [userId, setUserId] = React.useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      response: ''
    }
  });

  // Fetch user data and subscribe to changes
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupUserSubscription = async () => {
      try {
        console.log('setupUserSubscription action page');
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        console.log('Setup user subscription - session: ', session);
        const userId = createHash('sha256')
          .update(session.user.email! + session.user.name!)
          .digest('hex');
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
              setUserId(userId);
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

  // Format time in MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  // Handle audio time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle audio metadata loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      if (!isNaN(audioDuration) && isFinite(audioDuration)) {
        setDuration(audioDuration);
      }
    }
  };

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  // Fetch a random task
  React.useEffect(() => {
    const fetchRandomTask = async () => {
      try {
        const randomTask = await database.takeOneDocumentRandomly<Task>(
          'sources/leaf_instruction_prompts/prompts'
        );
        setTask(randomTask);
      } catch (err) {
        console.error('Failed to fetch random task:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRandomTask();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        await transcribeAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const transcribeAudio = async (blobToTranscribe: Blob | null = null) => {
    const blob = blobToTranscribe || audioBlob;
    if (!blob) return;

    setIsTranscribing(true);
    setTranscriptionDone(false);
    try {
      const formData = new FormData();
      const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
      formData.append('file', file);

      const response = await fetch('/api/auth/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.transcription) {
        form.setValue('response', data.transcription);
        setTranscriptionDone(true);
      }
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/session');
      const session = await response.json();

      const userIdNew = createHash('sha256')
        .update(session.user.email! + session.user.name!)
        .digest('hex');
      console.log('KONTROL USER ID:', userIdNew);
      // Get current user session
      // const response = await fetch('/api/auth/session');
      // const session = await response.json();
      // if (!session?.user?.id) {
      //   toast.error('Session expired', {
      //     description: 'Please sign in again'
      //   });
      //   router.push('/');
      //   return;
      // }
      if (!userIdNew) throw new Error('No user ID found');
      // Prepare the response data
      if (!task) throw new Error('No task found');

      // Upload audio file to Firebase Storage
      let audioFileUrl = null;
      if (audioBlob) {
        const audioFileRef = cloudStorage.generatePath(
          `responses/leaf_instruction_prompts`,
          `${task.document_id}_${userIdNew}_${new Date().getTime()}.webm`
        );
        const audioFile = new File([audioBlob], `${task.document_id}.webm`, {
          type: 'audio/webm'
        });
        await cloudStorage.upload(audioFileRef, audioFile);
        audioFileUrl = await cloudStorage.getUrl(audioFileRef);
      }

      const responseData: ResponseData = {
        audio_file_url: undefined,
        response_text: data.response,
        task_doc_id: task.document_id,
        leaf_id: task.leaf_id,
        leaf_path_list: task.leaf_path_list,
        instruction_prompt: task.instruction_prompt,
        created_at: new Date(),
        user_id: userIdNew
      };

      // Add audio file URL to response data
      if (audioFileUrl) {
        responseData.audio_file_url = audioFileUrl;
      }

      // Submit the response data to Firebase
      await database.create('responses/leaf_instruction_prompts', responseData);

      // Update user's daily actions count
      const newActionsCount = dailyActionsCompleted + 1;
      await database.update('users', userIdNew, {
        dailyActionsCompleted: newActionsCount
      });

      // Show success toast
      toast.success('Instruction submitted successfully!', {
        description: 'You will be redirected to the next task shortly.'
      });

      // Show accomplishment toast if daily target reached
      if (newActionsCount === dailyActionsTarget) {
        toast.success('Congratulations!', {
          description: 'You have completed all your actions for today!'
        });
      }

      // Redirect or refresh after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      toast.error('Something went wrong!', {
        description:
          error instanceof Error
            ? error.message
            : 'Failed to submit instruction'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTranscriptionComplete = async (text: string) => {
    try {
      setIsTranscribing(false);
      setTranscriptionDone(true);
      // Clear any existing text and set the transcribed text
      form.setValue('response', text);
      toast.success('Voice transcription completed');
    } catch (error) {
      console.error('Error handling transcription:', error);
      toast.error('Failed to process transcription');
    }
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

  if (!task) {
    return (
      <Card className="mx-auto h-[calc(100vh-2rem)] w-full max-w-[90vw] sm:max-w-3xl">
        <CardContent className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <FileX className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Task Not Found</h3>
              <p className="text-sm text-muted-foreground">
                The task you&apos;re looking for doesn&apos;t exist or has been
                removed.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto h-[calc(100vh-2rem)] w-full max-w-[90vw] sm:max-w-3xl">
      <CardHeader className="flex flex-col space-y-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:p-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold sm:text-2xl">
            Instruction Response
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete the task by recording or typing your response
          </p>
        </div>
        <Badge
          variant={
            dailyActionsCompleted >= dailyActionsTarget
              ? 'success'
              : 'secondary'
          }
          className="px-4 py-1 text-xs sm:text-sm"
        >
          {dailyActionsCompleted}/{dailyActionsTarget} actions completed
        </Badge>
      </CardHeader>
      <Separator />

      <CardContent className="flex h-[calc(100%-8rem)] flex-col overflow-auto p-0">
        <ScrollArea className="flex-1 px-4 sm:px-6">
          <div className="space-y-6 py-4">
            {/* Task Prompt Section */}
            <Alert
              variant="default"
              className="border-2 border-primary/20 bg-primary/5"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <AlertTitle className="text-lg font-semibold text-primary">
                    Your Task
                  </AlertTitle>
                </div>
                <AlertDescription className="mt-2 text-base leading-relaxed">
                  {task?.instruction_prompt}
                </AlertDescription>

                {/* Compact Context Paths */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-muted-foreground">
                    Context:
                  </span>
                  {task?.leaf_path_list.map((path, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-background/50 py-0 text-xs"
                    >
                      {path}
                    </Badge>
                  ))}
                </div>
              </div>
            </Alert>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="response"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-base">
                          Your Response
                        </FormLabel>
                        <Button
                          type="button"
                          variant={
                            isRecording ? 'destructive' : 'default-tinted'
                          }
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={isTranscribing}
                          className="ml-2"
                        >
                          {isRecording ? (
                            <>
                              <Square className="mr-2 h-4 w-4" />
                              Stop ({recordingDuration}s)
                            </>
                          ) : (
                            <>
                              <Mic className="mr-2 h-4 w-4" />
                              Record Voice
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <FormControl>
                          <div className="relative">
                            <Textarea
                              placeholder={
                                isTranscribing
                                  ? 'Transcribing audio...'
                                  : 'Type your response here...'
                              }
                              className="min-h-[120px] resize-none pr-10 sm:min-h-[180px]"
                              disabled={isTranscribing}
                              {...field}
                            />
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => form.setValue('response', '')}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Clear text</span>
                              </Button>
                            )}
                          </div>
                        </FormControl>

                        <div className="space-y-4">
                          <div className="w-full rounded-lg border p-2">
                            <div className="flex flex-col items-center gap-4 sm:flex-row">
                              {audioUrl && !isTranscribing && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={togglePlayback}
                                  className="w-full sm:w-auto"
                                >
                                  {isPlaying ? (
                                    <>
                                      <Pause className="mr-2 h-4 w-4" />
                                      Pause
                                    </>
                                  ) : (
                                    <>
                                      <Play className="mr-2 h-4 w-4" />
                                      Play
                                    </>
                                  )}
                                </Button>
                              )}
                              {isTranscribing && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Transcribing...</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-2 text-sm">
                              {isTranscribing ? (
                                <span className="text-amber-600">
                                  Transcribing your voice...
                                </span>
                              ) : audioUrl ? (
                                <div className="flex gap-2">
                                  <Badge variant="outline">
                                    Voice recorded
                                  </Badge>
                                  {transcriptionDone && (
                                    <Badge variant="success">
                                      Transcribed to text
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  Record your voice or type your response
                                </span>
                              )}
                            </div>
                          </div>
                          {audioUrl && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                              </div>
                              {duration > 0 && (
                                <Slider
                                  value={[currentTime]}
                                  max={duration}
                                  step={0.1}
                                  onValueChange={handleSliderChange}
                                  className="w-full"
                                />
                              )}
                              <audio
                                ref={audioRef}
                                src={audioUrl}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={() => setIsPlaying(false)}
                                hidden
                              />
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </ScrollArea>

        {/* Fixed Submit Button Section */}
        <div className="flex flex-col gap-2">
          <div className="sticky bottom-0 mt-auto border-t bg-background pb-16 sm:p-6">
            {!form.getValues('response') && (
              <p className="text-center text-xs text-muted-foreground">
                Please provide a response by recording your voice or typing
              </p>
            )}
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isTranscribing}
              className="w-full"
              size="lg"
              variant="default"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Submit Response
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
