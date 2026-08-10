import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  showText?: boolean;
  className?: string;
}

export default function TrustLensLogo({
  size = 'md',
  variant = 'dark',
  showText = true,
  className = '',
}: LogoProps) {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative flex items-center justify-center ${iconSizes[size]} shrink-0`}>
        {/* Glow backdrop */}
        <div className={`absolute inset-0 rounded-2xl ${isLight ? 'bg-slate-900/10' : 'bg-cyan-500/20'} blur-md transition-opacity group-hover:opacity-100`} />
        
        {/* SVG Mark */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative h-full w-full drop-shadow-[0_2px_10px_rgba(6,182,212,0.3)]"
        >
          <defs>
            <linearGradient id="trustShieldGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            <linearGradient id="irisCoreGrad" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Shield Shell */}
          <path
            d="M50 8L85 22V48C85 69.5 69.8 89.2 50 95C30.2 89.2 15 69.5 15 48V22L50 8Z"
            fill="url(#trustShieldGrad)"
            fillOpacity={isLight ? "0.2" : "0.15"}
            stroke="url(#trustShieldGrad)"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />

          {/* Cyber Shield Inner Facet Line */}
          <path
            d="M50 16L77 27.5V48C77 64.5 65.5 79.8 50 84.5C34.5 79.8 23 64.5 23 48V27.5L50 16Z"
            stroke="#06b6d4"
            strokeOpacity="0.4"
            strokeWidth="2"
            strokeDasharray="4 3"
          />

          {/* Optical Iris / Lens Outer Aperture Ring */}
          <circle
            cx="50"
            cy="48"
            r="19"
            stroke="url(#trustShieldGrad)"
            strokeWidth="3.5"
            filter="url(#cyanGlow)"
          />

          {/* Optical Iris Center Lens */}
          <circle
            cx="50"
            cy="48"
            r="10"
            fill="url(#irisCoreGrad)"
          />

          {/* Lens Scan Beam Lines */}
          <line x1="50" y1="21" x2="50" y2="25" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="71" x2="50" y2="75" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <line x1="23" y1="48" x2="27" y2="48" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <line x1="73" y1="48" x2="77" y2="48" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

          {/* Optical AI Flare Node */}
          <circle cx="46" cy="44" r="3" fill="#ffffff" fillOpacity="0.9" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-extrabold tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'} ${textSizes[size]}`}>
            Trust<span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">Lens</span>
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-[0.28em] mt-0.5 ${isLight ? 'text-slate-500' : 'text-cyan-400'}`}>
            Trust Intelligence
          </span>
        </div>
      )}
    </div>
  );
}

