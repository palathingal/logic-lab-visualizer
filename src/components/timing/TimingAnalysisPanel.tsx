import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimingViolation, CircuitComponent } from '@/types/circuit';
import { AlertTriangle, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface TimingAnalysisPanelProps {
  violations: TimingViolation[];
  components: CircuitComponent[];
  onSelectComponent: (id: string) => void;
}

export const TimingAnalysisPanel: React.FC<TimingAnalysisPanelProps> = ({
  violations,
  components,
  onSelectComponent,
}) => {
  const getComponent = (id: string) => components.find(c => c.id === id);

  const getSuggestion = (violation: TimingViolation, component?: CircuitComponent): string => {
    if (!component) return 'Component not found';

    switch (violation.type) {
      case 'setup':
        const setupTime = component.timing.setupTime ?? 0;
        const requiredSetup = setupTime + 1; // Add margin
        return `Increase data stable time before clock edge to at least ${requiredSetup.toFixed(1)}ns, or reduce clock frequency`;
      case 'hold':
        const holdTime = component.timing.holdTime ?? 0;
        const requiredHold = holdTime + 0.5; // Add margin
        return `Keep data stable for at least ${requiredHold.toFixed(1)}ns after clock edge, or add delay buffer`;
      case 'glitch':
        return `Add filtering or increase propagation delay to ${(component.timing.propagationDelay * 1.5).toFixed(1)}ns`;
      case 'race':
        return 'Balance path delays or add synchronization element';
      default:
        return 'Review timing constraints';
    }
  };

  const getViolationIcon = (violation: TimingViolation) => {
    switch (violation.severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getViolationColor = (violation: TimingViolation) => {
    switch (violation.severity) {
      case 'error':
        return 'border-destructive/50 bg-destructive/10';
      case 'warning':
        return 'border-warning/50 bg-warning/10';
      default:
        return 'border-border bg-card';
    }
  };

  const groupedViolations = violations.reduce((acc, v) => {
    if (!acc[v.componentId]) acc[v.componentId] = [];
    acc[v.componentId].push(v);
    return acc;
  }, {} as Record<string, TimingViolation[]>);

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Timing Analysis</h2>
        </div>
        <div className="flex items-center gap-2">
          {violations.length === 0 ? (
            <span className="flex items-center gap-1 text-xs text-signal-high">
              <CheckCircle className="w-3 h-3" />
              No violations
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3 h-3" />
              {violations.length} issue{violations.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {violations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-signal-high/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                All timing constraints satisfied
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Run simulation to detect timing violations
              </p>
            </div>
          ) : (
            Object.entries(groupedViolations).map(([componentId, compViolations]) => {
              const component = getComponent(componentId);
              return (
                <div
                  key={componentId}
                  className={`rounded-lg border p-3 cursor-pointer transition-all hover:ring-1 hover:ring-primary/50 ${getViolationColor(compViolations[0])}`}
                  onClick={() => onSelectComponent(componentId)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getViolationIcon(compViolations[0])}
                    <span className="font-mono text-sm font-medium">
                      {component?.name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({component?.type})
                    </span>
                  </div>

                  {compViolations.map((violation, idx) => (
                    <div key={idx} className="ml-6 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium uppercase px-1.5 py-0.5 rounded ${
                          violation.type === 'setup' ? 'bg-destructive/20 text-destructive' :
                          violation.type === 'hold' ? 'bg-warning/20 text-warning' :
                          violation.type === 'glitch' ? 'bg-accent/20 text-accent' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {violation.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @ {violation.time.toFixed(1)}ns
                        </span>
                      </div>
                      
                      <p className="text-xs text-foreground/80">
                        {violation.message}
                      </p>

                      <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                        <p className="text-xs text-primary flex items-start gap-1.5">
                          <span className="font-semibold shrink-0">Fix:</span>
                          <span>{getSuggestion(violation, component)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}

          {/* Summary Statistics */}
          {violations.length > 0 && (
            <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
              <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                Summary
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setup:</span>
                  <span className="font-mono text-destructive">
                    {violations.filter(v => v.type === 'setup').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hold:</span>
                  <span className="font-mono text-warning">
                    {violations.filter(v => v.type === 'hold').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Glitch:</span>
                  <span className="font-mono text-accent">
                    {violations.filter(v => v.type === 'glitch').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Race:</span>
                  <span className="font-mono text-muted-foreground">
                    {violations.filter(v => v.type === 'race').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
