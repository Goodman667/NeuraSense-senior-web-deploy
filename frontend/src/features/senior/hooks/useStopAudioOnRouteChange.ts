import { useEffect } from 'react';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';

export function useStopAudioOnRouteChange(routeKey: string) {
  const stop = useSeniorAudioStore((state) => state.stop);
  useEffect(() => {
    return () => stop();
  }, [routeKey, stop]);
}
