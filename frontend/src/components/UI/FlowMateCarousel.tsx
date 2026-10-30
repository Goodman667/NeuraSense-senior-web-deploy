import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useTourRunning } from '../../features/studyTour/useStudyTourStore';

export interface FlowMateItem {
    id: string;
    label: string;
    text: string;
    image: string;
    onClick?: () => void;
    /** data-tour id, so the guided study tour can point at this card */
    tourId?: string;
}

// FlowMate cards carousel: three painterly cards at a time from a rotating pool, auto-advancing every 4s.
export default function FlowMateCarousel({ title, items, subtitle }: { title: string; subtitle?: string; items: FlowMateItem[] }) {
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [paused, setPaused] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    const inView = useInView(ref, { once: true });
    const count = items.length;
    // Keep the cards still while the guided tour is pointing at one of them.
    const tourRunning = useTourRunning();

    useEffect(() => {
        if (paused || tourRunning || count <= 3) return;
        const timer = window.setInterval(() => {
            setDirection(1);
            setIndex((prev) => (prev + 1) % count);
        }, 4000);
        return () => window.clearInterval(timer);
    }, [count, paused, tourRunning]);

    if (!count) return null;
    const visible = Array.from({ length: Math.min(3, count) }, (_, offset) => items[(index + offset) % count]);
    const step = (delta: number) => {
        setDirection(delta);
        setIndex((prev) => (prev + delta + count) % count);
    };

    return (
        <section
            ref={ref}
            className="rounded-[20px] bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-8 sm:py-8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                className="mb-6 flex items-end justify-between gap-4 sm:mb-8"
            >
                <div>
                    <h2 className="font-display-cn text-[28px] leading-none text-black md:text-[34px]">{title}</h2>
                    {subtitle ? <p className="mt-2 text-sm text-black/55">{subtitle}</p> : null}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => step(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/20 transition-colors hover:border-black/40" aria-label="上一组">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <button onClick={() => step(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/20 transition-colors hover:border-black/40" aria-label="下一组">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 }}
                className="relative grid grid-cols-1 gap-6 md:grid-cols-3"
            >
                <AnimatePresence mode="popLayout" initial={false}>
                    {visible.map((card, idx) => (
                        <motion.button
                            key={`${card.id}-${index}-${idx}`}
                            type="button"
                            onClick={card.onClick}
                            data-tour={card.tourId}
                            initial={{ opacity: 0, x: direction > 0 ? 100 : -100, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: direction > 0 ? -100 : 100, scale: 0.95 }}
                            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], opacity: { duration: 0.5 } }}
                            className="group relative h-[380px] overflow-hidden rounded-2xl text-left xl:h-[440px]"
                        >
                            <span className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${card.image})` }} />
                            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <span className="relative flex h-full flex-col justify-between p-6">
                                <span className="inline-block py-1 text-sm font-medium text-white">{card.label}</span>
                                <span className="text-xl font-normal leading-snug text-white">{card.text}</span>
                            </span>
                        </motion.button>
                    ))}
                </AnimatePresence>
            </motion.div>
        </section>
    );
}
