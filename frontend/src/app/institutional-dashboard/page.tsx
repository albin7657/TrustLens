'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstitutionalDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin');
  }, [router]);
  return <div className="p-8 text-slate-500">Redirecting to Admin Dashboard...</div>;
}
