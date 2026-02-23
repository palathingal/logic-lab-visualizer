import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CircuitComponent, Wire, CanvasState, ComponentType, TimingViolation, CustomComponentDef } from '@/types/circuit';
import { GateSVG } from '@/components/gates/GateSVG';
import { getComponentDefinition } from '@/lib/componentDefinitions';

interface CircuitCanvasProps {
  components: CircuitComponent[];
  wires: Wire[];
  canvasState: CanvasState;
  violations: TimingViolation[];
  customComponents: CustomComponentDef[];
  multiSelectIds?: string[];
  onSelectComponent: (id: string | null) => void;
  onSelectWire: (id: string | null) => void;
  onUpdateComponentPosition: (id: string, position: { x: number; y: number }) => void;
  onStartWiring: (componentId: string, pinId: string) => void;
  onCompleteWiring: (componentId: string, pinId: string) => void;
  onCancelWiring: () => void;
  onAddComponent: (type: ComponentType, position: { x: number; y: number }) => void;
  onAddCustomInstance: (customDefId: string, position: { x: number; y: number }) => string | null;
  onZoom: (zoom: number) => void;
  onPan: (pan: { x: number; y: number }) => void;
  onRemoveWire: (wireId: string) => void;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  components,
  wires,
  canvasState,
  violations,
  customComponents,
  multiSelectIds = [],
  onSelectComponent,
  onSelectWire,
  onUpdateComponentPosition,
  onStartWiring,
  onCompleteWiring,
  onCancelWiring,
  onAddComponent,
  onAddCustomInstance,
  onZoom,
  onPan,
  onRemoveWire,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getCanvasPosition = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - canvasState.pan.x) / canvasState.zoom,
      y: (e.clientY - rect.top - canvasState.pan.y) / canvasState.zoom,
    };
  }, [canvasState.pan, canvasState.zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+click for panning
      setIsPanning(true);
      setDragStart({ x: e.clientX - canvasState.pan.x, y: e.clientY - canvasState.pan.y });
    } else if (e.button === 0 && canvasState.isWiring) {
      // Cancel wiring on canvas click
      onCancelWiring();
    } else if (e.button === 0) {
      // Deselect on canvas click
      onSelectComponent(null);
      onSelectWire(null);
    }
  }, [canvasState.isWiring, canvasState.pan, onCancelWiring, onSelectComponent, onSelectWire]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPosition(e);
    setMousePos(pos);

    if (isPanning) {
      onPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isPanning, dragStart, getCanvasPosition, onPan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    onZoom(canvasState.zoom * delta);
  }, [canvasState.zoom, onZoom]);

  const handleComponentMouseDown = useCallback((e: React.MouseEvent, componentId: string) => {
    e.stopPropagation();
    onSelectComponent(componentId);
    
    const comp = components.find(c => c.id === componentId);
    if (comp) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX / canvasState.zoom - comp.position.x,
        y: e.clientY / canvasState.zoom - comp.position.y,
      });
    }
  }, [components, canvasState.zoom, onSelectComponent]);

  const handleComponentDrag = useCallback((e: React.MouseEvent) => {
    if (isDragging && canvasState.selectedComponentId) {
      const newX = e.clientX / canvasState.zoom - dragStart.x;
      const newY = e.clientY / canvasState.zoom - dragStart.y;
      
      // Snap to grid
      const gridSize = 20;
      const snappedX = Math.round(newX / gridSize) * gridSize;
      const snappedY = Math.round(newY / gridSize) * gridSize;
      
      onUpdateComponentPosition(canvasState.selectedComponentId, { x: snappedX, y: snappedY });
    }
  }, [isDragging, canvasState.selectedComponentId, canvasState.zoom, dragStart, onUpdateComponentPosition]);

  const handlePinClick = useCallback((e: React.MouseEvent, componentId: string, pinId: string) => {
    e.stopPropagation();
    
    if (canvasState.isWiring) {
      onCompleteWiring(componentId, pinId);
    } else {
      onStartWiring(componentId, pinId);
    }
  }, [canvasState.isWiring, onStartWiring, onCompleteWiring]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('componentType') as ComponentType;
    if (type) {
      const pos = getCanvasPosition(e as unknown as React.MouseEvent);
      // Snap to grid
      const gridSize = 20;
      pos.x = Math.round(pos.x / gridSize) * gridSize;
      pos.y = Math.round(pos.y / gridSize) * gridSize;

      if (type === 'CUSTOM') {
        const customDefId = e.dataTransfer.getData('customDefId');
        if (customDefId) {
          onAddCustomInstance(customDefId, pos);
        }
      } else {
        onAddComponent(type, pos);
      }
    }
  }, [getCanvasPosition, onAddComponent, onAddCustomInstance]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Get wire path with improved orthogonal routing
  const getWirePath = (wire: Wire): string => {
    const sourceComp = components.find(c => c.id === wire.sourceComponentId);
    const targetComp = components.find(c => c.id === wire.targetComponentId);
    
    if (!sourceComp || !targetComp) return '';
    
    const sourcePin = sourceComp.pins.find(p => p.id === wire.sourcePinId);
    const targetPin = targetComp.pins.find(p => p.id === wire.targetPinId);
    
    if (!sourcePin || !targetPin) return '';
    
    const startX = sourceComp.position.x + sourcePin.position.x;
    const startY = sourceComp.position.y + sourcePin.position.y;
    const endX = targetComp.position.x + targetPin.position.x;
    const endY = targetComp.position.y + targetPin.position.y;
    
    // Improved routing with offset segments to avoid overlapping with components
    const gapOut = 15;
    const gapIn = 15;
    const sx = startX + gapOut;
    const ex = endX - gapIn;
    
    if (sx < ex) {
      // Simple case: source is left of target
      const midX = (sx + ex) / 2;
      return `M ${startX} ${startY} H ${sx} H ${midX} V ${endY} H ${ex} H ${endX}`;
    } else {
      // Source is right of target — route around
      const midY = (startY + endY) / 2;
      return `M ${startX} ${startY} H ${sx} V ${midY} H ${ex} V ${endY} H ${endX}`;
    }
  };

  // Get temporary wire path while wiring
  const getTempWirePath = (): string | null => {
    if (!canvasState.isWiring || !canvasState.wireStartPin) return null;
    
    const sourceComp = components.find(c => c.id === canvasState.wireStartPin!.componentId);
    if (!sourceComp) return null;
    
    const sourcePin = sourceComp.pins.find(p => p.id === canvasState.wireStartPin!.pinId);
    if (!sourcePin) return null;
    
    const startX = sourceComp.position.x + sourcePin.position.x;
    const startY = sourceComp.position.y + sourcePin.position.y;
    
    const midX = (startX + mousePos.x) / 2;
    
    return `M ${startX} ${startY} H ${midX} V ${mousePos.y} H ${mousePos.x}`;
  };

  const tempWirePath = getTempWirePath();

  return (
    <div
      ref={canvasRef}
      className="w-full h-full circuit-canvas overflow-hidden relative cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleComponentDrag(e);
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${canvasState.pan.x}px, ${canvasState.pan.y}px) scale(${canvasState.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Wires - invisible fat hit area + visible wire */}
        {wires.map(wire => {
          const path = getWirePath(wire);
          const isSelected = canvasState.selectedWireId === wire.id;
          return (
            <g key={wire.id}>
              {/* Invisible wide hit area for easy clicking */}
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth="12"
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWire(wire.id);
                }}
              />
              {/* Visible wire */}
              <path
                d={path}
                fill="none"
                stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--wire))'}
                strokeWidth={isSelected ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
              />
              {/* Selection highlight dots at endpoints */}
              {isSelected && (() => {
                const sourceComp = components.find(c => c.id === wire.sourceComponentId);
                const targetComp = components.find(c => c.id === wire.targetComponentId);
                const sourcePin = sourceComp?.pins.find(p => p.id === wire.sourcePinId);
                const targetPin = targetComp?.pins.find(p => p.id === wire.targetPinId);
                if (!sourceComp || !targetComp || !sourcePin || !targetPin) return null;
                return (
                  <>
                    <circle cx={sourceComp.position.x + sourcePin.position.x} cy={sourceComp.position.y + sourcePin.position.y} r="4" fill="hsl(var(--primary))" />
                    <circle cx={targetComp.position.x + targetPin.position.x} cy={targetComp.position.y + targetPin.position.y} r="4" fill="hsl(var(--primary))" />
                  </>
                );
              })()}
            </g>
          );
        })}
        
        {/* Temporary wire while wiring */}
        {tempWirePath && (
          <path
            d={tempWirePath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray="5 5"
            className="animate-signal-flow"
          />
        )}
      </svg>

      {/* Components */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${canvasState.pan.x}px, ${canvasState.pan.y}px) scale(${canvasState.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {components.map(component => {
          const definition = getComponentDefinition(component.type);
          const isSelected = canvasState.selectedComponentId === component.id;
          const isMultiSelected = multiSelectIds.includes(component.id);
          const hasViolation = violations.some(v => v.componentId === component.id);
          
          return (
            <div
              key={component.id}
              className={`absolute gate-component cursor-move ${isSelected || isMultiSelected ? 'z-10' : ''} ${hasViolation ? 'animate-pulse' : ''}`}
              style={{
                left: component.position.x,
                top: component.position.y,
                outline: isMultiSelected ? '1.5px dashed hsl(var(--primary) / 0.6)' : 'none',
                outlineOffset: '6px',
                borderRadius: '6px',
                boxShadow: isMultiSelected ? '0 0 12px 2px hsl(var(--primary) / 0.15)' : 'none',
              }}
              onMouseDown={(e) => handleComponentMouseDown(e, component.id)}
            >
              <GateSVG 
                type={component.type} 
                isSelected={isSelected} 
                hasViolation={hasViolation}
                customName={component.type === 'CUSTOM' ? customComponents.find(c => c.id === component.customComponentDefId)?.name : undefined}
                pinCount={component.pins.length}
              />
              
              {/* Pin hitboxes */}
              {component.pins.map(pin => (
                <div
                  key={pin.id}
                  className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full cursor-pointer transition-all
                    ${pin.type === 'input' ? 'hover:bg-pin-input/50' : 'hover:bg-pin-output/50'}
                    ${canvasState.isWiring ? 'ring-2 ring-primary animate-pulse' : ''}`}
                  style={{
                    left: pin.position.x,
                    top: pin.position.y,
                  }}
                  onClick={(e) => handlePinClick(e, component.id, pin.id)}
                >
                  <div
                    className={`w-2 h-2 m-1 rounded-full ${
                      pin.type === 'input' ? 'bg-pin-input' : 'bg-pin-output'
                    }`}
                  />
                </div>
              ))}
              
              {/* Component name label */}
              <div className="absolute -bottom-5 left-0 right-0 text-center">
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  {component.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 px-2 py-1 bg-card/80 rounded text-xs font-mono text-muted-foreground">
        {Math.round(canvasState.zoom * 100)}%
      </div>

      {/* Selected wire toolbar */}
      {canvasState.selectedWireId && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-card/90 border border-border rounded-lg shadow-lg">
          <span className="text-xs text-muted-foreground font-mono">Wire selected</span>
          <button
            className="px-2 py-1 text-xs bg-destructive/20 text-destructive hover:bg-destructive/30 rounded transition-colors"
            onClick={() => onRemoveWire(canvasState.selectedWireId!)}
          >
            Delete
          </button>
          <button
            className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded transition-colors"
            onClick={() => onSelectWire(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Wiring indicator */}
      {canvasState.isWiring && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-full">
          <span className="text-sm text-primary font-medium">Click on a pin to connect • ESC to cancel</span>
        </div>
      )}
    </div>
  );
};
