'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Play, Pause, Loader2 } from 'lucide-react';
import { database as ensiHomeDb } from '@/lib/firebase/ensi-home/database';
import { database as dataCollectionDb } from '@/lib/firebase/data-collection/database';
import { cloudStorage as ensiHomeStorage } from '@/lib/firebase/ensi-home/cloud-storage';
import { cloudStorage as dataCollectionStorage } from '@/lib/firebase/data-collection/cloud-storage';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getStorage, ref, getBlob, getDownloadURL } from 'firebase/storage';
import { appEnsiHome } from '@/lib/firebase/config';
import { createHash } from 'crypto';

interface WakeDetection {
  id: string;
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
  user_id?: string;
}

interface WakeDetectionSubmission {
  channels: number;
  filename: string;
  sample_rate: number;
  sample_width: number;
  source: string;
  storage_path: string;
  timestamp: string;
  wake_word: string;
  wake_word_id: string;
  labeled: 'allowed' | 'rejected';
  user_id: string;
}

export default function WakeWordReviewPage() {
  const [currentDetection, setCurrentDetection] =
    React.useState<WakeDetection | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [decision, setDecision] = React.useState<'allowed' | 'rejected' | null>(
    null
  );
  const [hasListened, setHasListened] = React.useState(false);
  const [remainingCount, setRemainingCount] = React.useState(0);
  const [allowedCount, setAllowedCount] = React.useState(0);
  const [rejectedCount, setRejectedCount] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Get remaining unlabeled detections
        const unlabeledDetections = await ensiHomeDb.query<WakeDetection>(
          'wake_detections_labeled',
          'labeled',
          '==',
          false
        );
        setRemainingCount(unlabeledDetections.length);

        // Get allowed detections from data collection
        const allowedDetections =
          await dataCollectionDb.query<WakeDetectionSubmission>(
            'wake_detections_labeled',
            'labeled',
            '==',
            'allowed'
          );
        setAllowedCount(allowedDetections.length);

        // Get rejected detections from data collection
        const rejectedDetections =
          await dataCollectionDb.query<WakeDetectionSubmission>(
            'wake_detections_labeled',
            'labeled',
            '==',
            'rejected'
          );
        setRejectedCount(rejectedDetections.length);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    const fetchUnlabeledDetection = async () => {
      try {
        const detections = await ensiHomeDb.query<WakeDetection>(
          'wake_detections_labeled',
          'labeled',
          '==',
          false
        );

        if (detections.length > 0) {
          // Get a random index between 0 and detections.length-1
          const randomIndex = Math.floor(Math.random() * detections.length);
          const detection = detections[randomIndex];
          const audioUrl = await ensiHomeStorage.getUrl(
            `wake_detections/${detection.filename}`
          );
          setCurrentDetection(detection);
          setAudioUrl(audioUrl);
        }
      } catch (error) {
        console.error('Error fetching wake detection:', error);
        toast.error('Failed to load wake detection');
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
    fetchUnlabeledDetection();
  }, []);

  const handleSubmit = async () => {
    if (!currentDetection || !decision) return;

    try {
      setLoading(true);
      console.log('Starting wake word review submission...');

      const storage = getStorage(appEnsiHome);
      const audioRef = ref(
        storage,
        `wake_detections/${currentDetection.filename}`
      );
      const signedUrl = await getDownloadURL(audioRef);
      const response = await fetch(signedUrl, {
        method: 'GET',
        headers: {
          Origin: window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const newPath = `wake_detection/${decision}/${currentDetection.id}.wav`;
      await dataCollectionStorage.upload(
        newPath,
        new File([audioBlob], `${currentDetection.id}.wav`)
      );
      const responseAuth = await fetch('/api/auth/session');
      const sessionAuth = await responseAuth.json();
      console.log('Setup user subscription - session: ', sessionAuth);
      const userId = sessionAuth.currentUser?.id;

      const submission: WakeDetectionSubmission = {
        channels: currentDetection.channels,
        filename: `${currentDetection.id}.wav`,
        sample_rate: currentDetection.sample_rate,
        sample_width: currentDetection.sample_width,
        source: currentDetection.source,
        storage_path: `gs://ensi-data-collection.firebasestorage.app/${newPath}`,
        timestamp: currentDetection.timestamp,
        wake_word: currentDetection.wake_word,
        wake_word_id: currentDetection.wake_word_id,
        labeled: decision,
        user_id: userId
      };

      await dataCollectionDb.create('wake_detections_labeled', submission);
      await ensiHomeDb.update('wake_detections_labeled', currentDetection.id, {
        labeled: true
      });

      const sessionUser = sessionAuth.currentUser;
      if (sessionUser?.wakeWordReviewCount) {
        console.log('wakeWordReviewCount exists');
        sessionUser.wakeWordReviewCount += 1;
      } else {
        console.log('wakeWordReviewCount does not exist');
        sessionUser.wakeWordReviewCount = 1;
      }

      const newWakeWordReviewCount = sessionUser.wakeWordReviewCount;

      await dataCollectionDb.update('users', userId, {
        wakeWordReviewCount: newWakeWordReviewCount
      });

      toast.success('Review submitted successfully');
      setDecision(null);
      setHasListened(false);
      window.location.reload();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      setHasListened(true);
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-3xl">
          <CardContent className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentDetection) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-3xl">
          <CardContent className="flex h-40 items-center justify-center">
            <Alert>
              <AlertDescription>No wake words to review</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 py-4 sm:px-4 sm:py-8">
      <Card className="mx-auto max-w-3xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-center text-lg sm:text-2xl">
            Review Wake Word Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:space-y-8 sm:p-6">
          {/* Stats */}
          <div className="flex flex-col justify-center gap-2 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <Badge
                variant="warning"
                className="w-full border-2 border-yellow-400 bg-yellow-100 py-2 text-base font-bold text-yellow-800 shadow-lg hover:bg-yellow-200 sm:py-3 sm:text-lg"
              >
                Remaining: {remainingCount}
              </Badge>
            </div>
            <div className="flex-1">
              <Badge
                variant="success"
                className="w-full border-2 border-green-400 bg-green-100 py-2 text-base font-bold text-green-800 shadow-lg hover:bg-green-200 sm:py-3 sm:text-lg"
              >
                Allowed: {allowedCount}
              </Badge>
            </div>
            <div className="flex-1">
              <Badge
                variant="destructive"
                className="w-full border-2 border-red-400 bg-red-100 py-2 text-base font-bold text-red-800 shadow-lg hover:bg-red-200 sm:py-3 sm:text-lg"
              >
                Rejected: {rejectedCount}
              </Badge>
            </div>
          </div>

          {/* Wake Word Info */}
          <Alert className="py-2 sm:py-3">
            <AlertDescription className="text-center text-sm sm:text-base">
              Wake Word:{' '}
              <span className="font-semibold">
                {currentDetection.wake_word}
              </span>
            </AlertDescription>
          </Alert>

          {/* Audio Player */}
          <div className="space-y-3 sm:space-y-6">
            <div className="flex justify-center">
              <Button
                onClick={togglePlayback}
                variant="outline"
                size="default"
                className="w-full border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 shadow-sm transition-transform duration-200 hover:scale-105 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 sm:w-auto sm:px-8"
              >
                {isPlaying ? (
                  <>
                    <Pause className="mr-2 h-4 w-4 text-blue-600 sm:h-5 sm:w-5" />
                    <span className="text-sm font-medium text-blue-700 sm:text-base">
                      Pause
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4 text-blue-600 sm:h-5 sm:w-5" />
                    <span className="text-sm font-medium text-blue-700 sm:text-base">
                      Play
                    </span>
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Progress
                value={(currentTime / duration) * 100}
                className="h-2 sm:h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground sm:text-sm">
                <span>{Math.floor(currentTime)}s</span>
                <span>{Math.floor(duration)}s</span>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl!}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                hidden
              />
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <Button
              variant={decision === 'allowed' ? 'success' : 'outline'}
              size="default"
              disabled={!hasListened}
              onClick={() => setDecision('allowed')}
              className="w-full py-2 text-sm sm:py-3 sm:text-base"
            >
              Allow
            </Button>
            <Button
              variant={decision === 'rejected' ? 'destructive' : 'outline'}
              size="default"
              disabled={!hasListened}
              onClick={() => setDecision('rejected')}
              className="w-full py-2 text-sm sm:py-3 sm:text-base"
            >
              Reject
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            size="default"
            className="w-full py-2 text-sm sm:py-3 sm:text-base"
            disabled={!decision || loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                Processing...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>

          {!hasListened && (
            <Alert>
              <AlertDescription className="text-center text-xs sm:text-base">
                Please listen to the audio before making a decision
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
