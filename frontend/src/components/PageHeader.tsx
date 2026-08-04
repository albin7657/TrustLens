'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export default function PageHeader({
  title,
  description,
  backHref = '/overview',
  backLabel = 'Back to Home',
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-slate-500">{description}</p>}
    </div>
  );
}
