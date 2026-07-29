"""
Minimal trust graph (Milestone P2-7).

A single edge table (`entity_links`) instead of a dedicated graph database
— enough to answer "what is this entity connected to, and is any of it
flagged?" without the operational overhead of a graph store. Every module
that discovers a relationship (a recruiter's email domain, a report's
target, a job posting's mentioned domain/recruiter, a communication's
mentioned domain, ...) writes one edge here via `link()`; `neighbors()`
and `flagged_neighbor_signal()` are the read side other modules use to
surface "linked to N flagged entities" as its own Signal.
"""

from typing import Optional

from app.services.scoring import Signal
from app.supabase_client import get_supabase_admin_client

VALID_ENTITY_TYPES = {"company", "recruiter", "domain", "report", "job_posting", "scan"}

# Statuses that count as "flagged" when found on a company/recruiter/domain
# neighbor; approved reports count as flagged regardless of this set (see
# flagged_neighbor_signal).
_FLAGGED_STATUSES = {"suspicious", "predatory"}

_MAX_NODES = 50


def link(
    source_type: str,
    source_id: str,
    target_type: str,
    target_id: str,
    relationship: str,
    created_from: str,
) -> None:
    """Best-effort upsert into entity_links. Never raises — the unique
    constraint on (source_type, source_id, target_type, target_id,
    relationship) absorbs duplicates, so callers can call this
    unconditionally on every request without checking for an existing row."""
    if not source_id or not target_id:
        return
    try:
        get_supabase_admin_client().table("entity_links").upsert(
            {
                "source_type": source_type,
                "source_id": source_id,
                "target_type": target_type,
                "target_id": target_id,
                "relationship": relationship,
                "created_from": created_from,
            },
            on_conflict="source_type,source_id,target_type,target_id,relationship",
        ).execute()
    except Exception:
        pass


def _direct_edges(entity_type: str, entity_id: str) -> list[dict]:
    """Every entity_links row where this entity is the source or the target."""
    client = get_supabase_admin_client()
    try:
        as_source = (
            client.table("entity_links")
            .select("*")
            .eq("source_type", entity_type)
            .eq("source_id", entity_id)
            .execute()
        )
        as_target = (
            client.table("entity_links")
            .select("*")
            .eq("target_type", entity_type)
            .eq("target_id", entity_id)
            .execute()
        )
        return (as_source.data or []) + (as_target.data or [])
    except Exception:
        return []


def _entity_status(entity_type: str, entity_id: str) -> Optional[str]:
    """Best-effort status lookup for a node, so graph results can be
    colored/flagged. 'company' and 'domain' share the same underlying
    identity (a domain string) so both check companies *and*
    scam_websites — a domain can be flagged via a report without ever
    getting a companies row (e.g. report_type='website')."""
    client = get_supabase_admin_client()
    try:
        if entity_type in ("company", "domain"):
            company_row = client.table("companies").select("status").eq("domain", entity_id).limit(1).execute()
            if company_row.data:
                return company_row.data[0].get("status")
            scam_row = client.table("scam_websites").select("id").eq("domain", entity_id).limit(1).execute()
            if scam_row.data:
                return "suspicious"
        elif entity_type == "recruiter":
            row = client.table("recruiters").select("status").eq("email", entity_id).limit(1).execute()
            if row.data:
                return row.data[0].get("status")
        elif entity_type == "report":
            row = client.table("fraud_reports").select("status").eq("id", entity_id).limit(1).execute()
            if row.data:
                return row.data[0].get("status")
    except Exception:
        pass
    return None


def neighbors(entity_type: str, entity_id: str, depth: int = 1) -> dict:
    """Return {"nodes": [{type,id,label,status}], "edges": [{source,target,relationship}]}
    out to `depth` hops (clamped to 1-2). Total nodes capped at 50 so this
    stays cheap and bounded regardless of how connected an entity is."""
    depth = max(1, min(depth, 2))

    nodes: dict[tuple[str, str], dict] = {}
    edges: list[dict] = []
    seen_edges: set[tuple] = set()

    def add_node(etype: str, eid: str) -> None:
        key = (etype, eid)
        if key not in nodes:
            nodes[key] = {"type": etype, "id": eid, "label": eid, "status": _entity_status(etype, eid)}

    add_node(entity_type, entity_id)
    frontier = [(entity_type, entity_id)]

    for _ in range(depth):
        next_frontier: list[tuple[str, str]] = []
        for etype, eid in frontier:
            for row in _direct_edges(etype, eid):
                edge_key = (
                    row["source_type"], row["source_id"],
                    row["target_type"], row["target_id"], row["relationship"],
                )
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edges.append(
                        {
                            "source": {"type": row["source_type"], "id": row["source_id"]},
                            "target": {"type": row["target_type"], "id": row["target_id"]},
                            "relationship": row["relationship"],
                        }
                    )

                is_source = row["source_type"] == etype and row["source_id"] == eid
                other = (row["target_type"], row["target_id"]) if is_source else (row["source_type"], row["source_id"])

                if other not in nodes and len(nodes) < _MAX_NODES:
                    add_node(*other)
                    next_frontier.append(other)
        frontier = next_frontier
        if not frontier:
            break

    return {"nodes": list(nodes.values()), "edges": edges}


def flagged_neighbor_signal(entity_type: str, entity_id: str) -> Optional[Signal]:
    """Counts depth-1 neighbors whose status is suspicious/predatory, or
    that are approved reports. >=1 match -> a Signal that meaningfully
    shifts the composite score — this is the "recruiter linked to 3
    flagged companies" USP moment."""
    result = neighbors(entity_type, entity_id, depth=1)
    count = 0
    for node in result["nodes"]:
        if node["type"] == entity_type and node["id"] == entity_id:
            continue
        status = node.get("status")
        if status in _FLAGGED_STATUSES or (node["type"] == "report" and status == "approved"):
            count += 1

    if count == 0:
        return None

    score = min(50.0 + 20.0 * count, 95.0)
    return Signal(
        name="graph:flagged_neighbors",
        score=score,
        weight=60,
        explanation=f"Linked to {count} flagged entities in our trust graph.",
    )
