import React from 'react';
import EventsSection from '@/domains/events/components/EventsSection/EventsSection';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center">
      <EventsSection />
    </div>
  );
} 