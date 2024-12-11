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
import { Spinner } from '@/components/ui/spinner';
import { getStorage, ref, getBlob, getDownloadURL } from 'firebase/storage';
import { appEnsiHome } from '@/lib/firebase/config';

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
          const detection = detections[0];
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
        labeled: decision
      };

      await dataCollectionDb.create('wake_detections_labeled', submission);
      await ensiHomeDb.update('wake_detections_labeled', currentDetection.id, {
        labeled: true
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

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-3xl">
          <CardContent className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8" />
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
            <p className="text-muted-foreground">No wake words to review</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="text-center">
            Review Wake Word Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold text-yellow-600">
                {remainingCount}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Allowed</p>
              <p className="text-xl font-bold text-green-600">{allowedCount}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-xl font-bold text-red-600">{rejectedCount}</p>
            </div>
          </div>

          {/* Audio Info */}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-center text-sm text-muted-foreground">
              Wake Word:{' '}
              <span className="font-semibold">
                {currentDetection.wake_word}
              </span>
            </p>
          </div>

          {/* Audio Player */}
          <div className="space-y-6">
            <Button
              onClick={togglePlayback}
              variant="outline"
              size="lg"
              className="w-full md:mx-auto md:w-auto md:px-8"
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Play
                </>
              )}
            </Button>

            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={handleSliderChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
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
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <Button
              variant={decision === 'allowed' ? 'default' : 'outline'}
              size="lg"
              disabled={!hasListened}
              onClick={() => setDecision('allowed')}
              className="w-full"
            >
              Allow
            </Button>
            <Button
              variant={decision === 'rejected' ? 'destructive' : 'outline'}
              size="lg"
              disabled={!hasListened}
              onClick={() => setDecision('rejected')}
              className="w-full"
            >
              Reject
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            size="lg"
            className="w-full"
            disabled={!decision || loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>

          {!hasListened && (
            <p className="text-center text-sm text-muted-foreground">
              Please listen to the audio before making a decision
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
