import React, { useEffect, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ComponentPalette } from '@/components/sidebar/ComponentPalette';
import { PropertiesPanel } from '@/components/sidebar/PropertiesPanel';
import { TimingAnalysisPanel } from '@/components/timing/TimingAnalysisPanel';
import { CircuitCanvas } from '@/components/canvas/CircuitCanvas';
import { WaveformViewer } from '@/components/waveform/WaveformViewer';
import { SimulationToolbar } from '@/components/toolbar/SimulationToolbar';
import { useCircuit } from '@/hooks/useCircuit';
import { useSimulation } from '@/hooks/useSimulation';

const Index: React.FC = () => {
  const {
    circuit,
    canvasState,
    addComponent,
    removeComponent,
    updateComponentPosition,
    updateComponentPattern,
    updateComponentTiming,
    updateComponentName,
    removeWire,
    selectComponent,
    selectWire,
    startWiring,
    cancelWiring,
    completeWiring,
    setZoom,
    setPan,
    clearCircuit,
    saveCircuitToFile,
    loadCircuitFromFile,
    updateCircuitName,
  } = useCircuit();

  const {
    state: simState,
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
  } = useSimulation();

  // Load circuit into simulation engine when it changes
  useEffect(() => {
    loadCircuit(circuit);
  }, [circuit, loadCircuit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvasState.selectedComponentId) {
          removeComponent(canvasState.selectedComponentId);
        } else if (canvasState.selectedWireId) {
          removeWire(canvasState.selectedWireId);
        }
      } else if (e.key === 'Escape') {
        if (canvasState.isWiring) {
          cancelWiring();
        } else {
          selectComponent(null);
          selectWire(null);
        }
      } else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasState, removeComponent, removeWire, cancelWiring, selectComponent, selectWire, isPlaying, play, pause]);

  const selectedComponent = canvasState.selectedComponentId 
    ? circuit.components.find(c => c.id === canvasState.selectedComponentId) ?? null
    : null;

  const selectedWire = canvasState.selectedWireId
    ? circuit.wires.find(w => w.id === canvasState.selectedWireId) ?? null
    : null;

  const handleClearCircuit = useCallback(() => {
    clearCircuit();
    reset();
  }, [clearCircuit, reset]);

  const handleSaveProject = useCallback(() => {
    saveCircuitToFile();
  }, [saveCircuitToFile]);

  const handleLoadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.logiclab.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await loadCircuitFromFile(file);
          reset();
        } catch (err) {
          console.error('Failed to load circuit:', err);
          alert('Failed to load circuit file. Please ensure it is a valid LogicLab project file.');
        }
      }
    };
    input.click();
  }, [loadCircuitFromFile, reset]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Top Toolbar */}
      <SimulationToolbar
        isPlaying={isPlaying}
        currentTime={simState.currentTime}
        endTime={simState.endTime}
        playSpeed={playSpeed}
        circuitName={circuit.name}
        onPlay={play}
        onPause={pause}
        onStep={step}
        onReset={reset}
        onRunToEnd={() => run()}
        onSetEndTime={(time) => setParameters({ endTime: time })}
        onSetPlaySpeed={setPlaySpeed}
        onClearCircuit={handleClearCircuit}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onUpdateCircuitName={updateCircuitName}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Sidebar - Component Palette */}
          <ResizablePanel defaultSize={15} minSize={12} maxSize={25}>
            <ComponentPalette />
          </ResizablePanel>

          <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Center - Canvas and Waveform */}
          <ResizablePanel defaultSize={65}>
            <ResizablePanelGroup direction="vertical">
              {/* Circuit Canvas */}
              <ResizablePanel defaultSize={60} minSize={30}>
                <CircuitCanvas
                  components={circuit.components}
                  wires={circuit.wires}
                  canvasState={canvasState}
                  violations={simState.violations}
                  onSelectComponent={selectComponent}
                  onSelectWire={selectWire}
                  onUpdateComponentPosition={updateComponentPosition}
                  onStartWiring={startWiring}
                  onCompleteWiring={completeWiring}
                  onCancelWiring={cancelWiring}
                  onAddComponent={addComponent}
                  onZoom={setZoom}
                  onPan={setPan}
                />
              </ResizablePanel>

              <ResizableHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />

              {/* Waveform Viewer */}
              <ResizablePanel defaultSize={40} minSize={20}>
                <WaveformViewer
                  signals={simState.signals}
                  violations={simState.violations}
                  currentTime={simState.currentTime}
                  endTime={simState.endTime}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Right Sidebar - Properties & Timing Analysis */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={50} minSize={30}>
                <PropertiesPanel
                  component={selectedComponent}
                  wire={selectedWire}
                  onUpdatePattern={updateComponentPattern}
                  onUpdateTiming={updateComponentTiming}
                  onUpdateName={updateComponentName}
                  onRemoveComponent={removeComponent}
                  onRemoveWire={removeWire}
                />
              </ResizablePanel>
              <ResizableHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />
              <ResizablePanel defaultSize={50} minSize={20}>
                <TimingAnalysisPanel
                  violations={simState.violations}
                  components={circuit.components}
                  onSelectComponent={selectComponent}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <div className="h-6 px-4 flex items-center justify-between bg-muted/30 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Components: {circuit.components.length}</span>
          <span>Wires: {circuit.wires.length}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1 ${isPlaying ? 'text-accent' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'status-active' : 'status-inactive'}`} />
            {isPlaying ? 'Simulating' : 'Idle'}
          </span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default Index;
