'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JobScannerRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/scan?tab=job');
  }, [router]);
  return <div className="p-8 text-slate-500">Redirecting to Scan Center...</div>;
}
