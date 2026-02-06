import { useState, useCallback } from 'react';
import { 
  Circuit, 
  CircuitComponent, 
  Wire, 
  CanvasState, 
  ComponentType,
  Pin,
  InputPattern
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

  return {
    circuit,
    canvasState,
    addComponent,
    removeComponent,
    updateComponentPosition,
    updateComponentPattern,
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
  };
};
