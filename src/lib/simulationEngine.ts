import {
  Circuit,
  CircuitComponent,
  CustomComponentDef,
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
  private lastDataChangeTime: Map<string, number>;
  private lastClockEdgeTime: Map<string, number>;
  private pendingEvents: SimulationEvent[]; // Delay-based event queue

  constructor() {
    this.circuit = { id: '', name: '', components: [], wires: [], customComponents: [], metadata: { created: new Date(), modified: new Date(), version: '1.0' } };
    this.nodeValues = new Map();
    this.previousNodeValues = new Map();
    this.lastDataChangeTime = new Map();
    this.lastClockEdgeTime = new Map();
    this.pendingEvents = [];
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
    this.lastDataChangeTime = new Map();
    this.lastClockEdgeTime = new Map();
    this.pendingEvents = [];
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

  private checkSetupViolation(component: CircuitComponent, dataChangeTime: number, clockEdgeTime: number): boolean {
    const setupTime = component.timing.setupTime ?? 0;
    if (setupTime <= 0) return false;
    
    const timeBetween = clockEdgeTime - dataChangeTime;
    return timeBetween < setupTime && timeBetween >= 0;
  }

  private checkHoldViolation(component: CircuitComponent, dataChangeTime: number, clockEdgeTime: number): boolean {
    const holdTime = component.timing.holdTime ?? 0;
    if (holdTime <= 0) return false;
    
    const timeSinceClock = dataChangeTime - clockEdgeTime;
    return timeSinceClock >= 0 && timeSinceClock < holdTime;
  }

  private addViolation(type: TimingViolation['type'], componentId: string, time: number, message: string, severity: 'warning' | 'error' = 'error'): void {
    // Avoid duplicate violations at same time
    const exists = this.state.violations.some(
      v => v.componentId === componentId && v.type === type && Math.abs(v.time - time) < 0.1
    );
    if (!exists) {
      this.state.violations.push({ type, time, componentId, message, severity });
    }
  }

  getState(): SimulationState {
    return { ...this.state };
  }

  private calculateDelay(component: CircuitComponent, fanout: number = 1): number {
    const baseDelay = component.timing.propagationDelay;
    
    if (baseDelay <= 0) return 0;

    if (component.logicalEffort) {
      const { logicalEffort, parasiticDelay, loadCapacitance } = component.logicalEffort;
      return logicalEffort * fanout * loadCapacitance + parasiticDelay;
    }
    
    // Simple linear fanout model
    return baseDelay * (1 + 0.1 * (fanout - 1));
  }

  private getFanout(component: CircuitComponent): number {
    const outputPin = component.pins.find(p => p.type === 'output');
    if (!outputPin) return 1;
    return Math.max(1, this.circuit.wires.filter(w =>
      w.sourceComponentId === component.id && w.sourcePinId === outputPin.id
    ).length);
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

  /**
   * Evaluate a CUSTOM component by running its internal sub-circuit combinationally.
   * Maps external input values → internal circuit → external output values.
   */
  private evaluateCustomComponent(component: CircuitComponent): Map<string, LogicValue> {
    const results = new Map<string, LogicValue>();
    const customDef = this.circuit.customComponents.find(c => c.id === component.customComponentDefId);
    if (!customDef) return results;

    const { components: intComps, wires: intWires } = customDef.internalCircuit;

    // Internal node values for this evaluation
    const intValues = new Map<string, LogicValue>();

    // Initialize all internal nodes to X
    intComps.forEach(ic => {
      ic.pins.forEach(p => {
        intValues.set(`${ic.id}.${p.id}`, 'X');
      });
    });

    // Map external inputs → internal input pins
    const extInputPins = component.pins.filter(p => p.type === 'input');
    extInputPins.forEach((extPin, idx) => {
      if (idx < customDef.inputPins.length) {
        const mapping = customDef.inputPins[idx];
        const extWire = this.circuit.wires.find(w =>
          w.targetComponentId === component.id && w.targetPinId === extPin.id
        );
        const extValue = extWire
          ? (this.nodeValues.get(`${extWire.sourceComponentId}.${extWire.sourcePinId}`) ?? 'X')
          : 'X';

        // Find the internal component's input pin and set the driving output that feeds it,
        // or if the internal component IS an INPUT source, set its output directly
        const intComp = intComps.find(c => c.id === mapping.internalComponentId);
        if (intComp) {
          if (intComp.type === 'INPUT' || intComp.type === 'CONSTANT') {
            // Drive the output pin of the internal INPUT component
            const outPin = intComp.pins.find(p => p.type === 'output');
            if (outPin) intValues.set(`${intComp.id}.${outPin.id}`, extValue);
          } else {
            // Drive the specific input pin directly via a virtual source
            intValues.set(`${intComp.id}.${mapping.internalPinId}`, extValue);
          }
        }
      }
    });

    // Iteratively propagate through internal gates (simple fixed-point)
    const maxIterations = intComps.length * 2 + 5;
    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;

      intComps.forEach(ic => {
        if (ic.type in gateLogic) {
          const inputPins = ic.pins.filter(p => p.type === 'input');
          const inputs = inputPins.map(pin => {
            const wire = intWires.find(w => w.targetComponentId === ic.id && w.targetPinId === pin.id);
            if (!wire) {
              // Check if this pin was directly driven by external mapping
              return intValues.get(`${ic.id}.${pin.id}`) ?? 'X';
            }
            return intValues.get(`${wire.sourceComponentId}.${wire.sourcePinId}`) ?? 'X';
          });

          const logic = gateLogic[ic.type];
          if (logic) {
            const newVal = logic(inputs);
            const outPin = ic.pins.find(p => p.type === 'output');
            if (outPin) {
              const nodeId = `${ic.id}.${outPin.id}`;
              if (intValues.get(nodeId) !== newVal) {
                intValues.set(nodeId, newVal);
                changed = true;
              }
            }
          }
        } else if (ic.type === 'BUFFER') {
          const inputPins = ic.pins.filter(p => p.type === 'input');
          const wire = intWires.find(w => w.targetComponentId === ic.id && w.targetPinId === inputPins[0]?.id);
          const val = wire
            ? (intValues.get(`${wire.sourceComponentId}.${wire.sourcePinId}`) ?? 'X')
            : (intValues.get(`${ic.id}.${inputPins[0]?.id}`) ?? 'X');
          const outPin = ic.pins.find(p => p.type === 'output');
          if (outPin) {
            const nodeId = `${ic.id}.${outPin.id}`;
            if (intValues.get(nodeId) !== val) {
              intValues.set(nodeId, val);
              changed = true;
            }
          }
        }
      });

      if (!changed) break;
    }

    // Map internal output pins → external output pins
    const extOutputPins = component.pins.filter(p => p.type === 'output');
    extOutputPins.forEach((extPin, idx) => {
      if (idx < customDef.outputPins.length) {
        const mapping = customDef.outputPins[idx];
        const val = intValues.get(`${mapping.internalComponentId}.${mapping.internalPinId}`) ?? 'X';
        results.set(extPin.id, val);
      }
    });

    return results;
  }

  private evaluateSequential(component: CircuitComponent, clockEdge: boolean): LogicValue | null {
    const inputs = this.getInputValues(component);
    
    // For D_FF and JK_FF, check timing violations on clock edge
    if (['D_FF', 'JK_FF'].includes(component.type) && clockEdge) {
      // Get the data input wire
      const dataPin = component.pins.find(p => p.name === 'D' || p.name === 'J');
      if (dataPin) {
        const wire = this.circuit.wires.find(w => 
          w.targetComponentId === component.id && w.targetPinId === dataPin.id
        );
        if (wire) {
          const dataNodeId = `${wire.sourceComponentId}.${wire.sourcePinId}`;
          const lastDataChange = this.lastDataChangeTime.get(dataNodeId) ?? 0;
          
          // Setup time check
          if (this.checkSetupViolation(component, lastDataChange, this.state.currentTime)) {
            this.addViolation(
              'setup',
              component.id,
              this.state.currentTime,
              `Setup time violation: Data changed ${(this.state.currentTime - lastDataChange).toFixed(2)}ns before clock edge (required: ${component.timing.setupTime}ns)`,
              'error'
            );
          }

          // Hold time check - check if data changed too soon after last clock edge
          const lastClockEdge = this.lastClockEdgeTime.get(component.id) ?? 0;
          if (lastClockEdge > 0 && this.checkHoldViolation(component, lastDataChange, lastClockEdge)) {
            this.addViolation(
              'hold',
              component.id,
              lastDataChange,
              `Hold time violation: Data changed ${(lastDataChange - lastClockEdge).toFixed(2)}ns after clock edge (required: ${component.timing.holdTime}ns)`,
              'error'
            );
          }
        }
      }

      // Record this clock edge time
      this.lastClockEdgeTime.set(component.id, this.state.currentTime);
    }

    if (!clockEdge && !['SR_LATCH', 'D_LATCH'].includes(component.type)) return null;
    
    // Helper to get current Q value using actual pin ID
    const getQ = (): LogicValue => {
      const qPin = component.pins.find(p => p.name === 'Q');
      if (!qPin) return 'X';
      return this.nodeValues.get(`${component.id}.${qPin.id}`) ?? 'X';
    };

    switch (component.type) {
      case 'D_FF': {
        const [d] = inputs;
        return d;
      }
      case 'JK_FF': {
        const [j, , k] = inputs;
        const currentQ = getQ();
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
        return getQ();
      }
      case 'D_LATCH': {
        const [d, en] = inputs;
        if (en === 1) return d;
        return getQ();
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

    // 1. Process all pending events whose time has arrived
    const readyEvents: SimulationEvent[] = [];
    this.pendingEvents = this.pendingEvents.filter(ev => {
      if (ev.time <= this.state.currentTime) {
        readyEvents.push(ev);
        return false;
      }
      return true;
    });

    // Apply pending delayed events
    for (const ev of readyEvents) {
      const prevValue = this.nodeValues.get(ev.nodeId);
      if (prevValue !== ev.newValue) {
        this.nodeValues.set(ev.nodeId, ev.newValue);
        this.lastDataChangeTime.set(ev.nodeId, this.state.currentTime);

        // Find the component that owns this node to record transition
        const [compId] = ev.nodeId.split('.');
        const comp = this.circuit.components.find(c => c.id === compId);
        if (comp) {
          // Check for glitch: value bounced back to what it was before
          const isGlitch = this.state.currentTime > 0 &&
            this.previousNodeValues.get(ev.nodeId) === ev.newValue;
          if (isGlitch) {
            this.addViolation('glitch', comp.id, this.state.currentTime,
              `Glitch detected: Output oscillated at ${this.state.currentTime.toFixed(2)}ns`, 'warning');
          }
          this.recordTransition(comp.id, ev.newValue, this.state.currentTime, isGlitch);
        }
      }
    }

    // 2. Process input sources (inputs have zero delay — they drive the circuit)
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
            this.lastDataChangeTime.set(nodeId, this.state.currentTime);
          }
        }
      }
    });

    // 3. Evaluate combinational gates — schedule output changes with propagation delay
    this.circuit.components.forEach(comp => {
      if (comp.type in gateLogic) {
        const outputPin = comp.pins.find(p => p.type === 'output');
        if (outputPin) {
          const newValue = this.evaluateGate(comp);
          const nodeId = `${comp.id}.${outputPin.id}`;
          const currentValue = this.nodeValues.get(nodeId);

          // Check if there's already a pending event for this node
          const existingPending = this.pendingEvents.find(e => e.nodeId === nodeId);

          if (existingPending) {
            // If the desired output changed while an event is in-flight, update the pending event's value
            // but do NOT reset its scheduled time (preserves the original delay timing)
            if (existingPending.newValue !== newValue) {
              existingPending.newValue = newValue;
            }
            // If pending value matches current nodeValue, cancel the event (input reverted)
            if (newValue === currentValue) {
              this.pendingEvents = this.pendingEvents.filter(e => e.nodeId !== nodeId);
            }
          } else if (currentValue !== newValue) {
            const fanout = this.getFanout(comp);
            const delay = this.calculateDelay(comp, fanout);

            if (delay <= 0) {
              // Zero delay — apply immediately
              this.nodeValues.set(nodeId, newValue);
              this.lastDataChangeTime.set(nodeId, this.state.currentTime);
              const isGlitch = this.state.currentTime > 0 &&
                this.previousNodeValues.get(nodeId) === newValue;
              if (isGlitch) {
                this.addViolation('glitch', comp.id, this.state.currentTime,
                  `Glitch detected: Output oscillated at ${this.state.currentTime.toFixed(2)}ns`, 'warning');
              }
              this.recordTransition(comp.id, newValue, this.state.currentTime, isGlitch);
            } else {
              // Schedule the output change after propagation delay
              const eventTime = this.state.currentTime + delay;
              this.pendingEvents.push({
                time: eventTime,
                nodeId,
                newValue,
                source: 'gate',
              });
            }
          }
        }
      }
    });

    // 3b. Evaluate CUSTOM components — run internal sub-circuit and schedule outputs
    this.circuit.components.forEach(comp => {
      if (comp.type === 'CUSTOM' && comp.customComponentDefId) {
        const outputValues = this.evaluateCustomComponent(comp);
        outputValues.forEach((newValue, pinId) => {
          const nodeId = `${comp.id}.${pinId}`;
          const currentValue = this.nodeValues.get(nodeId);
          const existingPending = this.pendingEvents.find(e => e.nodeId === nodeId);

          if (existingPending) {
            if (existingPending.newValue !== newValue) {
              existingPending.newValue = newValue;
            }
            if (newValue === currentValue) {
              this.pendingEvents = this.pendingEvents.filter(e => e.nodeId !== nodeId);
            }
          } else if (currentValue !== newValue) {
            const delay = comp.timing.propagationDelay;
            if (delay <= 0) {
              this.nodeValues.set(nodeId, newValue);
              this.lastDataChangeTime.set(nodeId, this.state.currentTime);
              this.recordTransition(comp.id, newValue, this.state.currentTime);
            } else {
              this.pendingEvents.push({
                time: this.state.currentTime + delay,
                nodeId,
                newValue,
                source: 'gate',
              });
            }
          }
        });
      }
    });

    // 4. Evaluate sequential elements
    this.circuit.components.forEach(comp => {
      if (['D_FF', 'JK_FF', 'SR_LATCH', 'D_LATCH'].includes(comp.type)) {
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
            clockEdge = prevClk === 0 && currClk === 1;
          }
        }

        const newQ = this.evaluateSequential(comp, clockEdge);
        if (newQ !== null) {
          const qPin = comp.pins.find(p => p.name === 'Q');
          const qBarPin = comp.pins.find(p => p.name === 'Q̄');
          const delay = comp.timing.propagationDelay;

          if (qPin) {
            const qNodeId = `${comp.id}.${qPin.id}`;
            if (delay > 0 && clockEdge) {
              this.pendingEvents = this.pendingEvents.filter(e => e.nodeId !== qNodeId);
              this.pendingEvents.push({ time: this.state.currentTime + delay, nodeId: qNodeId, newValue: newQ, source: 'sequential' });
            } else {
              this.nodeValues.set(qNodeId, newQ);
              this.recordTransition(comp.id, newQ, this.state.currentTime);
            }
          }
          if (qBarPin) {
            const qBar: LogicValue = newQ === 'X' ? 'X' : (newQ === 1 ? 0 : 1);
            const qBarNodeId = `${comp.id}.${qBarPin.id}`;
            if (delay > 0 && clockEdge) {
              this.pendingEvents = this.pendingEvents.filter(e => e.nodeId !== qBarNodeId);
              this.pendingEvents.push({ time: this.state.currentTime + delay, nodeId: qBarNodeId, newValue: qBar, source: 'sequential' });
            } else {
              this.nodeValues.set(qBarNodeId, qBar);
            }
          }
        }
      }
    });

    // 5. Update output probes
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
    this.lastDataChangeTime = new Map();
    this.lastClockEdgeTime = new Map();
    this.pendingEvents = [];
    
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
