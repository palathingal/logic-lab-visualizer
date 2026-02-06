import {
  Circuit,
  CircuitComponent,
  LogicValue,
  Signal,
  SignalTransition,
  SimulationEvent,
  SimulationState,
  TimingViolation,
  Wire,
} from '@/types/circuit';

// Gate logic functions
const gateLogic: Record<string, (inputs: LogicValue[]) => LogicValue> = {
  AND: (inputs) => {
    if (inputs.some(v => v === 'X')) return 'X';
    return inputs.every(v => v === 1) ? 1 : 0;
  },
  OR: (inputs) => {
    if (inputs.some(v => v === 'X')) return 'X';
    return inputs.some(v => v === 1) ? 1 : 0;
  },
  NOT: (inputs) => {
    if (inputs[0] === 'X') return 'X';
    return inputs[0] === 1 ? 0 : 1;
  },
  NAND: (inputs) => {
    if (inputs.some(v => v === 'X')) return 'X';
    return inputs.every(v => v === 1) ? 0 : 1;
  },
  NOR: (inputs) => {
    if (inputs.some(v => v === 'X')) return 'X';
    return inputs.some(v => v === 1) ? 0 : 1;
  },
  XOR: (inputs) => {
    if (inputs.some(v => v === 'X')) return 'X';
    const sum = inputs.filter(v => v === 1).length;
    return (sum % 2 === 1) ? 1 : 0;
  },
  XNOR: (inputs) => {
    if (inputs.some(v => v === 'X')) return 'X';
    const sum = inputs.filter(v => v === 1).length;
    return (sum % 2 === 0) ? 1 : 0;
  },
  BUFFER: (inputs) => inputs[0],
};

export class SimulationEngine {
  private circuit: Circuit;
  private state: SimulationState;
  private nodeValues: Map<string, LogicValue>;
  private previousNodeValues: Map<string, LogicValue>;

  constructor() {
    this.circuit = { id: '', name: '', components: [], wires: [], metadata: { created: new Date(), modified: new Date(), version: '1.0' } };
    this.nodeValues = new Map();
    this.previousNodeValues = new Map();
    this.state = this.createInitialState();
  }

  private createInitialState(): SimulationState {
    return {
      isRunning: false,
      currentTime: 0,
      endTime: 100,
      timeStep: 0.1,
      signals: [],
      violations: [],
      eventQueue: [],
    };
  }

  loadCircuit(circuit: Circuit): void {
    this.circuit = circuit;
    this.nodeValues = new Map();
    this.previousNodeValues = new Map();
    this.state = this.createInitialState();
    
    // Initialize all nodes to X
    circuit.components.forEach(comp => {
      comp.pins.forEach(pin => {
        const nodeId = `${comp.id}.${pin.id}`;
        this.nodeValues.set(nodeId, 'X');
      });
    });

    // Initialize signals for all outputs and probes
    circuit.components.forEach(comp => {
      if (comp.type === 'OUTPUT' || comp.type === 'INPUT' || comp.type === 'CLOCK') {
        this.state.signals.push({
          id: comp.id,
          nodeId: comp.id,
          nodeName: comp.name,
          transitions: [{ time: 0, value: 'X' }],
        });
      }
    });
  }

  getState(): SimulationState {
    return { ...this.state };
  }

  private calculateDelay(component: CircuitComponent, fanout: number = 1): number {
    const baseDelay = component.timing.propagationDelay;
    
    if (component.logicalEffort) {
      // Logical effort delay model: d = g * h + p
      // where g = logical effort, h = electrical effort (fanout), p = parasitic delay
      const { logicalEffort, parasiticDelay, loadCapacitance } = component.logicalEffort;
      return logicalEffort * fanout * loadCapacitance + parasiticDelay;
    }
    
    // Simple linear fanout model
    return baseDelay * (1 + 0.1 * (fanout - 1));
  }

  private getInputValues(component: CircuitComponent): LogicValue[] {
    const inputPins = component.pins.filter(p => p.type === 'input');
    return inputPins.map(pin => {
      const wire = this.circuit.wires.find(w => 
        w.targetComponentId === component.id && w.targetPinId === pin.id
      );
      if (!wire) return 'X';
      return this.nodeValues.get(`${wire.sourceComponentId}.${wire.sourcePinId}`) ?? 'X';
    });
  }

  private evaluateGate(component: CircuitComponent): LogicValue {
    const inputs = this.getInputValues(component);
    const logic = gateLogic[component.type];
    if (!logic) return 'X';
    return logic(inputs);
  }

  private evaluateSequential(component: CircuitComponent, clockEdge: boolean): LogicValue | null {
    if (!clockEdge) return null;
    
    const inputs = this.getInputValues(component);
    
    switch (component.type) {
      case 'D_FF': {
        const [d] = inputs;
        // Check for timing violations
        if (component.timing.setupTime !== undefined) {
          // Setup time check would go here
        }
        return d;
      }
      case 'JK_FF': {
        const [j, , k] = inputs;
        const currentQ = this.nodeValues.get(`${component.id}.Q`) ?? 0;
        if (j === 1 && k === 1) return currentQ === 1 ? 0 : 1; // Toggle
        if (j === 1) return 1;
        if (k === 1) return 0;
        return currentQ as LogicValue;
      }
      case 'SR_LATCH': {
        const [s, r] = inputs;
        if (s === 1 && r === 1) return 'X'; // Invalid state
        if (s === 1) return 1;
        if (r === 1) return 0;
        return this.nodeValues.get(`${component.id}.Q`) ?? 'X';
      }
      case 'D_LATCH': {
        const [d, en] = inputs;
        if (en === 1) return d;
        return this.nodeValues.get(`${component.id}.Q`) ?? 'X';
      }
      default:
        return 'X';
    }
  }

  private generateInputValue(component: CircuitComponent, time: number): LogicValue {
    const pattern = component.pattern;
    if (!pattern) return 0;

    switch (pattern.type) {
      case 'static':
        return pattern.value ?? 0;
      case 'clock': {
        const period = pattern.period ?? 10;
        const duty = pattern.dutyCycle ?? 0.5;
        const phase = pattern.phase ?? 0;
        const t = (time + phase) % period;
        return t < period * duty ? 1 : 0;
      }
      case 'pulse': {
        const start = pattern.startTime ?? 0;
        const width = pattern.pulseWidth ?? 5;
        return (time >= start && time < start + width) ? 1 : 0;
      }
      case 'waveform': {
        if (!pattern.transitions) return 0;
        let currentValue: LogicValue = 0;
        for (const t of pattern.transitions) {
          if (time >= t.time) currentValue = t.value;
          else break;
        }
        return currentValue;
      }
      default:
        return 0;
    }
  }

  private scheduleEvent(time: number, nodeId: string, value: LogicValue, source: 'input' | 'gate' | 'sequential'): void {
    const event: SimulationEvent = { time, nodeId, newValue: value, source };
    
    // Insert in sorted order
    const idx = this.state.eventQueue.findIndex(e => e.time > time);
    if (idx === -1) {
      this.state.eventQueue.push(event);
    } else {
      this.state.eventQueue.splice(idx, 0, event);
    }
  }

  private recordTransition(componentId: string, value: LogicValue, time: number, isGlitch: boolean = false): void {
    const signal = this.state.signals.find(s => s.nodeId === componentId);
    if (signal) {
      const lastTransition = signal.transitions[signal.transitions.length - 1];
      if (!lastTransition || lastTransition.value !== value) {
        signal.transitions.push({ time, value, isGlitch });
      }
    }
  }

  step(): boolean {
    if (this.state.currentTime >= this.state.endTime) {
      this.state.isRunning = false;
      return false;
    }

    this.previousNodeValues = new Map(this.nodeValues);

    // Process input sources
    this.circuit.components.forEach(comp => {
      if (comp.type === 'INPUT' || comp.type === 'CLOCK' || comp.type === 'CONSTANT') {
        const value = this.generateInputValue(comp, this.state.currentTime);
        const outputPin = comp.pins.find(p => p.type === 'output');
        if (outputPin) {
          const nodeId = `${comp.id}.${outputPin.id}`;
          const prevValue = this.nodeValues.get(nodeId);
          this.nodeValues.set(nodeId, value);
          if (prevValue !== value) {
            this.recordTransition(comp.id, value, this.state.currentTime);
          }
        }
      }
    });

    // Evaluate gates (with propagation delay consideration)
    this.circuit.components.forEach(comp => {
      if (comp.type in gateLogic) {
        const outputPin = comp.pins.find(p => p.type === 'output');
        if (outputPin) {
          const newValue = this.evaluateGate(comp);
          const nodeId = `${comp.id}.${outputPin.id}`;
          const prevValue = this.nodeValues.get(nodeId);
          
          // For now, apply immediately (TODO: add event queue for delays)
          this.nodeValues.set(nodeId, newValue);
          
          if (prevValue !== newValue) {
            // Check for glitches
            const isGlitch = this.state.currentTime > 0 && 
              this.previousNodeValues.get(nodeId) === newValue;
            this.recordTransition(comp.id, newValue, this.state.currentTime, isGlitch);
          }
        }
      }
    });

    // Evaluate sequential elements
    this.circuit.components.forEach(comp => {
      if (['D_FF', 'JK_FF', 'SR_LATCH', 'D_LATCH'].includes(comp.type)) {
        // Detect clock edge
        const clkPin = comp.pins.find(p => p.name === 'CLK' || p.name === 'EN');
        let clockEdge = false;
        
        if (clkPin) {
          const wire = this.circuit.wires.find(w => 
            w.targetComponentId === comp.id && w.targetPinId === clkPin.id
          );
          if (wire) {
            const clkNodeId = `${wire.sourceComponentId}.${wire.sourcePinId}`;
            const prevClk = this.previousNodeValues.get(clkNodeId);
            const currClk = this.nodeValues.get(clkNodeId);
            clockEdge = prevClk === 0 && currClk === 1; // Rising edge
          }
        }

        const newQ = this.evaluateSequential(comp, clockEdge);
        if (newQ !== null) {
          const qPin = comp.pins.find(p => p.name === 'Q');
          const qBarPin = comp.pins.find(p => p.name === 'Q̄');
          
          if (qPin) {
            this.nodeValues.set(`${comp.id}.${qPin.id}`, newQ);
            this.recordTransition(comp.id, newQ, this.state.currentTime);
          }
          if (qBarPin) {
            const qBar: LogicValue = newQ === 'X' ? 'X' : (newQ === 1 ? 0 : 1);
            this.nodeValues.set(`${comp.id}.${qBarPin.id}`, qBar);
          }
        }
      }
    });

    // Update output probes
    this.circuit.components.forEach(comp => {
      if (comp.type === 'OUTPUT') {
        const inputPin = comp.pins.find(p => p.type === 'input');
        if (inputPin) {
          const wire = this.circuit.wires.find(w => 
            w.targetComponentId === comp.id && w.targetPinId === inputPin.id
          );
          if (wire) {
            const value = this.nodeValues.get(`${wire.sourceComponentId}.${wire.sourcePinId}`) ?? 'X';
            const prevValue = this.previousNodeValues.get(`${comp.id}.value`);
            if (prevValue !== value) {
              this.recordTransition(comp.id, value, this.state.currentTime);
            }
            this.nodeValues.set(`${comp.id}.value`, value);
          }
        }
      }
    });

    this.state.currentTime += this.state.timeStep;
    return true;
  }

  run(endTime?: number): SimulationState {
    if (endTime !== undefined) {
      this.state.endTime = endTime;
    }
    
    this.state.isRunning = true;
    while (this.step()) {
      // Continue simulation
    }
    
    return this.getState();
  }

  reset(): void {
    this.state = this.createInitialState();
    this.nodeValues = new Map();
    this.previousNodeValues = new Map();
    
    // Re-initialize
    this.circuit.components.forEach(comp => {
      comp.pins.forEach(pin => {
        this.nodeValues.set(`${comp.id}.${pin.id}`, 'X');
      });
    });
  }

  getNodeValue(componentId: string, pinId: string): LogicValue {
    return this.nodeValues.get(`${componentId}.${pinId}`) ?? 'X';
  }

  setSimulationParameters(params: Partial<Pick<SimulationState, 'endTime' | 'timeStep'>>): void {
    if (params.endTime !== undefined) this.state.endTime = params.endTime;
    if (params.timeStep !== undefined) this.state.timeStep = params.timeStep;
  }
}

// Singleton instance for global access
export const simulationEngine = new SimulationEngine();
