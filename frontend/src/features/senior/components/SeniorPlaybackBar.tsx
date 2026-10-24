import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';

export function SeniorPlaybackBar() {
  const { isLoading, isPlaying, currentText, error, stop, pause, resume, replay } = useSeniorTTS();
  const fallbackMode = useSeniorAudioStore(state => state.fallbackMode);
  const handleStop = () => {
    stop();
    useSeniorAudioStore.setState({ currentText: '', error: null });
  };
  const status = isLoading ? '正在准备朗读' : isPlaying ? '正在朗读' : currentText ? '可以重听刚才的话' : '现在没有朗读';
  return (
    <div className="rounded-[18px] border border-[var(--sn-line)] bg-[var(--sn-sheet)] p-3" aria-live="polite">
      <p className="flex items-center gap-2 px-1 text-[1.05rem] text-[var(--sn-ink-2)]">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${isPlaying ? 'bg-[var(--sn-ochre)] motion-safe:animate-pulse' : 'bg-[var(--sn-line-strong)]'}`} />
        {status}
      </p>
      {error ? <p className={`mt-1 px-1 text-sm ${fallbackMode === 'browser' ? 'text-[var(--sn-ink-3)]' : 'text-[var(--sn-help)]'}`}>{error}</p> : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {isPlaying ? (
          <button onClick={pause} className="sn-btn sn-btn-quiet !min-h-[2.8rem] min-w-[4.2rem] grow shrink-0 !px-2 !text-[1.05rem] whitespace-nowrap">暂停</button>
        ) : (
          <button onClick={resume} disabled={!currentText} className="sn-btn sn-btn-quiet !min-h-[2.8rem] min-w-[4.2rem] grow shrink-0 !px-2 !text-[1.05rem] whitespace-nowrap">继续</button>
        )}
        <button onClick={replay} disabled={!currentText} className="sn-btn sn-btn-quiet !min-h-[2.8rem] min-w-[4.2rem] grow shrink-0 !px-2 !text-[1.05rem] whitespace-nowrap">重听</button>
        <button onClick={handleStop} className="sn-btn sn-btn-quiet !min-h-[2.8rem] min-w-[4.2rem] grow shrink-0 !px-2 !text-[1.05rem] whitespace-nowrap">停止</button>
      </div>
    </div>
  );
}
