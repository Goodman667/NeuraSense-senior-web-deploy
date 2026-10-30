import { useMemo } from 'react';
import { isAppleTouchDevice, useSpeechInput } from '../../../lib/useSpeechInput';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';

export type SpeechStatus = 'idle' | 'unsupported' | 'listening' | 'recognized' | 'error' | 'permission_denied';

const DICTATION_TIP = isAppleTouchDevice()
  ? '也可以点屏幕键盘上的小话筒，用 iPad 自带的听写说话（普通话、粤语都可以）。'
  : '也可以直接打字，或者用输入法自带的语音输入。';

/**
 * Companion-mode voice input. `start(base)` adds what is said after `base` (what is already in
 * the box). See lib/useSpeechInput.ts for why the second press used to fail on tablets.
 */
export function useSeniorSpeechRecognition(onText: (text: string) => void) {
  const input = useSpeechInput({
    onText,
    onBeforeStart: () => useSeniorAudioStore.getState().stop(),
  });

  const { status, hint } = useMemo((): { status: SpeechStatus; hint: string } => {
    switch (input.status) {
      case 'unsupported':
        return { status: 'unsupported', hint: `这个浏览器暂时不能语音识别。${DICTATION_TIP}` };
      case 'listening':
        return { status: 'listening', hint: '正在听您说话。请慢慢说，说完再按一下。' };
      case 'recognized':
        return { status: 'recognized', hint: '已经听完了。看看文字对不对，想接着说就再按一下。' };
      case 'no-speech':
        return { status: 'error', hint: input.suggestDictation ? `刚才没有听到声音。${DICTATION_TIP}` : '刚才没有听到声音，可以再按一下试试，也可以打字。' };
      case 'permission_denied':
        return { status: 'permission_denied', hint: `麦克风没有打开。请在浏览器设置里允许使用麦克风。${DICTATION_TIP}` };
      case 'error':
        return { status: 'error', hint: input.suggestDictation ? `语音识别没有成功。${DICTATION_TIP}` : '刚才没有听清楚，可以再按一下试试，也可以打字。' };
      case 'idle':
      default:
        return { status: 'idle', hint: '可以按一下话筒说话，也可以直接打字。' };
    }
  }, [input.status, input.suggestDictation]);

  return {
    status,
    hint,
    isListening: input.isListening,
    start: (base = '') => input.start(base),
    stop: input.stop,
  };
}
