'use client';

/**
 * PersistentBackground
 *
 * Wraps BackgroundVideo in a client component so the video element is mounted
 * exactly ONCE across the entire app lifetime. Because this component never
 * unmounts during client-side navigations, the browser does not reload the
 * video and the "flash / black-screen on tab switch" disappears.
 *
 * The <video> element itself carries no props that change between pages, so
 * React's reconciler leaves it untouched and playback continues uninterrupted.
 */
import BackgroundVideo from '@/components/BackgroundVideo';

export default function PersistentBackground() {
  return <BackgroundVideo variant="ambient" />;
}
