import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  FastForward,
  Zap,
  Clock,
  FileUp,
  FileDown,
  Trash2,
} from 'lucide-react';

interface SimulationToolbarProps {
  isPlaying: boolean;
  currentTime: number;
  endTime: number;
  playSpeed: number;
  circuitName: string;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onRunToEnd: () => void;
  onSetEndTime: (time: number) => void;
  onSetPlaySpeed: (speed: number) => void;
  onClearCircuit: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onUpdateCircuitName: (name: string) => void;
}

export const SimulationToolbar: React.FC<SimulationToolbarProps> = ({
  isPlaying,
  currentTime,
  endTime,
  playSpeed,
  circuitName,
  onPlay,
  onPause,
  onStep,
  onReset,
  onRunToEnd,
  onSetEndTime,
  onSetPlaySpeed,
  onClearCircuit,
  onSaveProject,
  onLoadProject,
  onUpdateCircuitName,
}) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border">
        {/* Logo & Project Name */}
        <div className="flex items-center gap-2 mr-4">
          <Zap className="w-5 h-5 text-primary" />
          <Input
            value={circuitName}
            onChange={(e) => onUpdateCircuitName(e.target.value)}
            className="h-7 w-32 text-sm font-semibold bg-transparent border-transparent hover:border-border focus:border-primary px-1"
          />
        </div>

        <Separator orientation="vertical" className="h-6 bg-border" />

        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-secondary hover:text-primary"
                onClick={onReset}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset Simulation</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-secondary hover:text-primary"
                onClick={onStep}
                disabled={isPlaying}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Step Forward</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPlaying ? 'default' : 'ghost'}
                size="icon"
                className={`h-8 w-8 ${isPlaying ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary hover:text-primary'}`}
                onClick={isPlaying ? onPause : onPlay}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-secondary hover:text-primary"
                onClick={onRunToEnd}
                disabled={isPlaying}
              >
                <FastForward className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Run to End</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 bg-border" />

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Speed:</Label>
          <div className="flex gap-1">
            {[1, 2, 5, 10].map(speed => (
              <Button
                key={speed}
                variant={playSpeed === speed ? 'default' : 'ghost'}
                size="sm"
                className={`h-6 px-2 text-xs ${
                  playSpeed === speed 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-secondary hover:text-primary'
                }`}
                onClick={() => onSetPlaySpeed(speed)}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>

        <Separator orientation="vertical" className="h-6 bg-border" />

        {/* Time display */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono text-foreground min-w-[80px]">
            {currentTime.toFixed(1)} ns
          </span>
        </div>

        <Separator orientation="vertical" className="h-6 bg-border" />

        {/* End time control */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">End:</Label>
          <Input
            type="number"
            value={endTime}
            onChange={(e) => onSetEndTime(Number(e.target.value))}
            className="h-7 w-20 text-xs bg-input border-border"
            min={10}
            max={10000}
          />
          <span className="text-xs text-muted-foreground">ns</span>
        </div>

        <div className="flex-1" />

        {/* File operations */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-secondary hover:text-primary"
                onClick={onLoadProject}
              >
                <FileUp className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-secondary hover:text-primary"
                onClick={onSaveProject}
              >
                <FileDown className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save Project</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                onClick={onClearCircuit}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear Circuit</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
