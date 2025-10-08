'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import OrganisationProfile from '@/domains/profiles/components/OrganisationProfile/OrganisationProfile';
import RoleGuard from '@/domains/authentication/components/RoleGuard/RoleGuard';

export default function OrganisationPage() {
  const searchParams = useSearchParams();
  const pageId = searchParams?.get('page');

  return (
    <RoleGuard allowedRole="organization">
      <main className="container mx-auto px-4 py-8">
        <OrganisationProfile selectedPageId={pageId} />
      </main>
    </RoleGuard>
  );
} 