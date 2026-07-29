'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportingAssistantRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/reports?tab=complaint');
  }, [router]);
  return <div className="p-8 text-slate-500">Redirecting to Reporting Assistant...</div>;
}
