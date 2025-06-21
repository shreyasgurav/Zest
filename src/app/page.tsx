import React from 'react';
import GuidesSection from '@/components/GuidesSection/GuidesSection';
import EventsSection from '@/components/EventsSection/EventsSection';
import ActivitySection from '@/components/ActivitySection/ActivitySection';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center">
      <EventsSection />
      <ActivitySection />
    </div>
  );
} 