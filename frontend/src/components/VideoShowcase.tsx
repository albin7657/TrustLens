import type { ReactNode } from 'react';

interface VideoShowcaseProps {
  title: string;
  eyebrow: string;
  description: string;
  videoSrc: string;
  captions?: ReactNode;
  reversed?: boolean;
}

export default function VideoShowcase({
  title,
  eyebrow,
  description,
  videoSrc,
  captions,
  reversed = false,
}: VideoShowcaseProps) {
  return (
    <div
      className={`grid gap-8 overflow-hidden rounded-[2.5rem] border border-slate-800/90 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr] lg:p-8 ${
        reversed ? 'lg:grid-flow-dense' : ''
      }`}
    >
      <div className={`flex flex-col justify-between gap-6 ${reversed ? 'lg:col-start-2' : ''}`}>
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400">
            {eyebrow}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            {description}
          </p>
        </div>

        {captions ? <div className="grid gap-3 sm:grid-cols-2">{captions}</div> : null}
      </div>

      <div className={`relative ${reversed ? 'lg:col-start-1' : ''}`}>
        <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-indigo-500/20 blur-2xl opacity-70" />
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-slate-700/80 bg-slate-950 shadow-2xl shadow-black/80">
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

