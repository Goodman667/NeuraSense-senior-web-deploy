import { useCallback, useRef, useState } from 'react';

export type SpeechStatus = 'idle' | 'unsupported' | 'listening' | 'recognized' | 'error' | 'permission_denied';

export function useSeniorSpeechRecognition(onText: (text: string) => void) {
  const recognitionRef = useRef<any>(null);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [hint, setHint] = useState('可以点“开始说话”，也可以直接打字。');

  const stop = useCallback(() => {
    recognitionRef.current?.stop?.();
    setStatus('idle');
    setHint('已经暂停。您可以检查文字，或者继续下一步。');
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('unsupported');
      setHint('这个浏览器暂时不能语音识别。没关系，可以直接打字或点选继续。');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        const text = Array.from(event.results).map((item: any) => item[0]?.transcript || '').join('');
        onText(text);
        setStatus('recognized');
        setHint('我正在记录您说的话。说完后，可以点“继续”。');
      };
      recognition.onerror = (event: any) => {
        const denied = event?.error === 'not-allowed' || event?.error === 'permission-denied';
        setStatus(denied ? 'permission_denied' : 'error');
        setHint(denied ? '麦克风没有打开。没关系，您可以直接打字继续。' : '刚才没有听清楚，可以再试一次，也可以打字。');
      };
      recognition.onend = () => {
        setStatus((prev) => prev === 'listening' ? 'idle' : prev);
        setHint((prev) => prev.includes('正在听') ? '已经听完。请看看文字是否正确。' : prev);
      };
      recognitionRef.current = recognition;
      setStatus('listening');
      setHint('正在听您说话。请慢慢说，不用着急。');
      recognition.start();
    } catch {
      setStatus('error');
      setHint('语音暂时不可用。您可以直接打字继续。');
    }
  }, [onText]);

  return { status, hint, isListening: status === 'listening', start, stop };
}
