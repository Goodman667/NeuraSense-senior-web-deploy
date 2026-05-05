import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';
import { SeniorIcon } from './SeniorIcon';

export function SeniorPlaybackBar() {
  const { isLoading, isPlaying, currentText, error, stop, pause, resume, replay } = useSeniorTTS();
  const handleStop = () => {
    stop();
    useSeniorAudioStore.setState({ currentText: '', error: null });
  };
  return (
    <div className="rounded-[1.6rem] border border-cyan-100 bg-white/95 px-4 py-4 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.55)]" aria-live="polite">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-cyan-800"><SeniorIcon name="volume" className="h-4 w-4" />朗读控制</p>
          <p className="mt-1 text-base leading-6 text-slate-600">{isLoading ? '正在准备朗读...' : isPlaying ? '正在朗读，您可以随时停止。' : currentText ? '可以重听刚才的话。' : '没有正在朗读的内容。'}</p>
          {error ? <p className="mt-1 text-sm text-rose-700">{error}</p> : null}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {isPlaying ? <button onClick={pause} className="rounded-xl bg-amber-100 px-3 py-3 font-bold text-amber-900"><span className="inline-flex items-center gap-1"><SeniorIcon name="pause" className="h-4 w-4" />暂停</span></button> : <button onClick={resume} disabled={!currentText} className="rounded-xl bg-slate-100 px-3 py-3 font-bold text-slate-700 disabled:opacity-40">继续</button>}
          <button onClick={replay} disabled={!currentText} className="rounded-xl bg-cyan-50 px-3 py-3 font-bold text-cyan-900 disabled:opacity-40">重听</button>
          <button onClick={handleStop} className="rounded-xl bg-rose-50 px-3 py-3 font-bold text-rose-800">停止</button>
        </div>
      </div>
    </div>
  );
}
