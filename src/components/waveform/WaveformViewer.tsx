import React, { useMemo } from 'react';
import { Signal, SignalTransition, TimingViolation } from '@/types/circuit';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface WaveformViewerProps {
  signals: Signal[];
  violations: TimingViolation[];
  currentTime: number;
  endTime: number;
  height?: number;
}

const SIGNAL_HEIGHT = 30;
const PADDING = 10;
const TIME_SCALE = 5; // pixels per ns

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  signals,
  violations,
  currentTime,
  endTime,
  height = 200,
}) => {
  const totalWidth = endTime * TIME_SCALE + PADDING * 2;
  const totalHeight = Math.max(signals.length * (SIGNAL_HEIGHT + PADDING) + PADDING * 2, height);

  const generateWaveformPath = (signal: Signal, yOffset: number): string => {
    if (signal.transitions.length === 0) return '';

    const paths: string[] = [];
    const high = yOffset + 5;
    const low = yOffset + SIGNAL_HEIGHT - 5;
    const mid = yOffset + SIGNAL_HEIGHT / 2;

    for (let i = 0; i < signal.transitions.length; i++) {
      const transition = signal.transitions[i];
      const x = PADDING + transition.time * TIME_SCALE;
      const nextTransition = signal.transitions[i + 1];
      const nextX = nextTransition 
        ? PADDING + nextTransition.time * TIME_SCALE 
        : PADDING + endTime * TIME_SCALE;

      let y: number;
      if (transition.value === 1) {
        y = high;
      } else if (transition.value === 0) {
        y = low;
      } else {
        // X state - draw in middle with hatching
        y = mid;
      }

      if (i === 0) {
        paths.push(`M ${x} ${y}`);
      } else {
        // Transition edge
        const prevTransition = signal.transitions[i - 1];
        let prevY: number;
        if (prevTransition.value === 1) {
          prevY = high;
        } else if (prevTransition.value === 0) {
          prevY = low;
        } else {
          prevY = mid;
        }
        paths.push(`L ${x} ${prevY} L ${x} ${y}`);
      }

      paths.push(`L ${nextX} ${y}`);
    }

    return paths.join(' ');
  };

  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const step = endTime > 100 ? 20 : endTime > 50 ? 10 : 5;
    for (let t = 0; t <= endTime; t += step) {
      markers.push(t);
    }
    return markers;
  }, [endTime]);

  if (signals.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-card border-t border-border">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No signals to display</p>
          <p className="text-muted-foreground text-xs mt-1">Add components and run simulation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">Waveforms</h3>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-muted-foreground">
            Time: <span className="text-primary">{currentTime.toFixed(1)} ns</span>
          </span>
          <span className="text-muted-foreground">
            End: <span className="text-foreground">{endTime} ns</span>
          </span>
          {violations.length > 0 && (
            <span className="text-destructive">
              ⚠ {violations.length} violation{violations.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Waveform area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Signal names */}
        <div className="w-32 border-r border-border flex-shrink-0 bg-muted/20">
          <div className="h-6 border-b border-border" /> {/* Spacer for time ruler */}
          {signals.map((signal, idx) => (
            <div
              key={signal.id}
              className="h-[40px] flex items-center px-3 border-b border-border/50"
            >
              <span className="text-xs font-mono text-foreground truncate" title={signal.nodeName}>
                {signal.nodeName}
              </span>
            </div>
          ))}
        </div>

        {/* Waveform canvas */}
        <ScrollArea className="flex-1">
          <div className="waveform-grid" style={{ width: totalWidth, minHeight: totalHeight }}>
            <svg width={totalWidth} height={totalHeight}>
              {/* Time ruler */}
              <g className="time-ruler">
                {timeMarkers.map(t => (
                  <g key={t}>
                    <line
                      x1={PADDING + t * TIME_SCALE}
                      y1={0}
                      x2={PADDING + t * TIME_SCALE}
                      y2={totalHeight}
                      stroke="hsl(var(--grid-line))"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={PADDING + t * TIME_SCALE}
                      y={14}
                      fill="hsl(var(--muted-foreground))"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                    >
                      {t}
                    </text>
                  </g>
                ))}
              </g>

              {/* Signal waveforms */}
              {signals.map((signal, idx) => {
                const yOffset = 24 + idx * (SIGNAL_HEIGHT + PADDING);
                const isClockSignal = signal.nodeName.toLowerCase().includes('clock');
                
                return (
                  <g key={signal.id}>
                    {/* Background */}
                    <rect
                      x={PADDING}
                      y={yOffset}
                      width={endTime * TIME_SCALE}
                      height={SIGNAL_HEIGHT}
                      fill="hsl(var(--muted) / 0.3)"
                      rx="2"
                    />
                    
                    {/* Waveform path */}
                    <path
                      d={generateWaveformPath(signal, yOffset)}
                      fill="none"
                      stroke={isClockSignal ? 'hsl(var(--signal-clock))' : 'hsl(var(--signal-high))'}
                      strokeWidth="2"
                      className={isClockSignal ? 'clock-glow' : 'signal-glow'}
                    />

                    {/* Glitch markers */}
                    {signal.transitions
                      .filter(t => t.isGlitch)
                      .map((t, i) => (
                        <circle
                          key={i}
                          cx={PADDING + t.time * TIME_SCALE}
                          cy={yOffset + SIGNAL_HEIGHT / 2}
                          r="4"
                          fill="hsl(var(--warning))"
                          className="animate-pulse"
                        />
                      ))}
                  </g>
                );
              })}

              {/* Current time cursor */}
              <line
                x1={PADDING + currentTime * TIME_SCALE}
                y1={0}
                x2={PADDING + currentTime * TIME_SCALE}
                y2={totalHeight}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="4 2"
              />

              {/* Violation markers */}
              {violations.map((v, idx) => (
                <g key={idx}>
                  <rect
                    x={PADDING + v.time * TIME_SCALE - 2}
                    y={0}
                    width="4"
                    height={totalHeight}
                    fill="hsl(var(--violation) / 0.3)"
                  />
                  <circle
                    cx={PADDING + v.time * TIME_SCALE}
                    cy={16}
                    r="6"
                    fill="hsl(var(--violation))"
                    className="violation-glow"
                  />
                  <text
                    x={PADDING + v.time * TIME_SCALE}
                    y={20}
                    fill="white"
                    fontSize="8"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    !
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};
