"""Request/response schemas for the minimal trust graph (Milestone P2-7)."""

from typing import Optional

from pydantic import BaseModel


class GraphNode(BaseModel):
    type: str
    id: str
    label: str
    status: Optional[str] = None


class GraphEdgeEndpoint(BaseModel):
    type: str
    id: str


class GraphEdge(BaseModel):
    source: GraphEdgeEndpoint
    target: GraphEdgeEndpoint
    relationship: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
