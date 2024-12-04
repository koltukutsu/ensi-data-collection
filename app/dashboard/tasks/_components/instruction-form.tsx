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
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Square, Send, Play, Pause } from 'lucide-react';
import { useParams } from 'next/navigation';
import { app } from '@/lib/firebase/config';
import { cloudStorage } from '@/lib/firebase/cloud-storage';
import { database } from '@/lib/firebase/database';
import { Task } from '@/constants/data';
import { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  response: z.string().min(1, {
    message: 'Response is required.'
  })
});

export default function InstructionForm() {
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout>();
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      response: ''
    }
  });

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
      setDuration(audioRef.current.duration);
    }
  };

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  // Fetch the specific task data
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const taskData = await database.getOne<Task>(
          'sources/leaf_instruction_prompts/prompts',
          params.leafId as string
        );
        setTask(taskData);
      } catch (err) {
        console.error('Failed to fetch task:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.leafId) {
      fetchTask();
    }
  }, [params.leafId]);

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

        // Convert audio to text using Whisper API
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');

        const response = await fetch(
          'https://api.openai.com/v1/audio/transcriptions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
            },
            body: formData
          }
        );

        const data = await response.json();
        form.setValue('response', data.text);
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      let audioUrl = null;

      if (audioBlob) {
        const fileName = `recording-${Date.now()}.webm`;
        const filePath = cloudStorage.generatePath('recordings', fileName);
        const file = new File([audioBlob], fileName, { type: 'audio/webm' });
        const { url } = await cloudStorage.upload(filePath, file);
        audioUrl = url;
      }

      await database.create('responses/leaf_instruction_prompt', {
        leaf_id: params.leafId,
        instruction_prompt_leaf_path_list: [], // Add your path list logic here
        response: values.response,
        recorded_voice_reference: audioUrl,
        created_at: new Date()
      });

      form.reset();
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err) {
      console.error('Failed to submit response:', err);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!task) {
    return <div>Task not found</div>;
  }

  return (
    <Card className="mx-auto w-full">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">
          Instruction Response
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-8">
          <h3 className="mb-2 text-lg font-semibold">Prompt:</h3>
          <p className="text-gray-700">{task.instruction_prompt}</p>

          <div className="mt-4">
            <h4 className="mb-2 text-sm font-semibold text-gray-600">
              Leaf Paths:
            </h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
              {task.leaf_path_list.map((path, index) => (
                <li key={index}>{path}</li>
              ))}
            </ul>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="response"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Response</FormLabel>
                  <div className="space-y-4">
                    <FormControl>
                      <Textarea
                        placeholder="Type your response here..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant={isRecording ? 'destructive' : 'secondary'}
                          onClick={isRecording ? stopRecording : startRecording}
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
                        {audioUrl && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={togglePlayback}
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
                          </>
                        )}
                      </div>
                      {audioUrl && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                          <Slider
                            value={[currentTime]}
                            max={duration}
                            step={0.1}
                            onValueChange={handleSliderChange}
                            className="w-full"
                          />
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
            <Button type="submit">
              <Send className="mr-2 h-4 w-4" />
              Send Response
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
