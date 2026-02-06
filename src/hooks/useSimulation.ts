import { useState, useCallback, useRef, useEffect } from 'react';
import { Circuit, SimulationState, Signal } from '@/types/circuit';
import { SimulationEngine } from '@/lib/simulationEngine';

export const useSimulation = () => {
  const engineRef = useRef<SimulationEngine>(new SimulationEngine());
  const animationRef = useRef<number | null>(null);
  
  const [state, setState] = useState<SimulationState>({
    isRunning: false,
    currentTime: 0,
    endTime: 100,
    timeStep: 0.1,
    signals: [],
    violations: [],
    eventQueue: [],
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 1x, 2x, 5x, 10x

  const loadCircuit = useCallback((circuit: Circuit) => {
    engineRef.current.loadCircuit(circuit);
    setState(engineRef.current.getState());
  }, []);

  const step = useCallback(() => {
    const hasMore = engineRef.current.step();
    setState(engineRef.current.getState());
    return hasMore;
  }, []);

  const run = useCallback((endTime?: number) => {
    const finalState = engineRef.current.run(endTime);
    setState(finalState);
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    engineRef.current.reset();
    setState(engineRef.current.getState());
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const setParameters = useCallback((params: { endTime?: number; timeStep?: number }) => {
    engineRef.current.setSimulationParameters(params);
    setState(engineRef.current.getState());
  }, []);

  // Animation loop for real-time simulation
  useEffect(() => {
    if (!isPlaying) return;

    const stepsPerFrame = Math.max(1, Math.floor(playSpeed * 5));
    
    const animate = () => {
      let hasMore = true;
      for (let i = 0; i < stepsPerFrame && hasMore; i++) {
        hasMore = engineRef.current.step();
      }
      setState(engineRef.current.getState());

      if (hasMore) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playSpeed]);

  return {
    state,
    isPlaying,
    playSpeed,
    loadCircuit,
    step,
    run,
    reset,
    play,
    pause,
    setParameters,
    setPlaySpeed,
  };
};
