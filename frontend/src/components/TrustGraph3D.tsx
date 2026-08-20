'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GraphResult } from '@/lib/api';
import {
  graphResultToForceGraph,
  nodeKey,
  statusColor,
  typeColor,
  type ForceGraphData,
  type ForceGraphNode,
} from '@/lib/graphViz';
import { getRelationshipInfo } from '@/lib/graphInterpret';
import GraphInspectorPanel, {
  GraphRelationshipLegend,
  GraphTypeLegend,
  type SelectedLink,
} from '@/components/GraphInspectorPanel';
import { Maximize2, RotateCcw } from 'lucide-react';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
        Initializing 3D engine…
      </div>
    </div>
  ),
});

interface TrustGraph3DProps {
  data: GraphResult;
  focusType?: string;
  focusId?: string;
  height?: number | string;
  variant?: 'embedded' | 'fullscreen';
  showLegend?: boolean;
}

function enrichWithDegree(base: ForceGraphData): ForceGraphData {
  const degree = new Map<string, number>();
  for (const link of base.links) {
    const s = typeof link.source === 'string' ? link.source : (link.source as { id: string }).id;
    const t = typeof link.target === 'string' ? link.target : (link.target as { id: string }).id;
    degree.set(s, (degree.get(s) || 0) + 1);
    degree.set(t, (degree.get(t) || 0) + 1);
  }
  const nodes = base.nodes.map((n) => {
    const d = degree.get(n.id) || 1;
    return {
      ...n,
      degree: d,
      val: n.val * (1 + Math.log2(d + 1) * 0.45),
    };
  });
  return { nodes, links: base.links };
}

function buildNeighborSet(nodeId: string, links: ForceGraphData['links']): Set<string> {
  const neighbors = new Set<string>([nodeId]);
  for (const link of links) {
    const s = typeof link.source === 'string' ? link.source : (link.source as { id: string }).id;
    const t = typeof link.target === 'string' ? link.target : (link.target as { id: string }).id;
    if (s === nodeId) neighbors.add(t);
    if (t === nodeId) neighbors.add(s);
  }
  return neighbors;
}

function resolveNodeColor(node: ForceGraphNode): string {
  if (node.isFocus) return '#fbbf24';
  if (node.status) return statusColor(node.status);
  return typeColor(node.type);
}

function createGlowNode(color: string, size: number): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(size, 20, 20),
    new THREE.MeshPhongMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.55,
      shininess: 80,
      transparent: true,
      opacity: 0.95,
    }),
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(size * 1.65, 16, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  group.add(glow);
  group.add(core);
  return group;
}

function linkEndpointId(endpoint: unknown): string {
  if (typeof endpoint === 'string') return endpoint;
  if (endpoint && typeof endpoint === 'object' && 'id' in endpoint) {
    return String((endpoint as { id?: string }).id ?? '');
  }
  return '';
}

export default function TrustGraph3D({
  data,
  focusType,
  focusId,
  height,
  variant = 'embedded',
  showLegend = true,
}: TrustGraph3DProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<ForceGraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<SelectedLink | null>(null);

  const focusKey = focusType && focusId ? nodeKey(focusType, focusId) : undefined;
  const graphData = useMemo(() => {
    const base = graphResultToForceGraph(data, focusKey);
    return enrichWithDegree(base);
  }, [data, focusKey]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, ForceGraphNode>();
    for (const n of graphData.nodes) map.set(n.id, n);
    return map;
  }, [graphData.nodes]);

  const highlightSet = useMemo(() => {
    if (selectedLink) {
      return new Set([selectedLink.sourceId, selectedLink.targetId]);
    }
    if (!selectedNode) return null;
    return buildNeighborSet(selectedNode.id, graphData.links);
  }, [selectedNode, selectedLink, graphData.links]);

  const isLinkHighlighted = useCallback(
    (link: { source: unknown; target: unknown; relationship?: string }) => {
      if (!selectedLink) return false;
      const s = linkEndpointId(link.source);
      const t = linkEndpointId(link.target);
      return s === selectedLink.sourceId && t === selectedLink.targetId;
    },
    [selectedLink],
  );

  const configureForces = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(variant === 'fullscreen' ? -180 : -140);
    fg.d3Force('link')?.distance((link: { relationship?: string }) =>
      link.relationship?.includes('shared') ? 55 : 70,
    );
    fg.d3Force('center')?.strength(0.04);
  }, [variant]);

  useEffect(() => {
    const timer = setTimeout(() => {
      configureForces();
      fgRef.current?.zoomToFit?.(600, 60);
    }, 500);
    return () => clearTimeout(timer);
  }, [graphData, configureForces]);

  const getNodeColor = useCallback((node: ForceGraphNode) => resolveNodeColor(node), []);

  const handleNodeClick = useCallback((node: any) => {
    if (!node || !fgRef.current) return;
    const graphNode = node as ForceGraphNode;
    setSelectedLink(null);
    setSelectedNode((prev) => (prev?.id === graphNode.id ? null : graphNode));
    const dist = 120 + Math.sqrt(graphNode.val) * 12;
    const nx = graphNode.x ?? 0;
    const ny = graphNode.y ?? 0;
    const nz = graphNode.z ?? 0;
    const len = Math.hypot(nx, ny, nz) || 1;
    fgRef.current.cameraPosition(
      {
        x: nx + (nx / len) * dist,
        y: ny + (ny / len) * dist + 30,
        z: nz + (nz / len) * dist,
      },
      { x: nx, y: ny, z: nz },
      1200,
    );
  }, []);

  const handleLinkClick = useCallback(
    (link: any) => {
      const sourceId = linkEndpointId(link.source);
      const targetId = linkEndpointId(link.target);
      setSelectedNode(null);
      setSelectedLink({
        relationship: String(link.relationship ?? ''),
        sourceId,
        targetId,
        source: nodeMap.get(sourceId),
        target: nodeMap.get(targetId),
      });
    },
    [nodeMap],
  );

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    setSelectedLink(null);
  }, []);

  const resetView = useCallback(() => {
    clearSelection();
    configureForces();
    fgRef.current?.zoomToFit?.(500, 60);
  }, [configureForces, clearSelection]);

  const nodeHoverLabel = useCallback((node: any) => {
    const n = node as ForceGraphNode;
    const typeInfo = n.type.replace(/_/g, ' ');
    return `${typeInfo}: ${n.name}`;
  }, []);

  const linkHoverLabel = useCallback((link: any) => {
    const rel = String(link.relationship ?? '');
    return getRelationshipInfo(rel).label;
  }, []);

  if (!graphData.nodes.length) {
    return (
      <p className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-500">
        No graph nodes to display.
      </p>
    );
  }

  const containerHeight = height ?? (variant === 'fullscreen' ? 'calc(100vh - 14rem)' : 420);
  const isFullscreen = variant === 'fullscreen';

  return (
    <div className={isFullscreen ? 'space-y-4' : 'space-y-3'}>
      <div
        className={`relative overflow-hidden border border-slate-700/50 bg-[#030308] ${
          isFullscreen
            ? 'rounded-2xl shadow-2xl shadow-cyan-950/40 ring-1 ring-cyan-500/10'
            : 'rounded-xl'
        }`}
        style={{ height: containerHeight, minHeight: isFullscreen ? 520 : undefined }}
      >
        {/* Starfield backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.35), transparent),
              radial-gradient(1px 1px at 80px 120px, rgba(255,255,255,0.2), transparent),
              radial-gradient(1.5px 1.5px at 160px 60px, rgba(103,232,249,0.3), transparent),
              radial-gradient(1px 1px at 240px 180px, rgba(255,255,255,0.15), transparent),
              radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.06) 0%, transparent 55%)
            `,
            backgroundSize: '280px 200px',
          }}
        />

        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeThreeObject={(node: any) => {
            const n = node as ForceGraphNode;
            const color = getNodeColor(n);
            const size = Math.sqrt(n.val) * (variant === 'fullscreen' ? 0.55 : 0.5);
            return createGlowNode(color, size);
          }}
          nodeLabel={nodeHoverLabel}
          linkColor={(link: any) => {
            if (selectedLink) {
              return isLinkHighlighted(link) ? 'rgba(167, 139, 250, 0.9)' : 'rgba(30, 41, 59, 0.25)';
            }
            if (!highlightSet) return 'rgba(56, 189, 248, 0.22)';
            const s = linkEndpointId(link.source);
            const t = linkEndpointId(link.target);
            const lit = highlightSet.has(s) && highlightSet.has(t);
            return lit ? 'rgba(103, 232, 249, 0.75)' : 'rgba(30, 41, 59, 0.35)';
          }}
          linkWidth={(link: any) => {
            if (selectedLink && isLinkHighlighted(link)) return 2;
            if (!highlightSet) return 0.4;
            const s = linkEndpointId(link.source);
            const t = linkEndpointId(link.target);
            return highlightSet.has(s) && highlightSet.has(t) ? 1.2 : 0.15;
          }}
          linkOpacity={0.7}
          linkLabel={linkHoverLabel}
          linkDirectionalParticles={(link: any) => {
            if (selectedLink) return isLinkHighlighted(link) ? 5 : 0;
            if (!highlightSet) return 2;
            const s = linkEndpointId(link.source);
            const t = linkEndpointId(link.target);
            return highlightSet.has(s) && highlightSet.has(t) ? 4 : 0;
          }}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={() => 'rgba(167, 139, 250, 0.9)'}
          linkCurvature={0.15}
          onLinkClick={handleLinkClick}
          onNodeClick={handleNodeClick}
          onBackgroundClick={clearSelection}
          enableNodeDrag
          showNavInfo={false}
          warmupTicks={80}
          cooldownTicks={60}
        />

        {/* Controls */}
        {isFullscreen && (
          <div className="absolute right-4 top-4">
            <button
              type="button"
              onClick={resetView}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-400 backdrop-blur-md transition hover:border-cyan-500/40 hover:text-cyan-300"
              title="Reset view"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset view
            </button>
          </div>
        )}

        {/* Stats badge */}
        <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-slate-700/60 bg-slate-950/80 px-3 py-2 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-500/70">Network</p>
          <p className="text-sm font-semibold text-slate-200">
            {graphData.nodes.length} nodes · {graphData.links.length} edges
          </p>
        </div>

        <GraphInspectorPanel
          selectedNode={selectedLink ? null : selectedNode}
          selectedLink={selectedLink}
          onClose={clearSelection}
        />

        <p className="pointer-events-none absolute bottom-4 left-4 max-w-[14rem] rounded-lg border border-slate-800/60 bg-slate-950/60 px-2.5 py-1 text-[10px] text-slate-600 backdrop-blur-sm">
          <Maximize2 className="mr-1 inline h-3 w-3" />
          Click a node or connection for details · Drag to rotate · Scroll to zoom
        </p>
      </div>

      {showLegend && (
        <div className={`grid gap-3 lg:grid-cols-2 ${isFullscreen ? 'px-1' : ''}`}>
          <GraphTypeLegend />
          <GraphRelationshipLegend />
        </div>
      )}
    </div>
  );
}
