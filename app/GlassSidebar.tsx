"use client"

import React, { useState } from 'react';
import './style.css';

export interface GlassSidebarNavItem {
  name: string;
  icon: React.ReactNode;
  count?: number;
  badge?: string;
  onClick?: () => void;
}

export interface GlassSidebarProps {
  className?: string;
  brandTitle?: string;
  brandLetter?: string;
  activeItem?: string;
  onItemSelect?: (name: string) => void;
  items?: GlassSidebarNavItem[];
}

export default function GlassSidebar({
  className = '',
  brandTitle = 'FLEET CHAT COMMUNITY',
  brandLetter = 'F',
  activeItem: controlledActive,
  onItemSelect,
  items,
}: GlassSidebarProps) {
  const [internalActiveItem, setInternalActiveItem] = useState('Public');
  const activeItem = controlledActive ?? internalActiveItem;

  const defaultNavItems: GlassSidebarNavItem[] = [
    {
      name: 'Public',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      count: 1,
    },
    {
      name: "Jack 'en Poy",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="6" width="20" height="12" rx="6" />
          <path d="M6 12h4m-2-2v4m7-2h.01m3 0h.01" />
        </svg>
      ),
      count: 1,
    },
    {
      name: 'Tower',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
          <line x1="13" y1="19" x2="19" y2="13" />
          <line x1="16" y1="16" x2="20" y2="20" />
          <line x1="19" y1="21" x2="21" y2="19" />
        </svg>
      ),
      count: 1,
    },
    {
      name: 'PokeBeasts',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      count: 1,
    },
    {
      name: 'Staff',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      count: 1,
    },
    {
      name: 'Secret Lover',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      count: 1,
    },
    {
      name: 'Direct Messages',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      count: 0,
    },
    {
      name: 'Fleet Roster',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  const navItems = items || defaultNavItems;

  const handleSelect = (name: string, item: GlassSidebarNavItem) => {
    if (!controlledActive) {
      setInternalActiveItem(name);
    }
    if (onItemSelect) {
      onItemSelect(name);
    }
    if (item.onClick) {
      item.onClick();
    }
  };

  return (
    <div className={`glass-sidebar-wrapper ${className}`}>
      <nav className="glass-sidebar">
        <div className="brand">
          <div className="logo-box">{brandLetter}</div>
          <h2>{brandTitle}</h2>
        </div>

        <ul className="nav-links">
          {navItems.map((item) => (
            <li
              key={item.name}
              className={`nav-item ${activeItem === item.name ? 'active' : ''}`}
              onClick={() => handleSelect(item.name, item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSelect(item.name, item);
              }}
              role="button"
              tabIndex={0}
            >
              <span className="icon" aria-hidden="true">{item.icon}</span>
              <span className="text">{item.name}</span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span className="nav-count">{item.count}</span>
              )}
              {item.badge && (
                <span className="nav-count">{item.badge}</span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
