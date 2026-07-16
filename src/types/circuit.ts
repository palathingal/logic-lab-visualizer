// Core simulation types - separated from UI for clean architecture

export type LogicValue = 0 | 1 | 'X';

export type GateType = 
  | 'AND' 
  | 'OR' 
  | 'NOT' 
  | 'NAND' 
  | 'NOR' 
  | 'XOR' 
  | 'XNOR'
  | 'BUFFER';

export type SequentialType = 
  | 'D_FF' 
  | 'JK_FF' 
  | 'SR_LATCH' 
  | 'D_LATCH'
  | 'REGISTER';

export type SourceType = 
  | 'INPUT' 
  | 'CLOCK' 
  | 'CONSTANT';

export type ComponentType = GateType | SequentialType | SourceType | 'OUTPUT' | 'CUSTOM';

// Custom component definition - stores an internal sub-circuit
export interface CustomComponentDef {
  id: string;
  name: string;
  internalCircuit: {
    components: CircuitComponent[];
    wires: Wire[];
  };
  inputPins: { name: string; internalComponentId: string; internalPinId: string }[];
  outputPins: { name: string; internalComponentId: string; internalPinId: string }[];
  pinConfiguration: Omit<Pin, 'id' | 'connectedWireId'>[];
  effectiveTiming?: {
    propagationDelay: number;
    riseTime: number;
    fallTime: number;
  };
}

export interface TimingParameters {
  propagationDelay: number; // nanoseconds
  riseTime: number;
  fallTime: number;
  setupTime?: number;
  holdTime?: number;
}

export interface LogicalEffortParams {
  intrinsicDelay: number;
  logicalEffort: number;
  parasiticDelay: number;
  loadCapacitance: number;
}

export interface Pin {
  id: string;
  name: string;
  type: 'input' | 'output';
  position: { x: number; y: number }; // Relative to component
  connectedWireId?: string;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  name: string;
  position: { x: number; y: number };
  pins: Pin[];
  timing: TimingParameters;
  logicalEffort?: LogicalEffortParams;
  // For sequential elements
  clockEdge?: 'rising' | 'falling';
  // For sources
  pattern?: InputPattern;
  // For custom components
  customComponentDefId?: string;
}

export interface Wire {
  id: string;
  sourceComponentId: string;
  sourcePinId: string;
  targetComponentId: string;
  targetPinId: string;
  waypoints?: { x: number; y: number }[];
}

export interface Circuit {
  id: string;
  name: string;
  components: CircuitComponent[];
  wires: Wire[];
  customComponents: CustomComponentDef[];
  metadata: {
    created: Date;
    modified: Date;
    version: string;
  };
}

// Signal and timing types
export interface SignalTransition {
  time: number; // nanoseconds
  value: LogicValue;
  isGlitch?: boolean;
}

export interface Signal {
  id: string;
  nodeId: string;
  nodeName: string;
  transitions: SignalTransition[];
}

export interface TimingViolation {
  type: 'setup' | 'hold' | 'glitch' | 'race';
  time: number;
  componentId: string;
  message: string;
  severity: 'warning' | 'error';
}

// Input pattern types
export interface InputPattern {
  type: 'static' | 'clock' | 'pulse' | 'waveform' | 'random';
  // For static
  value?: LogicValue;
  // For clock
  period?: number;
  dutyCycle?: number;
  phase?: number;
  startValue?: 0 | 1; // clock starting level at t=0
  // For pulse
  pulseWidth?: number;
  startTime?: number;
  // For waveform
  transitions?: { time: number; value: LogicValue }[];
}

// Simulation state
export interface SimulationState {
  isRunning: boolean;
  currentTime: number;
  endTime: number;
  timeStep: number;
  signals: Signal[];
  violations: TimingViolation[];
  eventQueue: SimulationEvent[];
}

export interface SimulationEvent {
  time: number;
  nodeId: string;
  newValue: LogicValue;
  source: 'input' | 'gate' | 'sequential';
}

// Canvas interaction state
export interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  selectedComponentId: string | null;
  selectedWireId: string | null;
  isWiring: boolean;
  wireStartPin: { componentId: string; pinId: string } | null;
  draggedComponent: string | null;
}

// Component definitions for the palette
export interface ComponentDefinition {
  type: ComponentType;
  name: string;
  category: 'gates' | 'sequential' | 'sources' | 'outputs';
  icon: string;
  defaultTiming: TimingParameters;
  pinConfiguration: Omit<Pin, 'id' | 'connectedWireId'>[];
  description: string;
}
