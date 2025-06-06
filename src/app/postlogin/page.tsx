'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import PostLoginModal from '@/components/PostLoginFlow/PostLoginModal';

export default function PostLoginPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router, isClient]);

  if (!isClient) {
    return null; // Return null during server-side rendering
  }

  return (
    <div className="post-login-page">
      <PostLoginModal />
    </div>
  );
} 