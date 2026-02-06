import { ComponentDefinition, TimingParameters } from '@/types/circuit';

const defaultGateTiming: TimingParameters = {
  propagationDelay: 2,
  riseTime: 0.5,
  fallTime: 0.5,
};

const defaultSequentialTiming: TimingParameters = {
  propagationDelay: 3,
  riseTime: 0.5,
  fallTime: 0.5,
  setupTime: 1,
  holdTime: 0.5,
};

export const componentDefinitions: ComponentDefinition[] = [
  // Logic Gates
  {
    type: 'AND',
    name: 'AND Gate',
    category: 'gates',
    icon: 'AND',
    defaultTiming: defaultGateTiming,
    pinConfiguration: [
      { name: 'A', type: 'input', position: { x: 0, y: 15 } },
      { name: 'B', type: 'input', position: { x: 0, y: 35 } },
      { name: 'Y', type: 'output', position: { x: 60, y: 25 } },
    ],
    description: 'Output high only when all inputs are high',
  },
  {
    type: 'OR',
    name: 'OR Gate',
    category: 'gates',
    icon: 'OR',
    defaultTiming: defaultGateTiming,
    pinConfiguration: [
      { name: 'A', type: 'input', position: { x: 0, y: 15 } },
      { name: 'B', type: 'input', position: { x: 0, y: 35 } },
      { name: 'Y', type: 'output', position: { x: 60, y: 25 } },
    ],
    description: 'Output high when any input is high',
  },
  {
    type: 'NOT',
    name: 'NOT Gate',
    category: 'gates',
    icon: 'NOT',
    defaultTiming: { ...defaultGateTiming, propagationDelay: 1 },
    pinConfiguration: [
      { name: 'A', type: 'input', position: { x: 0, y: 20 } },
      { name: 'Y', type: 'output', position: { x: 50, y: 20 } },
    ],
    description: 'Inverts the input signal',
  },
  {
    type: 'NAND',
    name: 'NAND Gate',
    category: 'gates',
    icon: 'NAND',
    defaultTiming: defaultGateTiming,
    pinConfiguration: [
      { name: 'A', type: 'input', position: { x: 0, y: 15 } },
      { name: 'B', type: 'input', position: { x: 0, y: 35 } },
      { name: 'Y', type: 'output', position: { x: 60, y: 25 } },
    ],
    description: 'AND gate with inverted output',
  },
  {
    type: 'NOR',
    name: 'NOR Gate',
    category: 'gates',
    icon: 'NOR',
    defaultTiming: defaultGateTiming,
    pinConfiguration: [
      { name: 'A', type: 'input', position: { x: 0, y: 15 } },
      { name: 'B', type: 'input', position: { x: 0, y: 35 } },
      { name: 'Y', type: 'output', position: { x: 60, y: 25 } },
    ],
    description: 'OR gate with inverted output',
  },
  {
    type: 'XOR',
    name: 'XOR Gate',
    category: 'gates',
    icon: 'XOR',
    defaultTiming: { ...defaultGateTiming, propagationDelay: 3 },
    pinConfiguration: [
      { name: 'A', type: 'input', position: { x: 0, y: 15 } },
      { name: 'B', type: 'input', position: { x: 0, y: 35 } },
      { name: 'Y', type: 'output', position: { x: 60, y: 25 } },
    ],
    description: 'Output high when inputs differ',
  },
  {
    type: 'XNOR',
    name: 'XNOR Gate',
    category: 'gates',
    icon: 'XNOR',
    defaultTiming: { ...defaultGateTiming, propagationDelay: 3 },
    pinConfiguration: [
      { name: 'A', type: 'input', position: { x: 0, y: 15 } },
      { name: 'B', type: 'input', position: { x: 0, y: 35 } },
      { name: 'Y', type: 'output', position: { x: 60, y: 25 } },
    ],
    description: 'Output high when inputs are equal',
  },
  {
    type: 'BUFFER',
    name: 'Buffer',
    category: 'gates',
    icon: 'BUF',
    defaultTiming: { ...defaultGateTiming, propagationDelay: 1 },
    pinConfiguration: [
      { name: 'A', type: 'input', position: { x: 0, y: 20 } },
      { name: 'Y', type: 'output', position: { x: 50, y: 20 } },
    ],
    description: 'Signal buffer for fan-out',
  },

  // Sequential Elements
  {
    type: 'D_FF',
    name: 'D Flip-Flop',
    category: 'sequential',
    icon: 'DFF',
    defaultTiming: defaultSequentialTiming,
    pinConfiguration: [
      { name: 'D', type: 'input', position: { x: 0, y: 15 } },
      { name: 'CLK', type: 'input', position: { x: 0, y: 35 } },
      { name: 'Q', type: 'output', position: { x: 70, y: 15 } },
      { name: 'Q̄', type: 'output', position: { x: 70, y: 35 } },
    ],
    description: 'Edge-triggered D flip-flop',
  },
  {
    type: 'JK_FF',
    name: 'JK Flip-Flop',
    category: 'sequential',
    icon: 'JKFF',
    defaultTiming: defaultSequentialTiming,
    pinConfiguration: [
      { name: 'J', type: 'input', position: { x: 0, y: 10 } },
      { name: 'CLK', type: 'input', position: { x: 0, y: 25 } },
      { name: 'K', type: 'input', position: { x: 0, y: 40 } },
      { name: 'Q', type: 'output', position: { x: 70, y: 15 } },
      { name: 'Q̄', type: 'output', position: { x: 70, y: 35 } },
    ],
    description: 'JK flip-flop with toggle capability',
  },
  {
    type: 'SR_LATCH',
    name: 'SR Latch',
    category: 'sequential',
    icon: 'SR',
    defaultTiming: { ...defaultSequentialTiming, setupTime: undefined, holdTime: undefined },
    pinConfiguration: [
      { name: 'S', type: 'input', position: { x: 0, y: 15 } },
      { name: 'R', type: 'input', position: { x: 0, y: 35 } },
      { name: 'Q', type: 'output', position: { x: 70, y: 15 } },
      { name: 'Q̄', type: 'output', position: { x: 70, y: 35 } },
    ],
    description: 'Set-Reset latch (level-sensitive)',
  },
  {
    type: 'D_LATCH',
    name: 'D Latch',
    category: 'sequential',
    icon: 'DL',
    defaultTiming: { ...defaultSequentialTiming, setupTime: undefined, holdTime: undefined },
    pinConfiguration: [
      { name: 'D', type: 'input', position: { x: 0, y: 15 } },
      { name: 'EN', type: 'input', position: { x: 0, y: 35 } },
      { name: 'Q', type: 'output', position: { x: 70, y: 15 } },
      { name: 'Q̄', type: 'output', position: { x: 70, y: 35 } },
    ],
    description: 'Transparent D latch',
  },

  // Sources
  {
    type: 'INPUT',
    name: 'Input',
    category: 'sources',
    icon: 'IN',
    defaultTiming: { propagationDelay: 0, riseTime: 0.1, fallTime: 0.1 },
    pinConfiguration: [
      { name: 'OUT', type: 'output', position: { x: 40, y: 20 } },
    ],
    description: 'User-controllable input signal',
  },
  {
    type: 'CLOCK',
    name: 'Clock',
    category: 'sources',
    icon: 'CLK',
    defaultTiming: { propagationDelay: 0, riseTime: 0.1, fallTime: 0.1 },
    pinConfiguration: [
      { name: 'OUT', type: 'output', position: { x: 40, y: 20 } },
    ],
    description: 'Configurable clock source',
  },
  {
    type: 'CONSTANT',
    name: 'Constant',
    category: 'sources',
    icon: '0/1',
    defaultTiming: { propagationDelay: 0, riseTime: 0, fallTime: 0 },
    pinConfiguration: [
      { name: 'OUT', type: 'output', position: { x: 40, y: 20 } },
    ],
    description: 'Fixed logic level (0 or 1)',
  },

  // Outputs
  {
    type: 'OUTPUT',
    name: 'Output',
    category: 'outputs',
    icon: 'OUT',
    defaultTiming: { propagationDelay: 0, riseTime: 0, fallTime: 0 },
    pinConfiguration: [
      { name: 'IN', type: 'input', position: { x: 0, y: 20 } },
    ],
    description: 'Output probe for waveform viewing',
  },
];

export const getComponentDefinition = (type: string): ComponentDefinition | undefined => {
  return componentDefinitions.find(def => def.type === type);
};

export const getComponentsByCategory = (category: string): ComponentDefinition[] => {
  return componentDefinitions.filter(def => def.category === category);
};
