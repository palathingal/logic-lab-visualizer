import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '@/lib/simulationEngine';
import { Circuit, CircuitComponent, Wire } from '@/types/circuit';

function makeCircuit(components: CircuitComponent[], wires: Wire[]): Circuit {
  return {
    id: 'test',
    name: 'Test',
    components,
    wires,
    customComponents: [],
    metadata: { created: new Date(), modified: new Date(), version: '1.0' },
  };
}

describe('D Flip-Flop', () => {
  it('should capture D on rising clock edge and hold Q when clock is low', () => {
    const clk: CircuitComponent = {
      id: 'clk1',
      type: 'CLOCK',
      name: 'CLK',
      position: { x: 0, y: 0 },
      pins: [{ id: 'pin_0', name: 'OUT', type: 'output', position: { x: 40, y: 20 } }],
      timing: { propagationDelay: 0, riseTime: 0.1, fallTime: 0.1 },
      pattern: { type: 'clock', period: 10, dutyCycle: 0.5, startValue: 1 },
    };

    const input: CircuitComponent = {
      id: 'in1',
      type: 'INPUT',
      name: 'D_in',
      position: { x: 0, y: 100 },
      pins: [{ id: 'pin_0', name: 'OUT', type: 'output', position: { x: 40, y: 20 } }],
      timing: { propagationDelay: 0, riseTime: 0.1, fallTime: 0.1 },
      // D=1 from time 0 to 15, then D=0
      pattern: { type: 'waveform', transitions: [{ time: 0, value: 1 }, { time: 15, value: 0 }] },
    };

    const dff: CircuitComponent = {
      id: 'dff1',
      type: 'D_FF',
      name: 'DFF',
      position: { x: 200, y: 50 },
      pins: [
        { id: 'pin_0', name: 'D', type: 'input', position: { x: 0, y: 15 } },
        { id: 'pin_1', name: 'CLK', type: 'input', position: { x: 0, y: 35 } },
        { id: 'pin_2', name: 'Q', type: 'output', position: { x: 70, y: 15 } },
        { id: 'pin_3', name: 'Q̄', type: 'output', position: { x: 70, y: 35 } },
      ],
      timing: { propagationDelay: 0, riseTime: 0.5, fallTime: 0.5, setupTime: 1, holdTime: 0.5 },
      clockEdge: 'rising',
    };

    const output: CircuitComponent = {
      id: 'out1',
      type: 'OUTPUT',
      name: 'Q_out',
      position: { x: 400, y: 50 },
      pins: [{ id: 'pin_0', name: 'IN', type: 'input', position: { x: 0, y: 20 } }],
      timing: { propagationDelay: 0, riseTime: 0, fallTime: 0 },
    };

    const wires: Wire[] = [
      { id: 'w1', sourceComponentId: 'in1', sourcePinId: 'pin_0', targetComponentId: 'dff1', targetPinId: 'pin_0' },
      { id: 'w2', sourceComponentId: 'clk1', sourcePinId: 'pin_0', targetComponentId: 'dff1', targetPinId: 'pin_1' },
      { id: 'w3', sourceComponentId: 'dff1', sourcePinId: 'pin_2', targetComponentId: 'out1', targetPinId: 'pin_0' },
    ];

    const circuit = makeCircuit([clk, input, dff, output], wires);
    const engine = new SimulationEngine();
    engine.loadCircuit(circuit);
    engine.setSimulationParameters({ endTime: 30, timeStep: 0.1 });

    const finalState = engine.run();

    // CLK: period=10, duty=0.5 → high [0,5), low [5,10), high [10,15), low [15,20), high [20,25)
    // Rising edges at t=0, t=10, t=20
    // D=1 from t=0..15, D=0 from t=15+
    
    // At t=0: rising edge, D=1 → Q=1 (delay=0 so immediate)
    // At t=5: clock goes low, Q should HOLD at 1
    // At t=10: rising edge, D=1 → Q=1
    // At t=15: D changes to 0, but no clock edge → Q should HOLD at 1
    // At t=20: rising edge, D=0 → Q=0

    const qSignal = finalState.signals.find(s => s.nodeName === 'Q_out');
    expect(qSignal).toBeDefined();
    
    console.log('Q transitions:', JSON.stringify(qSignal!.transitions));

    // Check Q value at various times by finding the last transition before that time
    const getQAt = (time: number) => {
      let val = qSignal!.transitions[0]?.value;
      for (const t of qSignal!.transitions) {
        if (t.time <= time) val = t.value;
        else break;
      }
      return val;
    };

    // After first rising edge at t=0, Q should be 1
    expect(getQAt(0.5)).toBe(1);
    // While clock is low (t=5..10), Q should still be 1
    expect(getQAt(7)).toBe(1);
    // After second rising edge at t=10, D still 1, Q=1
    expect(getQAt(12)).toBe(1);
    // At t=15, D goes to 0, but no clock edge, Q should stay 1
    expect(getQAt(17)).toBe(1);
    // After rising edge at t=20, D=0, Q should change to 0
    expect(getQAt(22)).toBe(0);
  });
});
