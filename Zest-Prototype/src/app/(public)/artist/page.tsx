'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ArtistProfile from '@/domains/profiles/components/ArtistProfile/ArtistProfile';
import RoleGuard from '@/domains/authentication/components/RoleGuard/RoleGuard';

const ArtistPage: React.FC = () => {
  const searchParams = useSearchParams();
  const pageId = searchParams?.get('page');

  return (
    <RoleGuard allowedRole="artist">
      <ArtistProfile selectedPageId={pageId} />
    </RoleGuard>
  );
};

export default ArtistPage; 