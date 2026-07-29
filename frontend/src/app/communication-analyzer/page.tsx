'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CommunicationAnalyzerRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/scan?tab=message');
  }, [router]);
  return <div className="p-8 text-slate-500">Redirecting to Scan Center...</div>;
}
