import { useMemo } from 'react';

export default function MermaidDiagram({ definition }) {
  const nodes = useMemo(() => {
    const found = new Map();
    const lines = definition.split(/\r?\n/).filter(line => line.trim() && !/^\s*(flowchart|graph)\s+/i.test(line));
    for (const line of lines) {
      const parts = line.split(/-->|---|==>|-.->|<-->/);
      for (const part of parts) {
        const match = part.trim().match(/^([\w-]+)(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?/);
        if (match) found.set(match[1], (match[2] || match[3] || match[4] || match[1]).replace(/<br\s*\/?\s*>/gi, ' '));
      }
    }
    return [...found.entries()].map(([id,label])=>({id,label}));
  }, [definition]);
  return <section className="rounded-xl border border-border p-4 mt-6" aria-label="Study diagram"><h3 className="font-semibold text-sm mb-3">Study diagram</h3>{nodes.length>0?<div className="flex flex-wrap items-center gap-2" role="list">{nodes.map((node,index)=><div key={node.id} className="flex items-center gap-2" role="listitem"><div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm max-w-56">{node.label}</div>{index<nodes.length-1&&<span aria-hidden="true" className="text-primary font-bold">→</span>}</div>)}</div>:<p className="text-sm text-muted-foreground">{definition}</p>}<details className="mt-3"><summary className="cursor-pointer text-xs text-muted-foreground">View diagram source</summary><pre className="overflow-x-auto text-xs whitespace-pre-wrap bg-muted/40 rounded-lg p-3 mt-2">{definition}</pre></details></section>;
}
