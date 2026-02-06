import React from 'react';
import { CircuitComponent, InputPattern, Wire } from '@/types/circuit';
import { getComponentDefinition } from '@/lib/componentDefinitions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  component: CircuitComponent | null;
  wire: Wire | null;
  onUpdatePattern: (componentId: string, pattern: InputPattern) => void;
  onRemoveComponent: (componentId: string) => void;
  onRemoveWire: (wireId: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  component,
  wire,
  onUpdatePattern,
  onRemoveComponent,
  onRemoveWire,
}) => {
  if (!component && !wire) {
    return (
      <div className="h-full flex flex-col bg-sidebar border-l border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wider">
            Properties
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Select a component or wire to view its properties
          </p>
        </div>
      </div>
    );
  }

  if (wire) {
    return (
      <div className="h-full flex flex-col bg-sidebar border-l border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wider">
            Wire Properties
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Wire ID</Label>
            <p className="text-sm font-mono text-foreground mt-1">{wire.id.slice(0, 12)}...</p>
          </div>
          <Separator className="bg-sidebar-border" />
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <p className="text-sm font-mono text-foreground mt-1">{wire.sourceComponentId.slice(0, 12)}...</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <p className="text-sm font-mono text-foreground mt-1">{wire.targetComponentId.slice(0, 12)}...</p>
          </div>
          <Separator className="bg-sidebar-border" />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => onRemoveWire(wire.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Wire
          </Button>
        </div>
      </div>
    );
  }

  const definition = getComponentDefinition(component!.type);
  const pattern = component!.pattern;

  return (
    <div className="h-full flex flex-col bg-sidebar border-l border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wider">
          Properties
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Component Info */}
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <p className="text-sm font-medium text-foreground mt-1">{component!.name}</p>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <p className="text-sm font-mono text-primary mt-1">{component!.type}</p>
          </div>

          {definition && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-xs text-muted-foreground mt-1">{definition.description}</p>
            </div>
          )}

          <Separator className="bg-sidebar-border" />

          {/* Timing Parameters */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Timing</Label>
            <div className="space-y-3 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Prop. Delay</span>
                <span className="text-xs font-mono text-foreground">{component!.timing.propagationDelay} ns</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Rise Time</span>
                <span className="text-xs font-mono text-foreground">{component!.timing.riseTime} ns</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Fall Time</span>
                <span className="text-xs font-mono text-foreground">{component!.timing.fallTime} ns</span>
              </div>
              {component!.timing.setupTime !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Setup Time</span>
                  <span className="text-xs font-mono text-foreground">{component!.timing.setupTime} ns</span>
                </div>
              )}
              {component!.timing.holdTime !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Hold Time</span>
                  <span className="text-xs font-mono text-foreground">{component!.timing.holdTime} ns</span>
                </div>
              )}
            </div>
          </div>

          {/* Input Pattern (for sources) */}
          {pattern && (
            <>
              <Separator className="bg-sidebar-border" />
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Input Pattern</Label>
                <div className="space-y-3 mt-2">
                  <Select
                    value={pattern.type}
                    onValueChange={(value) => {
                      const newPattern: InputPattern = { type: value as InputPattern['type'] };
                      if (value === 'clock') {
                        newPattern.period = 10;
                        newPattern.dutyCycle = 0.5;
                      } else if (value === 'static') {
                        newPattern.value = 0;
                      } else if (value === 'pulse') {
                        newPattern.startTime = 5;
                        newPattern.pulseWidth = 10;
                      }
                      onUpdatePattern(component!.id, newPattern);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static</SelectItem>
                      <SelectItem value="clock">Clock</SelectItem>
                      <SelectItem value="pulse">Pulse</SelectItem>
                      <SelectItem value="waveform">Waveform</SelectItem>
                    </SelectContent>
                  </Select>

                  {pattern.type === 'static' && (
                    <div>
                      <Label className="text-xs">Value</Label>
                      <Select
                        value={String(pattern.value ?? 0)}
                        onValueChange={(value) => {
                          onUpdatePattern(component!.id, { ...pattern, value: Number(value) as 0 | 1 });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-input border-border mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 (Low)</SelectItem>
                          <SelectItem value="1">1 (High)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {pattern.type === 'clock' && (
                    <>
                      <div>
                        <div className="flex justify-between">
                          <Label className="text-xs">Period</Label>
                          <span className="text-xs font-mono text-muted-foreground">{pattern.period} ns</span>
                        </div>
                        <Slider
                          value={[pattern.period ?? 10]}
                          onValueChange={([value]) => {
                            onUpdatePattern(component!.id, { ...pattern, period: value });
                          }}
                          min={2}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <Label className="text-xs">Duty Cycle</Label>
                          <span className="text-xs font-mono text-muted-foreground">{Math.round((pattern.dutyCycle ?? 0.5) * 100)}%</span>
                        </div>
                        <Slider
                          value={[(pattern.dutyCycle ?? 0.5) * 100]}
                          onValueChange={([value]) => {
                            onUpdatePattern(component!.id, { ...pattern, dutyCycle: value / 100 });
                          }}
                          min={10}
                          max={90}
                          step={5}
                          className="mt-2"
                        />
                      </div>
                    </>
                  )}

                  {pattern.type === 'pulse' && (
                    <>
                      <div>
                        <Label className="text-xs">Start Time (ns)</Label>
                        <Input
                          type="number"
                          value={pattern.startTime ?? 5}
                          onChange={(e) => {
                            onUpdatePattern(component!.id, { ...pattern, startTime: Number(e.target.value) });
                          }}
                          className="h-8 text-xs bg-input border-border mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Pulse Width (ns)</Label>
                        <Input
                          type="number"
                          value={pattern.pulseWidth ?? 10}
                          onChange={(e) => {
                            onUpdatePattern(component!.id, { ...pattern, pulseWidth: Number(e.target.value) });
                          }}
                          className="h-8 text-xs bg-input border-border mt-1"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator className="bg-sidebar-border" />

          {/* Delete Button */}
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => onRemoveComponent(component!.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Component
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};
