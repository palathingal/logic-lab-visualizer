import React from 'react';
import { ComponentType } from '@/types/circuit';
import { componentDefinitions, getComponentsByCategory } from '@/lib/componentDefinitions';
import { GateSVG } from '@/components/gates/GateSVG';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

const categories = [
  { id: 'gates', name: 'Logic Gates', icon: '⊕' },
  { id: 'sequential', name: 'Sequential', icon: '◈' },
  { id: 'sources', name: 'Sources', icon: '◎' },
  { id: 'outputs', name: 'Outputs', icon: '◉' },
];

export const ComponentPalette: React.FC = () => {
  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData('componentType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wider">
          Components
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Drag to canvas to place
        </p>
      </div>

      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={['gates', 'sequential', 'sources', 'outputs']} className="px-2">
          {categories.map(category => {
            const categoryComponents = getComponentsByCategory(category.id);
            
            return (
              <AccordionItem key={category.id} value={category.id} className="border-sidebar-border">
                <AccordionTrigger className="text-sm text-sidebar-foreground hover:text-sidebar-primary py-3">
                  <span className="flex items-center gap-2">
                    <span className="text-primary">{category.icon}</span>
                    {category.name}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    {categoryComponents.map(comp => (
                      <div
                        key={comp.type}
                        className="group flex flex-col items-center p-2 rounded-lg border border-transparent 
                          bg-sidebar-accent/30 hover:bg-sidebar-accent hover:border-sidebar-border
                          cursor-grab active:cursor-grabbing transition-all"
                        draggable
                        onDragStart={(e) => handleDragStart(e, comp.type)}
                        title={comp.description}
                      >
                        <div className="scale-75 transform-gpu">
                          <GateSVG type={comp.type} />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono mt-1 group-hover:text-foreground transition-colors">
                          {comp.name.replace(' Gate', '').replace(' Flip-Flop', '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/20">
        <div className="text-[10px] text-muted-foreground space-y-1">
          <p><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Alt+Drag</kbd> Pan canvas</p>
          <p><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Scroll</kbd> Zoom</p>
          <p><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Delete</kbd> Remove selected</p>
        </div>
      </div>
    </div>
  );
};
