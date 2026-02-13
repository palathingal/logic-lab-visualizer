import React from 'react';
import { ComponentType } from '@/types/circuit';

interface GateSVGProps {
  type: ComponentType;
  isSelected?: boolean;
  isActive?: boolean;
  hasViolation?: boolean;
  customName?: string;
  pinCount?: number;
}

export const GateSVG: React.FC<GateSVGProps> = ({ type, isSelected, isActive, hasViolation, customName, pinCount }) => {
  const strokeColor = hasViolation 
    ? 'hsl(var(--destructive))' 
    : isSelected 
      ? 'hsl(var(--primary))' 
      : 'hsl(var(--gate-stroke))';
  const fillColor = hasViolation ? 'hsl(var(--destructive) / 0.15)' : 'hsl(var(--gate-fill))';
  const glowFilter = hasViolation ? 'violation-glow' : isActive ? 'signal-glow' : '';

  switch (type) {
    case 'AND':
      return (
        <svg width="60" height="50" viewBox="0 0 60 50" className={glowFilter}>
          <path
            d="M5 5 L30 5 Q55 5 55 25 Q55 45 30 45 L5 45 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
          <text x="25" y="29" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">AND</text>
        </svg>
      );

    case 'OR':
      return (
        <svg width="60" height="50" viewBox="0 0 60 50" className={glowFilter}>
          <path
            d="M5 5 Q15 25 5 45 L5 45 Q35 45 55 25 Q35 5 5 5"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
          <text x="22" y="29" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">OR</text>
        </svg>
      );

    case 'NOT':
      return (
        <svg width="50" height="40" viewBox="0 0 50 40" className={glowFilter}>
          <path
            d="M5 5 L40 20 L5 35 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
          <circle cx="44" cy="20" r="4" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
        </svg>
      );

    case 'NAND':
      return (
        <svg width="65" height="50" viewBox="0 0 65 50" className={glowFilter}>
          <path
            d="M5 5 L30 5 Q50 5 50 25 Q50 45 30 45 L5 45 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
          <circle cx="56" cy="25" r="5" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <text x="18" y="29" fill="hsl(var(--foreground))" fontSize="9" fontFamily="monospace">NAND</text>
        </svg>
      );

    case 'NOR':
      return (
        <svg width="65" height="50" viewBox="0 0 65 50" className={glowFilter}>
          <path
            d="M5 5 Q15 25 5 45 L5 45 Q35 45 50 25 Q35 5 5 5"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
          <circle cx="56" cy="25" r="5" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <text x="18" y="29" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">NOR</text>
        </svg>
      );

    case 'XOR':
      return (
        <svg width="60" height="50" viewBox="0 0 60 50" className={glowFilter}>
          <path
            d="M8 5 Q18 25 8 45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
          />
          <path
            d="M12 5 Q22 25 12 45 L12 45 Q40 45 55 25 Q40 5 12 5"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
          <text x="22" y="29" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">XOR</text>
        </svg>
      );

    case 'XNOR':
      return (
        <svg width="65" height="50" viewBox="0 0 65 50" className={glowFilter}>
          <path
            d="M8 5 Q18 25 8 45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
          />
          <path
            d="M12 5 Q22 25 12 45 L12 45 Q40 45 50 25 Q40 5 12 5"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
          <circle cx="56" cy="25" r="5" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <text x="18" y="29" fill="hsl(var(--foreground))" fontSize="9" fontFamily="monospace">XNOR</text>
        </svg>
      );

    case 'BUFFER':
      return (
        <svg width="50" height="40" viewBox="0 0 50 40" className={glowFilter}>
          <path
            d="M5 5 L40 20 L5 35 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
        </svg>
      );

    case 'D_FF':
      return (
        <svg width="70" height="50" viewBox="0 0 70 50" className={glowFilter}>
          <rect x="5" y="5" width="60" height="40" fill={fillColor} stroke={strokeColor} strokeWidth="2" rx="2" />
          <text x="12" y="20" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">D</text>
          <text x="12" y="38" fill="hsl(var(--foreground))" fontSize="8" fontFamily="monospace">CLK</text>
          <text x="50" y="20" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">Q</text>
          <text x="50" y="38" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">Q̄</text>
          <path d="M5 30 L12 35 L5 40" fill="none" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );

    case 'JK_FF':
      return (
        <svg width="70" height="50" viewBox="0 0 70 50" className={glowFilter}>
          <rect x="5" y="5" width="60" height="40" fill={fillColor} stroke={strokeColor} strokeWidth="2" rx="2" />
          <text x="12" y="15" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">J</text>
          <text x="12" y="29" fill="hsl(var(--foreground))" fontSize="8" fontFamily="monospace">CLK</text>
          <text x="12" y="43" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">K</text>
          <text x="50" y="20" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">Q</text>
          <text x="50" y="38" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">Q̄</text>
          <path d="M5 25 L12 30 L5 35" fill="none" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );

    case 'SR_LATCH':
      return (
        <svg width="70" height="50" viewBox="0 0 70 50" className={glowFilter}>
          <rect x="5" y="5" width="60" height="40" fill={fillColor} stroke={strokeColor} strokeWidth="2" rx="2" />
          <text x="12" y="20" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">S</text>
          <text x="12" y="38" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">R</text>
          <text x="50" y="20" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">Q</text>
          <text x="50" y="38" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">Q̄</text>
        </svg>
      );

    case 'D_LATCH':
      return (
        <svg width="70" height="50" viewBox="0 0 70 50" className={glowFilter}>
          <rect x="5" y="5" width="60" height="40" fill={fillColor} stroke={strokeColor} strokeWidth="2" rx="2" />
          <text x="12" y="20" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">D</text>
          <text x="12" y="38" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">EN</text>
          <text x="50" y="20" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">Q</text>
          <text x="50" y="38" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">Q̄</text>
        </svg>
      );

    case 'INPUT':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" className={glowFilter}>
          <rect x="5" y="5" width="30" height="30" fill={fillColor} stroke={strokeColor} strokeWidth="2" rx="3" />
          <text x="12" y="25" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace">IN</text>
          <circle cx="35" cy="20" r="3" fill="hsl(var(--pin-output))" />
        </svg>
      );

    case 'CLOCK':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" className={glowFilter}>
          <rect x="5" y="5" width="30" height="30" fill={fillColor} stroke="hsl(var(--signal-clock))" strokeWidth="2" rx="3" />
          <path
            d="M10 25 L10 15 L15 15 L15 25 L20 25 L20 15 L25 15 L25 25 L30 25"
            fill="none"
            stroke="hsl(var(--signal-clock))"
            strokeWidth="1.5"
          />
          <circle cx="35" cy="20" r="3" fill="hsl(var(--signal-clock))" />
        </svg>
      );

    case 'CONSTANT':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" className={glowFilter}>
          <rect x="5" y="5" width="30" height="30" fill={fillColor} stroke={strokeColor} strokeWidth="2" rx="3" />
          <text x="12" y="26" fill="hsl(var(--foreground))" fontSize="12" fontFamily="monospace">0/1</text>
          <circle cx="35" cy="20" r="3" fill="hsl(var(--pin-output))" />
        </svg>
      );

    case 'OUTPUT':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" className={glowFilter}>
          <circle cx="5" cy="20" r="3" fill="hsl(var(--pin-input))" />
          <rect x="10" y="5" width="25" height="30" fill={fillColor} stroke={strokeColor} strokeWidth="2" rx="3" />
          <text x="14" y="25" fill="hsl(var(--foreground))" fontSize="9" fontFamily="monospace">OUT</text>
        </svg>
      );

    case 'CUSTOM': {
      const height = Math.max(50, (pinCount || 4) * 12 + 20);
      const label = customName || 'CUSTOM';
      const displayLabel = label.length > 6 ? label.slice(0, 6) + '…' : label;
      return (
        <svg width="80" height={height} viewBox={`0 0 80 ${height}`} className={glowFilter}>
          <rect x="5" y="5" width="70" height={height - 10} fill={fillColor} stroke="hsl(var(--chart-5))" strokeWidth="2" rx="4" strokeDasharray="4 2" />
          <text x="40" y={height / 2 + 4} fill="hsl(var(--foreground))" fontSize="9" fontFamily="monospace" textAnchor="middle">{displayLabel}</text>
        </svg>
      );
    }

    default:
      return (
        <svg width="40" height="40" viewBox="0 0 40 40">
          <rect x="5" y="5" width="30" height="30" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <text x="12" y="25" fill="hsl(var(--foreground))" fontSize="8">?</text>
        </svg>
      );
  }
};
