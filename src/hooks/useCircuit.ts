import { useState, useCallback } from 'react';
import { 
  Circuit, 
  CircuitComponent, 
  Wire, 
  CanvasState, 
  ComponentType,
  Pin,
  InputPattern,
  CustomComponentDef
} from '@/types/circuit';
import { getComponentDefinition } from '@/lib/componentDefinitions';

// Simple ID generator
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useCircuit = () => {
  const [circuit, setCircuit] = useState<Circuit>({
    id: generateId(),
    name: 'New Circuit',
    components: [],
    wires: [],
    customComponents: [],
    metadata: {
      created: new Date(),
      modified: new Date(),
      version: '1.0',
    },
  });

  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    selectedComponentId: null,
    selectedWireId: null,
    isWiring: false,
    wireStartPin: null,
    draggedComponent: null,
  });

  const addComponent = useCallback((type: ComponentType, position: { x: number; y: number }) => {
    const definition = getComponentDefinition(type);
    if (!definition) return null;

    const componentId = generateId();
    const pins: Pin[] = definition.pinConfiguration.map((pinConfig, index) => ({
      id: `pin_${index}`,
      name: pinConfig.name,
      type: pinConfig.type,
      position: pinConfig.position,
    }));

    // Default pattern for input/clock/constant
    let pattern: InputPattern | undefined;
    if (type === 'INPUT') {
      pattern = { type: 'static', value: 0 };
    } else if (type === 'CLOCK') {
      pattern = { type: 'clock', period: 10, dutyCycle: 0.5 };
    } else if (type === 'CONSTANT') {
      pattern = { type: 'static', value: 1 };
    }

    const newComponent: CircuitComponent = {
      id: componentId,
      type,
      name: `${definition.name}_${circuit.components.length + 1}`,
      position,
      pins,
      timing: { ...definition.defaultTiming },
      pattern,
    };

    setCircuit(prev => ({
      ...prev,
      components: [...prev.components, newComponent],
      metadata: { ...prev.metadata, modified: new Date() },
    }));

    return componentId;
  }, [circuit.components.length]);

  const removeComponent = useCallback((componentId: string) => {
    setCircuit(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== componentId),
      wires: prev.wires.filter(w => 
        w.sourceComponentId !== componentId && w.targetComponentId !== componentId
      ),
      metadata: { ...prev.metadata, modified: new Date() },
    }));

    if (canvasState.selectedComponentId === componentId) {
      setCanvasState(prev => ({ ...prev, selectedComponentId: null }));
    }
  }, [canvasState.selectedComponentId]);

  const updateComponentPosition = useCallback((componentId: string, position: { x: number; y: number }) => {
    setCircuit(prev => ({
      ...prev,
      components: prev.components.map(c =>
        c.id === componentId ? { ...c, position } : c
      ),
      metadata: { ...prev.metadata, modified: new Date() },
    }));
  }, []);

  const updateComponentPattern = useCallback((componentId: string, pattern: InputPattern) => {
    setCircuit(prev => ({
      ...prev,
      components: prev.components.map(c =>
        c.id === componentId ? { ...c, pattern } : c
      ),
      metadata: { ...prev.metadata, modified: new Date() },
    }));
  }, []);

  const updateComponentTiming = useCallback((componentId: string, timing: Partial<CircuitComponent['timing']>) => {
    setCircuit(prev => ({
      ...prev,
      components: prev.components.map(c =>
        c.id === componentId ? { ...c, timing: { ...c.timing, ...timing } } : c
      ),
      metadata: { ...prev.metadata, modified: new Date() },
    }));
  }, []);

  const updateComponentName = useCallback((componentId: string, name: string) => {
    setCircuit(prev => ({
      ...prev,
      components: prev.components.map(c =>
        c.id === componentId ? { ...c, name } : c
      ),
      metadata: { ...prev.metadata, modified: new Date() },
    }));
  }, []);

  const saveCircuitToFile = useCallback(() => {
    const dataStr = JSON.stringify(circuit, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${circuit.name.replace(/\s+/g, '_')}.logiclab.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [circuit]);

  const loadCircuitFromFile = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content) as Circuit;
          // Validate basic structure
          if (!parsed.id || !parsed.components || !parsed.wires) {
            throw new Error('Invalid circuit file format');
          }
          // Restore Date objects
          parsed.metadata.created = new Date(parsed.metadata.created);
          parsed.metadata.modified = new Date();
          setCircuit(parsed);
          setCanvasState(prev => ({
            ...prev,
            selectedComponentId: null,
            selectedWireId: null,
            isWiring: false,
            wireStartPin: null,
          }));
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  const updateCircuitName = useCallback((name: string) => {
    setCircuit(prev => ({
      ...prev,
      name,
      metadata: { ...prev.metadata, modified: new Date() },
    }));
  }, []);

  const addWire = useCallback((
    sourceComponentId: string, 
    sourcePinId: string,
    targetComponentId: string,
    targetPinId: string
  ) => {
    // Validate connection
    const sourceComp = circuit.components.find(c => c.id === sourceComponentId);
    const targetComp = circuit.components.find(c => c.id === targetComponentId);
    
    if (!sourceComp || !targetComp) return null;
    
    const sourcePin = sourceComp.pins.find(p => p.id === sourcePinId);
    const targetPin = targetComp.pins.find(p => p.id === targetPinId);
    
    if (!sourcePin || !targetPin) return null;
    if (sourcePin.type !== 'output' || targetPin.type !== 'input') return null;

    // Check if connection already exists
    const exists = circuit.wires.some(w =>
      w.targetComponentId === targetComponentId && w.targetPinId === targetPinId
    );
    if (exists) return null;

    const wireId = generateId();
    const newWire: Wire = {
      id: wireId,
      sourceComponentId,
      sourcePinId,
      targetComponentId,
      targetPinId,
    };

    setCircuit(prev => ({
      ...prev,
      wires: [...prev.wires, newWire],
      metadata: { ...prev.metadata, modified: new Date() },
    }));

    return wireId;
  }, [circuit.components, circuit.wires]);

  const removeWire = useCallback((wireId: string) => {
    setCircuit(prev => ({
      ...prev,
      wires: prev.wires.filter(w => w.id !== wireId),
      metadata: { ...prev.metadata, modified: new Date() },
    }));

    if (canvasState.selectedWireId === wireId) {
      setCanvasState(prev => ({ ...prev, selectedWireId: null }));
    }
  }, [canvasState.selectedWireId]);

  const selectComponent = useCallback((componentId: string | null) => {
    setCanvasState(prev => ({
      ...prev,
      selectedComponentId: componentId,
      selectedWireId: null,
    }));
  }, []);

  const selectWire = useCallback((wireId: string | null) => {
    setCanvasState(prev => ({
      ...prev,
      selectedWireId: wireId,
      selectedComponentId: null,
    }));
  }, []);

  const startWiring = useCallback((componentId: string, pinId: string) => {
    setCanvasState(prev => ({
      ...prev,
      isWiring: true,
      wireStartPin: { componentId, pinId },
    }));
  }, []);

  const cancelWiring = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      isWiring: false,
      wireStartPin: null,
    }));
  }, []);

  const completeWiring = useCallback((componentId: string, pinId: string) => {
    if (!canvasState.wireStartPin) return;

    const startComp = circuit.components.find(c => c.id === canvasState.wireStartPin!.componentId);
    const endComp = circuit.components.find(c => c.id === componentId);
    
    if (!startComp || !endComp) {
      cancelWiring();
      return;
    }

    const startPin = startComp.pins.find(p => p.id === canvasState.wireStartPin!.pinId);
    const endPin = endComp.pins.find(p => p.id === pinId);

    if (!startPin || !endPin) {
      cancelWiring();
      return;
    }

    // Determine source and target based on pin types
    if (startPin.type === 'output' && endPin.type === 'input') {
      addWire(startComp.id, startPin.id, endComp.id, endPin.id);
    } else if (startPin.type === 'input' && endPin.type === 'output') {
      addWire(endComp.id, endPin.id, startComp.id, startPin.id);
    }

    cancelWiring();
  }, [canvasState.wireStartPin, circuit.components, addWire, cancelWiring]);

  const setZoom = useCallback((zoom: number) => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.max(0.25, Math.min(2, zoom)),
    }));
  }, []);

  const setPan = useCallback((pan: { x: number; y: number }) => {
    setCanvasState(prev => ({ ...prev, pan }));
  }, []);

  const clearCircuit = useCallback(() => {
    setCircuit({
      id: generateId(),
      name: 'New Circuit',
      components: [],
      wires: [],
      customComponents: [],
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: '1.0',
      },
    });
    setCanvasState(prev => ({
      ...prev,
      selectedComponentId: null,
      selectedWireId: null,
      isWiring: false,
      wireStartPin: null,
    }));
  }, []);

  const loadCircuit = useCallback((newCircuit: Circuit) => {
    setCircuit(newCircuit);
    setCanvasState(prev => ({
      ...prev,
      selectedComponentId: null,
      selectedWireId: null,
      isWiring: false,
      wireStartPin: null,
    }));
  }, []);

  // Create a custom component from selected components
  const createCustomComponent = useCallback((componentIds: string[], name: string): string | null => {
    const selectedComponents = circuit.components.filter(c => componentIds.includes(c.id));
    if (selectedComponents.length < 2) return null;

    // Find internal wires (both endpoints inside selection)
    const internalWires = circuit.wires.filter(w =>
      componentIds.includes(w.sourceComponentId) && componentIds.includes(w.targetComponentId)
    );

    // Find external input pins (wires coming from outside, or unconnected input pins)
    const inputPins: CustomComponentDef['inputPins'] = [];
    const outputPins: CustomComponentDef['outputPins'] = [];

    selectedComponents.forEach(comp => {
      comp.pins.forEach(pin => {
        if (pin.type === 'input') {
          const hasInternalSource = internalWires.some(w =>
            w.targetComponentId === comp.id && w.targetPinId === pin.id
          );
          if (!hasInternalSource) {
            inputPins.push({
              name: `${comp.name}.${pin.name}`,
              internalComponentId: comp.id,
              internalPinId: pin.id,
            });
          }
        } else if (pin.type === 'output') {
          const hasInternalTarget = internalWires.some(w =>
            w.sourceComponentId === comp.id && w.sourcePinId === pin.id
          );
          // Expose outputs that connect externally or have no internal consumers
          const hasExternalTarget = circuit.wires.some(w =>
            w.sourceComponentId === comp.id && w.sourcePinId === pin.id &&
            !componentIds.includes(w.targetComponentId)
          );
          if (!hasInternalTarget || hasExternalTarget) {
            outputPins.push({
              name: `${comp.name}.${pin.name}`,
              internalComponentId: comp.id,
              internalPinId: pin.id,
            });
          }
        }
      });
    });

    if (inputPins.length === 0 && outputPins.length === 0) return null;

    // Build pin configuration for rendering
    const totalHeight = Math.max(inputPins.length, outputPins.length) * 20 + 20;
    const pinConfig: Omit<Pin, 'id' | 'connectedWireId'>[] = [
      ...inputPins.map((p, i) => ({
        name: p.name.split('.').pop() || `IN${i}`,
        type: 'input' as const,
        position: { x: 0, y: 15 + i * 20 },
      })),
      ...outputPins.map((p, i) => ({
        name: p.name.split('.').pop() || `OUT${i}`,
        type: 'output' as const,
        position: { x: 80, y: 15 + i * 20 },
      })),
    ];

    // Calculate effective propagation delay as sum of all internal components' delays
    const effectivePropagationDelay = selectedComponents.reduce(
      (sum, comp) => sum + (comp.timing.propagationDelay || 0), 0
    );
    const maxRiseTime = Math.max(...selectedComponents.map(c => c.timing.riseTime || 0));
    const maxFallTime = Math.max(...selectedComponents.map(c => c.timing.fallTime || 0));

    const customDef: CustomComponentDef = {
      id: generateId(),
      name,
      internalCircuit: {
        components: selectedComponents,
        wires: internalWires,
      },
      inputPins,
      outputPins,
      pinConfiguration: pinConfig,
      effectiveTiming: {
        propagationDelay: effectivePropagationDelay,
        riseTime: maxRiseTime,
        fallTime: maxFallTime,
      },
    };

    // Remove selected components and their wires from the main circuit
    setCircuit(prev => ({
      ...prev,
      customComponents: [...prev.customComponents, customDef],
      components: prev.components.filter(c => !componentIds.includes(c.id)),
      wires: prev.wires.filter(w =>
        !componentIds.includes(w.sourceComponentId) && !componentIds.includes(w.targetComponentId)
      ),
      metadata: { ...prev.metadata, modified: new Date() },
    }));

    return customDef.id;
  }, [circuit.components, circuit.wires]);

  // Add an instance of a custom component to the canvas
  const addCustomComponentInstance = useCallback((customDefId: string, position: { x: number; y: number }) => {
    const customDef = circuit.customComponents.find(c => c.id === customDefId);
    if (!customDef) return null;

    const componentId = generateId();
    const pins: Pin[] = customDef.pinConfiguration.map((pinConfig, index) => ({
      id: `pin_${index}`,
      name: pinConfig.name,
      type: pinConfig.type,
      position: pinConfig.position,
    }));

    const newComponent: CircuitComponent = {
      id: componentId,
      type: 'CUSTOM',
      name: `${customDef.name}_${circuit.components.filter(c => c.customComponentDefId === customDefId).length + 1}`,
      position,
      pins,
      timing: {
        propagationDelay: customDef.effectiveTiming?.propagationDelay ?? 5,
        riseTime: customDef.effectiveTiming?.riseTime ?? 0.5,
        fallTime: customDef.effectiveTiming?.fallTime ?? 0.5,
      },
      customComponentDefId: customDefId,
    };

    setCircuit(prev => ({
      ...prev,
      components: [...prev.components, newComponent],
      metadata: { ...prev.metadata, modified: new Date() },
    }));

    return componentId;
  }, [circuit.customComponents, circuit.components]);

  const removeCustomComponent = useCallback((customDefId: string) => {
    setCircuit(prev => ({
      ...prev,
      customComponents: prev.customComponents.filter(c => c.id !== customDefId),
      components: prev.components.filter(c => c.customComponentDefId !== customDefId),
      metadata: { ...prev.metadata, modified: new Date() },
    }));
  }, []);

  // --- Custom component editing ---
  const [editingCustomDefId, setEditingCustomDefId] = useState<string | null>(null);
  const [stashedCircuitState, setStashedCircuitState] = useState<{ components: CircuitComponent[]; wires: Wire[] } | null>(null);

  const startEditCustomComponent = useCallback((customDefId: string) => {
    const customDef = circuit.customComponents.find(c => c.id === customDefId);
    if (!customDef) return;

    // Stash current canvas state
    setStashedCircuitState({
      components: circuit.components,
      wires: circuit.wires,
    });
    setEditingCustomDefId(customDefId);

    // Load internal circuit onto canvas
    setCircuit(prev => ({
      ...prev,
      components: customDef.internalCircuit.components,
      wires: customDef.internalCircuit.wires,
      metadata: { ...prev.metadata, modified: new Date() },
    }));

    setCanvasState(prev => ({
      ...prev,
      selectedComponentId: null,
      selectedWireId: null,
      isWiring: false,
      wireStartPin: null,
    }));
  }, [circuit.customComponents, circuit.components, circuit.wires]);

  const saveEditCustomComponent = useCallback((newName?: string) => {
    if (!editingCustomDefId || !stashedCircuitState) return;

    const currentComponents = circuit.components;
    const currentWires = circuit.wires;

    // Recalculate pins and timing from edited internal circuit
    const internalWires = currentWires;

    const inputPins: CustomComponentDef['inputPins'] = [];
    const outputPins: CustomComponentDef['outputPins'] = [];

    currentComponents.forEach(comp => {
      comp.pins.forEach(pin => {
        if (pin.type === 'input') {
          const hasInternalSource = internalWires.some(w =>
            w.targetComponentId === comp.id && w.targetPinId === pin.id
          );
          if (!hasInternalSource) {
            inputPins.push({
              name: `${comp.name}.${pin.name}`,
              internalComponentId: comp.id,
              internalPinId: pin.id,
            });
          }
        } else if (pin.type === 'output') {
          const hasInternalTarget = internalWires.some(w =>
            w.sourceComponentId === comp.id && w.sourcePinId === pin.id
          );
          if (!hasInternalTarget) {
            outputPins.push({
              name: `${comp.name}.${pin.name}`,
              internalComponentId: comp.id,
              internalPinId: pin.id,
            });
          }
        }
      });
    });

    const totalHeight = Math.max(inputPins.length, outputPins.length) * 20 + 20;
    const pinConfig: Omit<Pin, 'id' | 'connectedWireId'>[] = [
      ...inputPins.map((p, i) => ({
        name: p.name.split('.').pop() || `IN${i}`,
        type: 'input' as const,
        position: { x: 0, y: 15 + i * 20 },
      })),
      ...outputPins.map((p, i) => ({
        name: p.name.split('.').pop() || `OUT${i}`,
        type: 'output' as const,
        position: { x: 80, y: 15 + i * 20 },
      })),
    ];

    const effectivePropagationDelay = currentComponents.reduce(
      (sum, comp) => sum + (comp.timing.propagationDelay || 0), 0
    );
    const maxRiseTime = Math.max(...currentComponents.map(c => c.timing.riseTime || 0));
    const maxFallTime = Math.max(...currentComponents.map(c => c.timing.fallTime || 0));

    setCircuit(prev => ({
      ...prev,
      components: stashedCircuitState.components,
      wires: stashedCircuitState.wires,
      customComponents: prev.customComponents.map(cd =>
        cd.id === editingCustomDefId
          ? {
              ...cd,
              name: newName || cd.name,
              internalCircuit: { components: currentComponents, wires: currentWires },
              inputPins,
              outputPins,
              pinConfiguration: pinConfig,
              effectiveTiming: {
                propagationDelay: effectivePropagationDelay,
                riseTime: maxRiseTime,
                fallTime: maxFallTime,
              },
            }
          : cd
      ),
      metadata: { ...prev.metadata, modified: new Date() },
    }));

    // Update timing on all instances of this custom component
    setCircuit(prev => ({
      ...prev,
      components: prev.components.map(c =>
        c.customComponentDefId === editingCustomDefId
          ? {
              ...c,
              timing: {
                propagationDelay: effectivePropagationDelay,
                riseTime: maxRiseTime,
                fallTime: maxFallTime,
              },
              pins: pinConfig.map((pc, i) => ({
                id: `pin_${i}`,
                name: pc.name,
                type: pc.type,
                position: pc.position,
              })),
            }
          : c
      ),
    }));

    setEditingCustomDefId(null);
    setStashedCircuitState(null);
  }, [editingCustomDefId, stashedCircuitState, circuit.components, circuit.wires]);

  const cancelEditCustomComponent = useCallback(() => {
    if (!stashedCircuitState) return;

    setCircuit(prev => ({
      ...prev,
      components: stashedCircuitState.components,
      wires: stashedCircuitState.wires,
      metadata: { ...prev.metadata, modified: new Date() },
    }));

    setEditingCustomDefId(null);
    setStashedCircuitState(null);
  }, [stashedCircuitState]);

  return {
    circuit,
    canvasState,
    addComponent,
    removeComponent,
    updateComponentPosition,
    updateComponentPattern,
    updateComponentTiming,
    updateComponentName,
    addWire,
    removeWire,
    selectComponent,
    selectWire,
    startWiring,
    cancelWiring,
    completeWiring,
    setZoom,
    setPan,
    clearCircuit,
    loadCircuit,
    saveCircuitToFile,
    loadCircuitFromFile,
    updateCircuitName,
    createCustomComponent,
    addCustomComponentInstance,
    removeCustomComponent,
    editingCustomDefId,
    startEditCustomComponent,
    saveEditCustomComponent,
    cancelEditCustomComponent,
  };
};
