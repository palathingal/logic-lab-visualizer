import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Signal, SignalTransition, TimingViolation } from '@/types/circuit';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface WaveformViewerProps {
  signals: Signal[];
  violations: TimingViolation[];
  currentTime: number;
  endTime: number;
  height?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const SIGNAL_HEIGHT = 30;
const PADDING = 10;
const MIN_ZOOM = 1;
const MAX_ZOOM = 40;

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  signals,
  violations,
  currentTime,
  endTime,
  height = 200,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [timeScale, setTimeScale] = useState(5); // pixels per ns
  const [signalOrder, setSignalOrder] = useState<string[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Derive ordered signals
  const orderedSignals = useMemo(() => {
    if (!signalOrder) return signals;
    const ordered: Signal[] = [];
    for (const id of signalOrder) {
      const s = signals.find(sig => sig.id === id);
      if (s) ordered.push(s);
    }
    // Append any new signals not in the order
    for (const s of signals) {
      if (!signalOrder.includes(s.id)) ordered.push(s);
    }
    return ordered;
  }, [signals, signalOrder]);

  const totalWidth = endTime * timeScale + PADDING * 2;
  const totalHeight = Math.max(orderedSignals.length * (SIGNAL_HEIGHT + PADDING) + PADDING * 2, height);

  const generateWaveformPath = (signal: Signal, yOffset: number): string => {
    if (signal.transitions.length === 0) return '';

    const paths: string[] = [];
    const high = yOffset + 5;
    const low = yOffset + SIGNAL_HEIGHT - 5;
    const mid = yOffset + SIGNAL_HEIGHT / 2;

    for (let i = 0; i < signal.transitions.length; i++) {
      const transition = signal.transitions[i];
      const x = PADDING + transition.time * timeScale;
      const nextTransition = signal.transitions[i + 1];
      const nextX = nextTransition
        ? PADDING + nextTransition.time * timeScale
        : PADDING + endTime * timeScale;

      let y: number;
      if (transition.value === 1) {
        y = high;
      } else if (transition.value === 0) {
        y = low;
      } else {
        y = mid;
      }

      if (i === 0) {
        paths.push(`M ${x} ${y}`);
      } else {
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
    // Adjust step based on zoom level
    const pixelsBetween = timeScale * 5;
    let step: number;
    if (pixelsBetween > 100) step = 1;
    else if (pixelsBetween > 50) step = 2;
    else if (timeScale >= 10) step = 5;
    else if (timeScale >= 3) step = 10;
    else step = 20;

    for (let t = 0; t <= endTime; t += step) {
      markers.push(t);
    }
    return markers;
  }, [endTime, timeScale]);

  // Drag-and-drop signal reordering
  const handleDragStart = useCallback((idx: number) => {
    setDragIndex(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  }, []);

  const handleDrop = useCallback((idx: number) => {
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const currentOrder = signalOrder ?? orderedSignals.map(s => s.id);
    const newOrder = [...currentOrder];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(idx, 0, moved);
    setSignalOrder(newOrder);
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, signalOrder, orderedSignals]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const zoomIn = useCallback(() => {
    setTimeScale(prev => Math.min(MAX_ZOOM, prev + 2));
  }, []);

  const zoomOut = useCallback(() => {
    setTimeScale(prev => Math.max(MIN_ZOOM, prev - 2));
  }, []);

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
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">Waveforms</h3>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomOut}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <Slider
              value={[timeScale]}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={1}
              onValueChange={([v]) => setTimeScale(v)}
              className="w-20"
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomIn}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <span className="text-[10px] font-mono text-muted-foreground w-10 text-center">{timeScale}px/ns</span>
          </div>

          {/* Info */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-muted-foreground">
              Time: <span className="text-primary">{currentTime.toFixed(1)}ns</span>
            </span>
            {violations.length > 0 && (
              <span className="text-destructive">
                ⚠ {violations.length}
              </span>
            )}
          </div>

          {/* Expand/Collapse */}
          {onToggleExpand && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleExpand}>
                  {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isExpanded ? 'Collapse' : 'Expand'} Waveforms</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Waveform area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Signal names — draggable for reorder */}
        <div className="w-36 border-r border-border flex-shrink-0 bg-muted/20">
          <div className="h-6 border-b border-border flex items-center px-2">
            <span className="text-[10px] text-muted-foreground">Drag to reorder</span>
          </div>
          {orderedSignals.map((signal, idx) => (
            <div
              key={signal.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`h-[40px] flex items-center gap-1 px-2 border-b border-border/50 cursor-grab active:cursor-grabbing select-none transition-colors
                ${dragOverIndex === idx ? 'bg-primary/20 border-primary/50' : 'hover:bg-muted/40'}
                ${dragIndex === idx ? 'opacity-50' : ''}`}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
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
                      x1={PADDING + t * timeScale}
                      y1={0}
                      x2={PADDING + t * timeScale}
                      y2={totalHeight}
                      stroke="hsl(var(--grid-line))"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={PADDING + t * timeScale}
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
              {orderedSignals.map((signal, idx) => {
                const yOffset = 24 + idx * (SIGNAL_HEIGHT + PADDING);
                const isClockSignal = signal.nodeName.toLowerCase().includes('clock');

                return (
                  <g key={signal.id}>
                    <rect
                      x={PADDING}
                      y={yOffset}
                      width={endTime * timeScale}
                      height={SIGNAL_HEIGHT}
                      fill="hsl(var(--muted) / 0.3)"
                      rx="2"
                    />

                    <path
                      d={generateWaveformPath(signal, yOffset)}
                      fill="none"
                      stroke={isClockSignal ? 'hsl(var(--signal-clock))' : 'hsl(var(--signal-high))'}
                      strokeWidth="2"
                      className={isClockSignal ? 'clock-glow' : 'signal-glow'}
                    />

                    {signal.transitions
                      .filter(t => t.isGlitch)
                      .map((t, i) => (
                        <circle
                          key={i}
                          cx={PADDING + t.time * timeScale}
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
                x1={PADDING + currentTime * timeScale}
                y1={0}
                x2={PADDING + currentTime * timeScale}
                y2={totalHeight}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="4 2"
              />

              {/* Violation markers */}
              {violations.map((v, idx) => (
                <g key={idx}>
                  <rect
                    x={PADDING + v.time * timeScale - 2}
                    y={0}
                    width="4"
                    height={totalHeight}
                    fill="hsl(var(--violation) / 0.3)"
                  />
                  <circle
                    cx={PADDING + v.time * timeScale}
                    cy={16}
                    r="6"
                    fill="hsl(var(--violation))"
                    className="violation-glow"
                  />
                  <text
                    x={PADDING + v.time * timeScale}
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
