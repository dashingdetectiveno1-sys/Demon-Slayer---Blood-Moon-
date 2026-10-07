import React, { useEffect, useRef, useState } from 'react';
import { OPENING_FRAMES } from '../opening';
import { audioManager } from '../audio';

// OpeningCinematic: anime-style key-art opening. Preloaded images + CSS
// transforms only (no video, no WebGL), so it is free on phones.
// Frame timing follows the VO buffer length when decoded, else fallbackMs.
const OpeningCinematic: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    const [idx, setIdx] = useState(0);
    const [chars, setChars] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const timerRef = useRef<number | null>(null);
    const frame = OPENING_FRAMES[idx];

    // Preload every frame image up front so crossfades never hit the network
    useEffect(() => {
        OPENING_FRAMES.forEach(f => { const im = new Image(); im.src = f.img; });
    }, []);

    // Play the frame's VO, then schedule the advance at clip end (or fallback).
    useEffect(() => {
        setChars(0);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        const f = OPENING_FRAMES[idx];
        const scheduleNext = (ms: number) => {
            timerRef.current = window.setTimeout(() => {
                setIdx(i => {
                    if (i + 1 >= OPENING_FRAMES.length) { onFinish(); return i; }
                    return i + 1;
                });
            }, ms);
        };
        if (f.vo) {
            let attempts = 0;
            const tryPlay = () => {
                const se: any = audioManager;
                const buf = se.voiceBuffers && se.voiceBuffers[f.vo!];
                if (buf) {
                    audioManager.playVoice(f.vo!, { volume: 1.0 });
                    scheduleNext(buf.duration * 1000 + 1400);
                    return;
                }
                if (++attempts < 10) window.setTimeout(tryPlay, 250);
                else scheduleNext(f.fallbackMs); // clip missing (pending voice): fixed beat
            };
            tryPlay();
        } else {
            scheduleNext(f.fallbackMs);
        }
        return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
    }, [idx]);

    // Typewriter caption
    useEffect(() => {
        const t = window.setInterval(() => {
            setChars(c => (c < frame.text.length ? c + 1 : c));
        }, 28);
        return () => window.clearInterval(t);
    }, [idx, frame.text.length]);

    const advance = () => {
        if (chars < frame.text.length) { setChars(frame.text.length); return; }
        if (idx + 1 >= OPENING_FRAMES.length) { onFinish(); return; }
        setIdx(i => i + 1);
    };

    const skip = () => {
        setLeaving(true);
        window.setTimeout(onFinish, 450);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advance(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const durMs = frame.fallbackMs + 4000; // generous transform window; the timer cuts it
    const kbFrom = `scale(${frame.kb.scale[0]}) translate(${frame.kb.x[0]}%, ${frame.kb.y[0]}%)`;
    const kbTo = `scale(${frame.kb.scale[1]}) translate(${frame.kb.x[1]}%, ${frame.kb.y[1]}%)`;

    return (
        <div
            className={`absolute inset-0 z-[70] bg-black select-none transition-opacity duration-500 ${leaving ? 'opacity-0' : 'opacity-100'}`}
            onClick={advance}
        >
            {/* key art layers: previous fades out as current fades in */}
            {OPENING_FRAMES.map((f, i) => (
                i === idx || i === idx - 1 ? (
                    <div
                        key={i}
                        className="absolute inset-0 overflow-hidden transition-opacity duration-1000"
                        style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 2 : 1 }}
                    >
                        {i === idx ? (
                            <img
                                src={f.img}
                                alt=""
                                draggable={false}
                                className="w-full h-full object-cover"
                                style={{
                                    animation: `kbMove-${idx} ${durMs}ms linear forwards`,
                                }}
                            />
                        ) : (
                            <img src={f.img} alt="" draggable={false} className="w-full h-full object-cover" />
                        )}
                        {i === idx && (
                            <style>{`@keyframes kbMove-${idx} { from { transform: ${kbFrom}; } to { transform: ${kbTo}; } }`}</style>
                        )}
                    </div>
                ) : null
            ))}

            {/* cinematic grade: darken edges, warm the center slightly */}
            <div className="absolute inset-0 z-[3] pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 45%, rgba(0,0,0,0.55) 100%)' }} />

            {/* letterbox bars */}
            <div className="absolute top-0 inset-x-0 h-[10%] bg-black z-[4] pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-[18%] bg-black z-[4] pointer-events-none" />

            {/* top tags */}
            <div className="absolute top-4 left-4 z-[6] flex items-center space-x-2 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-mono tracking-[0.3em] text-red-500 uppercase">Crimson Moon</span>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); skip(); }}
                className="absolute top-4 right-4 z-[6] px-3 py-1.5 border border-red-500/40 rounded text-[10px] font-mono tracking-[0.25em] text-red-300 uppercase hover:bg-red-950/60 transition-colors"
            >
                Skip Intro -&gt;
            </button>

            {/* caption */}
            <div className="absolute bottom-0 inset-x-0 z-[6] px-6 pb-8 pointer-events-none">
                <div className="max-w-xl mx-auto">
                    <div className="inline-block px-2 py-0.5 mb-2 border border-red-500/40 rounded text-[10px] font-mono tracking-[0.3em] text-red-400 uppercase bg-black/50">
                        {frame.speaker}
                    </div>
                    <p className="text-white text-base sm:text-lg leading-relaxed font-light" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                        {frame.text.slice(0, chars)}
                        <span className="animate-pulse">|</span>
                    </p>
                    <div className="mt-3 text-[9px] font-mono tracking-[0.25em] text-amber-500/70 uppercase">
                        Click or Space / Enter to advance -&gt;
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OpeningCinematic;
