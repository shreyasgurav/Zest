'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import RoleGuard from '@/domains/authentication/components/RoleGuard/RoleGuard';

// Dynamically import UserProfile with no SSR
const UserProfile = dynamic(
  () => import('@/domains/profiles/components/UserProfile/UserProfile'),
  { 
    ssr: false,
    loading: () => (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'rgba(17, 17, 17, 0.95)'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }
);

export default function ProfilePage() {
  return (
    <RoleGuard allowedRole="user">
      <Suspense fallback={
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(17, 17, 17, 0.95)'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      }>
        <UserProfile />
      </Suspense>
    </RoleGuard>
  );
} 