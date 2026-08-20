import type { ForceGraphNode } from '@/lib/graphViz';

export interface TypeInfo {
  title: string;
  description: string;
}

export interface RelationshipInfo {
  label: string;
  description: string;
  riskNote?: string;
}

export const NODE_TYPE_INFO: Record<string, TypeInfo> = {
  company: {
    title: 'Company',
    description:
      'An organization or employer identified by name or website domain. TrustLens tracks verification status and links to recruiters, reports, and scam patterns.',
  },
  recruiter: {
    title: 'Recruiter',
    description:
      'A person or hiring contact, usually identified by email. Gmail or free-email recruiters claiming big companies are a common fraud signal.',
  },
  domain: {
    title: 'Domain / Website',
    description:
      'A website hostname involved in hiring outreach, applications, or phishing. May be a company site, job portal clone, or scam landing page.',
  },
  report: {
    title: 'Community fraud report',
    description:
      'A user-submitted fraud report stored in TrustLens. Approved reports become evidence used in scans and similarity search.',
  },
  job_posting: {
    title: 'Analyzed job posting',
    description:
      'Text from a job or internship listing that was scanned by TrustLens. Risk score reflects scam patterns (fees, urgency, fake pay, etc.).',
  },
  scan: {
    title: 'Scan record',
    description:
      'A prior analysis run (message, email, company check, etc.) that mentioned or uncovered this entity.',
  },
};

export const STATUS_INFO: Record<string, string> = {
  verified:
    'Passed verification checks or has a clean trust record. Still confirm offers independently.',
  suspicious:
    'Flagged by rules, community reports, or trust signals. Treat outreach as high-risk until verified.',
  predatory:
    'Identified as a predatory internship or pay-for-certificate scheme. Avoid engagement.',
  approved:
    'Community report reviewed and accepted as credible evidence in the trust database.',
  pending: 'Report submitted but not yet reviewed by an administrator.',
  rejected: 'Report reviewed and not accepted as credible evidence.',
  unverified: 'No strong trust or fraud signal yet — insufficient data to classify.',
};

export const RELATIONSHIP_INFO: Record<string, RelationshipInfo> = {
  same_as: {
    label: 'Same entity',
    description: 'The company record and its primary web domain refer to the same organization.',
  },
  same_email_domain: {
    label: 'Corporate email domain',
    description:
      "The recruiter's email domain matches this company/domain. Legitimate if the domain is the company's real site; suspicious if mismatched.",
    riskNote: 'Recruiters using Gmail/Yahoo while claiming a corporate domain elsewhere are high risk.',
  },
  claims_company: {
    label: 'Claims to represent',
    description:
      'This recruiter states they hire for or represent this company. Does not prove the claim is true.',
    riskNote: 'Verify the company careers page and official contact channels before sharing data.',
  },
  reported_against: {
    label: 'Reported as fraudulent',
    description:
      'An approved or pending community report alleges fraud involving the target entity.',
    riskNote: 'Multiple reports against linked entities increase overall network risk.',
  },
  mentions_domain: {
    label: 'Mentions domain',
    description:
      'A scanned job posting, message, or scan referenced this website or domain in its content.',
  },
  mentions_recruiter: {
    label: 'Mentions recruiter',
    description: 'A scanned job posting referenced this recruiter email or contact.',
  },
  shared_network: {
    label: 'Shared fraud network',
    description:
      'These entities appear in the same suspicious cluster — often co-occurring in reports or recruiter claims.',
    riskNote: 'Entities in a shared network may be operated by the same scam campaign.',
  },
  hosts_phishing_for: {
    label: 'Phishing site for',
    description:
      'This domain hosts or redirects to a phishing/fake portal impersonating hiring or the linked company.',
    riskNote: 'Do not enter credentials or pay fees on this domain.',
  },
  phishing_sent_by: {
    label: 'Phishing distributed by',
    description: 'This recruiter contact was associated with sending or promoting the phishing domain.',
  },
};

function formatType(type: string): string {
  return type.replace(/_/g, ' ');
}

function nodeLabel(node: ForceGraphNode | undefined, fallbackId: string): string {
  return node?.name || fallbackId;
}

export function getNodeTypeInfo(type: string): TypeInfo {
  return (
    NODE_TYPE_INFO[type] ?? {
      title: formatType(type),
      description: 'An entity in the TrustLens trust graph.',
    }
  );
}

export function getRelationshipInfo(relationship: string): RelationshipInfo {
  return (
    RELATIONSHIP_INFO[relationship] ?? {
      label: formatType(relationship),
      description: 'A recorded relationship discovered during scans, verification, or community reporting.',
    }
  );
}

export function explainNode(node: ForceGraphNode): {
  typeInfo: TypeInfo;
  statusExplanation: string | null;
  interpretation: string;
} {
  const typeInfo = getNodeTypeInfo(node.type);
  const statusExplanation = node.status ? STATUS_INFO[node.status] ?? null : null;

  let interpretation: string;
  if (node.status === 'predatory') {
    interpretation =
      'This entity is on TrustLens predatory watchlist. It has been linked to internship or hiring scams.';
  } else if (node.status === 'suspicious') {
    interpretation =
      'This entity has suspicious trust signals. Check linked reports and recruiters before engaging.';
  } else if (node.status === 'verified') {
    interpretation = 'This entity has a positive or clean verification record in TrustLens.';
  } else if (node.type === 'report' && node.status === 'approved') {
    interpretation = 'This is confirmed community evidence of fraud involving linked entities.';
  } else if ((node.degree ?? 0) >= 4) {
    interpretation =
      'This is a highly connected hub in the network — often a recruiter or company linking multiple scam entities.';
  } else {
    interpretation = typeInfo.description;
  }

  return { typeInfo, statusExplanation, interpretation };
}

export function explainLink(
  relationship: string,
  source: ForceGraphNode | undefined,
  target: ForceGraphNode | undefined,
  sourceId: string,
  targetId: string,
): {
  info: RelationshipInfo;
  summary: string;
} {
  const info = getRelationshipInfo(relationship);
  const srcType = source?.type ?? sourceId.split(':')[0] ?? 'entity';
  const tgtType = target?.type ?? targetId.split(':')[0] ?? 'entity';
  const srcName = nodeLabel(source, sourceId.includes(':') ? sourceId.split(':').slice(1).join(':') : sourceId);
  const tgtName = nodeLabel(target, targetId.includes(':') ? targetId.split(':').slice(1).join(':') : targetId);

  const summary = `${formatType(srcType)} “${srcName}” → ${info.label.toLowerCase()} → ${formatType(tgtType)} “${tgtName}”`;

  return { info, summary };
}

export function getNodeConnections(
  nodeId: string,
  links: { source: string | { id: string }; target: string | { id: string }; relationship: string }[],
): { relationship: string; otherId: string; direction: 'out' | 'in' }[] {
  const results: { relationship: string; otherId: string; direction: 'out' | 'in' }[] = [];
  for (const link of links) {
    const s = typeof link.source === 'string' ? link.source : link.source.id;
    const t = typeof link.target === 'string' ? link.target : link.target.id;
    if (s === nodeId) results.push({ relationship: link.relationship, otherId: t, direction: 'out' });
    if (t === nodeId) results.push({ relationship: link.relationship, otherId: s, direction: 'in' });
  }
  return results;
}
