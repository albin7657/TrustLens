"""
Minimal trust graph — read endpoint (Milestone P2-7).

The write side (`app.services.graph.link`) is called from every module
that discovers a relationship (recruiter verify, company verify, job
analyze, report approval, communication analyze); this is the only read
endpoint, backing the "Connections" expander on Trust Repository results.
"""

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas_graph import GraphResponse
from app.services.graph import VALID_ENTITY_TYPES
from app.services.graph import neighbors as get_neighbors

router = APIRouter(prefix="/graph", tags=["Trust Graph"])


@router.get(
    "/{entity_type}/{entity_id}",
    response_model=GraphResponse,
    summary="Get an entity's trust-graph neighbors",
)
async def get_graph(entity_type: str, entity_id: str, depth: int = Query(1, ge=1, le=2)):
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"entity_type must be one of {sorted(VALID_ENTITY_TYPES)}",
        )
    result = get_neighbors(entity_type, entity_id, depth=depth)
    return GraphResponse(**result)
