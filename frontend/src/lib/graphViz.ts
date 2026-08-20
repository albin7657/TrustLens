import type { GraphEntityType, GraphResult } from '@/lib/api';

export interface ForceGraphNode {
  id: string;
  name: string;
  type: GraphEntityType | string;
  status: string | null;
  val: number;
  isFocus?: boolean;
  degree?: number;
  x?: number;
  y?: number;
  z?: number;
}

export interface ForceGraphLink {
  source: string;
  target: string;
  relationship: string;
}

export interface ForceGraphData {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
}

const TYPE_SIZE: Record<string, number> = {
  company: 12,
  domain: 9,
  recruiter: 8,
  report: 6,
  job_posting: 6,
  scan: 5,
};

export function nodeKey(type: string, id: string): string {
  return `${type}:${id}`;
}

/** Map API graph payload to react-force-graph format. */
export function graphResultToForceGraph(
  data: GraphResult,
  focusKey?: string,
): ForceGraphData {
  const nodes: ForceGraphNode[] = data.nodes.map((n) => {
    const id = nodeKey(n.type, n.id);
    const isFocus = focusKey === id;
    return {
      id,
      name: n.label || n.id,
      type: n.type,
      status: n.status,
      val: (TYPE_SIZE[n.type] ?? 5) * (isFocus ? 1.6 : 1),
      isFocus,
    };
  });

  const links: ForceGraphLink[] = data.edges.map((e) => ({
    source: nodeKey(e.source.type, e.source.id),
    target: nodeKey(e.target.type, e.target.id),
    relationship: e.relationship,
  }));

  return { nodes, links };
}

export function statusColor(status: string | null | undefined): string {
  switch (status) {
    case 'verified':
      return '#34d399';
    case 'predatory':
      return '#fbbf24';
    case 'suspicious':
      return '#f87171';
    case 'approved':
      return '#fb7185';
    case 'pending':
      return '#94a3b8';
    default:
      return '#67e8f9';
  }
}

export function typeColor(type: string): string {
  switch (type) {
    case 'company':
      return '#38bdf8';
    case 'recruiter':
      return '#a78bfa';
    case 'domain':
      return '#22d3ee';
    case 'report':
      return '#f472b6';
    case 'job_posting':
      return '#4ade80';
    case 'scan':
      return '#cbd5e1';
    default:
      return '#94a3b8';
  }
}

export function resolveGraphEntity(item: {
  type: string;
  id: string;
  label: string;
  detail?: string | null;
}): { entityType: GraphEntityType; entityId: string } {
  if (item.type === 'company') {
    return { entityType: 'company', entityId: item.detail || item.label };
  }
  if (item.type === 'recruiter') {
    return { entityType: 'recruiter', entityId: item.detail || item.label };
  }
  if (item.type === 'fraud_report') {
    return { entityType: 'report', entityId: item.id };
  }
  if (item.type === 'scam_website') {
    return { entityType: 'domain', entityId: item.label };
  }
  return { entityType: 'domain', entityId: item.detail || item.label || item.id };
}
