'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TrustRepositoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/intelligence?tab=search');
  }, [router]);
  return <div className="p-8 text-slate-500">Redirecting to Trust Intelligence...</div>;
}
