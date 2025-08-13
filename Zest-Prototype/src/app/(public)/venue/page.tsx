'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import VenueProfile from '@/domains/profiles/components/VenueProfile/VenueProfile';
import RoleGuard from '@/domains/authentication/components/RoleGuard/RoleGuard';

const VenuePage: React.FC = () => {
  const searchParams = useSearchParams();
  const pageId = searchParams?.get('page');

  return (
    <RoleGuard allowedRole="venue">
      <VenueProfile selectedPageId={pageId} />
    </RoleGuard>
  );
};

export default VenuePage; 