import React from 'react';
import { Box, keyframes } from '@mui/material';

const wingFlapLeft = keyframes`
  0%, 100% {
    transform: rotateZ(-5deg);
  }
  25% {
    transform: rotateZ(-45deg);
  }
  75% {
    transform: rotateZ(-60deg);
  }
`;

const wingFlapRight = keyframes`
  0%, 100% {
    transform: rotateZ(5deg);
  }
  25% {
    transform: rotateZ(45deg);
  }
  75% {
    transform: rotateZ(60deg);
  }
`;

const butterflyFlightPath = keyframes`
  0% {
    top: 25vh;
    left: 15vw;
  }
  8% {
    top: 20vh;
    left: 25vw;
  }
  16% {
    top: 35vh;
    left: 45vw;
  }
  24% {
    top: 15vh;
    left: 65vw;
  }
  32% {
    top: 40vh;
    left: 75vw;
  }
  40% {
    top: 60vh;
    left: 80vw;
  }
  48% {
    top: 70vh;
    left: 65vw;
  }
  56% {
    top: 75vh;
    left: 45vw;
  }
  64% {
    top: 60vh;
    left: 25vw;
  }
  72% {
    top: 45vh;
    left: 10vw;
  }
  80% {
    top: 30vh;
    left: 5vw;
  }
  88% {
    top: 20vh;
    left: 8vw;
  }
  96% {
    top: 22vh;
    left: 12vw;
  }
  100% {
    top: 25vh;
    left: 15vw;
  }
`;

const bodyPulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const shimmer = keyframes`
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
`;

interface AnimatedMorphoButterflyProps {
  size?: number;
  className?: string;
  variant?: 'static' | 'floating';
}

const AnimatedMorphoButterfly: React.FC<AnimatedMorphoButterflyProps> = ({ 
  size = 48, 
  className,
  variant = 'static'
}) => {
  return (
    <Box
      className={className}
      sx={{
        display: variant === 'floating' ? 'block' : 'inline-block',
        width: size,
        height: size,
        ...(variant === 'floating' && {
          position: 'fixed',
          animation: `${butterflyFlightPath} 20s ease-in-out infinite`,
          zIndex: 1000,
          pointerEvents: 'none',
        })
      }}
    >
      <svg
        viewBox="0 0 100 80"
        width={size}
        height={size * 0.8}
        style={{ overflow: 'visible' }}
      >
        {/* Wing gradients */}
        <defs>
          <radialGradient id="morphoBlue" cx="50%" cy="30%" r="70%">
            <stop offset="0%" style={{ stopColor: '#00D4FF', stopOpacity: 1 }} />
            <stop offset="40%" style={{ stopColor: '#0099CC', stopOpacity: 1 }} />
            <stop offset="80%" style={{ stopColor: '#003366', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#001122', stopOpacity: 1 }} />
          </radialGradient>
          
          <radialGradient id="morphoBlueSecondary" cx="50%" cy="30%" r="70%">
            <stop offset="0%" style={{ stopColor: '#33AAFF', stopOpacity: 1 }} />
            <stop offset="40%" style={{ stopColor: '#0077AA', stopOpacity: 1 }} />
            <stop offset="80%" style={{ stopColor: '#002244', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#000D1A', stopOpacity: 1 }} />
          </radialGradient>

          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#2D1B1B', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#1A0F0F', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#0D0505', stopOpacity: 1 }} />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Left wings */}
        <g
          style={{
            transformOrigin: '35px 40px',
            animation: `${wingFlapLeft} 0.3s ease-in-out infinite`,
          }}
        >
          {/* Left upper wing */}
          <path
            d="M35 40 Q15 25 8 15 Q5 10 8 8 Q15 5 25 12 Q32 20 35 30 Z"
            fill="url(#morphoBlue)"
            stroke="#001122"
            strokeWidth="0.5"
            filter="url(#glow)"
            style={{
              animation: `${shimmer} 2s ease-in-out infinite`,
            }}
          />
          
          {/* Left lower wing */}
          <path
            d="M35 40 Q20 50 12 60 Q8 65 10 68 Q15 72 25 65 Q32 55 35 45 Z"
            fill="url(#morphoBlueSecondary)"
            stroke="#001122"
            strokeWidth="0.5"
            filter="url(#glow)"
            style={{
              animation: `${shimmer} 2s ease-in-out infinite 0.3s`,
            }}
          />

          {/* Wing spots/patterns */}
          <circle cx="22" cy="20" r="2" fill="#00AAFF" opacity="0.7" />
          <circle cx="18" cy="28" r="1.5" fill="#33BBFF" opacity="0.6" />
          <circle cx="25" cy="55" r="1.8" fill="#00AAFF" opacity="0.7" />
        </g>

        {/* Right wings */}
        <g
          style={{
            transformOrigin: '65px 40px',
            animation: `${wingFlapRight} 0.3s ease-in-out infinite`,
          }}
        >
          {/* Right upper wing */}
          <path
            d="M65 40 Q85 25 92 15 Q95 10 92 8 Q85 5 75 12 Q68 20 65 30 Z"
            fill="url(#morphoBlue)"
            stroke="#001122"
            strokeWidth="0.5"
            filter="url(#glow)"
            style={{
              animation: `${shimmer} 2s ease-in-out infinite 0.1s`,
            }}
          />
          
          {/* Right lower wing */}
          <path
            d="M65 40 Q80 50 88 60 Q92 65 90 68 Q85 72 75 65 Q68 55 65 45 Z"
            fill="url(#morphoBlueSecondary)"
            stroke="#001122"
            strokeWidth="0.5"
            filter="url(#glow)"
            style={{
              animation: `${shimmer} 2s ease-in-out infinite 0.4s`,
            }}
          />

          {/* Wing spots/patterns */}
          <circle cx="78" cy="20" r="2" fill="#00AAFF" opacity="0.7" />
          <circle cx="82" cy="28" r="1.5" fill="#33BBFF" opacity="0.6" />
          <circle cx="75" cy="55" r="1.8" fill="#00AAFF" opacity="0.7" />
        </g>

        {/* Butterfly body */}
        <ellipse
          cx="50"
          cy="40"
          rx="3"
          ry="25"
          fill="url(#bodyGradient)"
          stroke="#0D0505"
          strokeWidth="0.5"
          style={{
            transformOrigin: '50px 40px',
            animation: `${bodyPulse} 2s ease-in-out infinite`,
          }}
        />

        {/* Head */}
        <circle
          cx="50"
          cy="20"
          r="4"
          fill="#2D1B1B"
          stroke="#0D0505"
          strokeWidth="0.5"
        />

        {/* Antennae */}
        <path
          d="M48 18 Q45 12 42 8"
          stroke="#2D1B1B"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M52 18 Q55 12 58 8"
          stroke="#2D1B1B"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Antennae tips */}
        <circle cx="42" cy="8" r="1" fill="#2D1B1B" />
        <circle cx="58" cy="8" r="1" fill="#2D1B1B" />

        {/* Eyes */}
        <circle cx="47" cy="18" r="1" fill="#000" />
        <circle cx="53" cy="18" r="1" fill="#000" />
        <circle cx="47" cy="18" r="0.5" fill="#FFF" opacity="0.6" />
        <circle cx="53" cy="18" r="0.5" fill="#FFF" opacity="0.6" />
      </svg>
    </Box>
  );
};

export default AnimatedMorphoButterfly;