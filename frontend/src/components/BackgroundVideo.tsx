'use client';

interface BackgroundVideoProps {
  videoSrc?: string;
  variant?: 'hero' | 'ambient';
  className?: string;
}

export default function BackgroundVideo({
  videoSrc = '/videos/hero_bg.mp4',
  variant = 'ambient',
  className = '',
}: BackgroundVideoProps) {
  const isHero = variant === 'hero';

  return (
    <div className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}>
      {/* Video - slight blur so text pops, still clearly visible */}
      <video
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        className={`h-full w-full object-cover transition-all duration-700 ${
          isHero
            ? 'scale-100 opacity-90 brightness-90 saturate-110'
            : 'scale-105 opacity-85 brightness-85 saturate-110'
        }`}
        style={{ filter: isHero ? 'blur(1.5px)' : 'blur(2px)' }}
      />

      {/* Gradient overlay — darker at top/bottom edges, clear in middle */}
      {isHero ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#080c14]/55 via-[#080c14]/25 to-[#080c14]/60" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#080c14]/50 via-[#080c14]/35 to-[#080c14]/70" />
      )}

      {/* Radial vignette — darkens edges, keeps center clear */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(8,12,20,0.55) 100%)',
        }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />
    </div>
  );
}
