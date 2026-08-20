'use client';

import type { ForceGraphNode } from '@/lib/graphViz';
import { explainLink, explainNode, getNodeTypeInfo, getRelationshipInfo } from '@/lib/graphInterpret';
import { X, ArrowRight, Info } from 'lucide-react';

export interface SelectedLink {
  relationship: string;
  sourceId: string;
  targetId: string;
  source?: ForceGraphNode;
  target?: ForceGraphNode;
}

interface GraphInspectorPanelProps {
  selectedNode: ForceGraphNode | null;
  selectedLink: SelectedLink | null;
  onClose: () => void;
}

function NodeInspector({ node }: { node: ForceGraphNode }) {
  const { typeInfo, statusExplanation, interpretation } = explainNode(node);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-500/80">{typeInfo.title}</p>
        <p className="mt-1 break-all text-base font-semibold text-white">{node.name}</p>
      </div>

      {node.status && (
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status: {node.status}</p>
          {statusExplanation && <p className="mt-1 text-xs leading-relaxed text-slate-300">{statusExplanation}</p>}
        </div>
      )}

      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
          <Info className="h-3 w-3" />
          What this means
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{interpretation}</p>
      </div>

      <p className="text-[11px] text-slate-500">{typeInfo.description}</p>

      <p className="text-[11px] text-slate-600">
        {node.degree ?? 1} connection{(node.degree ?? 1) !== 1 ? 's' : ''} in this view · Click a line between
        nodes to see how entities relate.
      </p>
    </div>
  );
}

function LinkInspector({ link }: { link: SelectedLink }) {
  const { info, summary } = explainLink(
    link.relationship,
    link.source,
    link.target,
    link.sourceId,
    link.targetId,
  );

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/90">Relationship</p>
        <p className="mt-1 text-base font-semibold text-white">{info.label}</p>
        <p className="mt-0.5 font-mono text-[10px] text-slate-500">{link.relationship}</p>
      </div>

      <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-1.5 break-all">
          <span className="font-medium text-slate-200">{link.source?.name ?? link.sourceId}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
          <span className="font-medium text-slate-200">{link.target?.name ?? link.targetId}</span>
        </div>
      </div>

      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">
          <Info className="h-3 w-3" />
          What this means
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{summary}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{info.description}</p>
        {info.riskNote && (
          <p className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200/90">
            ⚠ {info.riskNote}
          </p>
        )}
      </div>
    </div>
  );
}

export default function GraphInspectorPanel({
  selectedNode,
  selectedLink,
  onClose,
}: GraphInspectorPanelProps) {
  if (!selectedNode && !selectedLink) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-10 w-full max-w-sm rounded-xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5">
        <p className="text-xs font-semibold text-slate-300">
          {selectedLink ? 'Connection details' : 'Entity details'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[min(50vh,320px)] overflow-y-auto p-4">
        {selectedLink ? <LinkInspector link={selectedLink} /> : selectedNode ? <NodeInspector node={selectedNode} /> : null}
      </div>
    </div>
  );
}

export function GraphTypeLegend() {
  const types = ['company', 'recruiter', 'domain', 'report', 'job_posting'] as const;
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Entity types (click a node to learn more)
      </p>
      <div className="space-y-2">
        {types.map((t) => {
          const info = getNodeTypeInfo(t);
          return (
            <div key={t} className="text-[11px]">
              <span className="font-semibold text-slate-300">{info.title}</span>
              <span className="text-slate-500"> — {info.description.split('.')[0]}.</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GraphRelationshipLegend() {
  const keys = [
    'claims_company',
    'same_email_domain',
    'reported_against',
    'mentions_domain',
    'shared_network',
    'hosts_phishing_for',
  ] as const;
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Relationships (click a line to learn more)
      </p>
      <div className="space-y-2">
        {keys.map((k) => {
          const info = getRelationshipInfo(k);
          return (
            <div key={k} className="text-[11px]">
              <span className="font-semibold text-slate-300">{info.label}</span>
              <span className="text-slate-500"> — {info.description.split('.')[0]}.</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
