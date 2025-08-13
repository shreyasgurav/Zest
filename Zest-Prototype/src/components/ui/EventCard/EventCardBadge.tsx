'use client';

import React from 'react';
import styles from './EventCardBadge.module.css';

interface EventCardBadgeProps {
  tag: {
    type: 'collaboration' | 'featured' | 'soldout' | 'new' | 'popular';
    label?: string;
    metadata?: Record<string, any>;
  };
  onClick?: (tag: any) => void;
  variant?: 'default' | 'compact' | 'wide' | 'dashboard';
}

export const EventCardBadge: React.FC<EventCardBadgeProps> = ({
  tag,
  onClick,
  variant = 'default'
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event card click
    if (onClick) {
      onClick(tag);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (onClick) {
        onClick(tag);
      }
    }
  };

  const getBadgeContent = () => {
    switch (tag.type) {
      case 'collaboration':
        return tag.label || 'COLLAB';
      case 'featured':
        return tag.label || 'FEATURED';
      case 'soldout':
        return tag.label || 'SOLD OUT';
      case 'new':
        return tag.label || 'NEW';
      case 'popular':
        return tag.label || 'POPULAR';
      default:
        return tag.label || 'BADGE';
    }
  };

  const badgeClasses = [
    styles.badge,
    styles[tag.type],
    styles[variant],
    onClick && styles.clickable
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={badgeClasses}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <span className={styles.badgeText}>
        {getBadgeContent()}
      </span>
    </div>
  );
}; 