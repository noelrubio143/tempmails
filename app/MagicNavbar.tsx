"use client"

import React, { useState, useEffect, useRef } from 'react';
import './style.css';

export interface NavItem {
  id: number;
  title: string;
  icon: string;
  color: string;
  iconType: string;
}

export const navItemsData: NavItem[] = [
  { id: 0, title: 'Home', icon: 'fa-house', color: '#00d2ff', iconType: 'solid' },
  { id: 1, title: 'Inbox', icon: 'fa-envelope', color: '#38bdf8', iconType: 'solid' },
  { id: 2, title: 'Chat', icon: 'fa-comment', color: '#00ff87', iconType: 'regular' },
  { id: 3, title: 'Games', icon: 'fa-gamepad', color: '#ffb703', iconType: 'solid' },
  { id: 4, title: 'Settings', icon: 'fa-gear', color: '#ff0076', iconType: 'solid' },
];

export interface MagicNavbarProps {
  className?: string;
  onNavSelect?: (id: number, item: NavItem) => void;
  initialIndex?: number;
}

export default function MagicNavbar({ className = '', onNavSelect, initialIndex = 0 }: MagicNavbarProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({ left: 0 });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const listRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('ast-fa6-cdn')) {
      const link = document.createElement('link');
      link.id = 'ast-fa6-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateIndicatorPosition = (index: number) => {
    const activeElement = listRefs.current[index];
    if (activeElement) {
      const activeColor = navItemsData[index]?.color || '#00d2ff';
      const offsetLeft = activeElement.offsetLeft;
      const elementWidth = activeElement.offsetWidth || 70;
      const indicatorOffset = offsetLeft + (elementWidth / 2) - 35;
      
      setIndicatorStyle({
        left: 0,
        transform: `translateX(${indicatorOffset}px)`,
      });
      
      if (activeElement.parentElement?.parentElement?.parentElement) {
        activeElement.parentElement.parentElement.parentElement.style.setProperty('--active-clr', activeColor);
      }
    }
  };

  useEffect(() => {
    updateIndicatorPosition(activeIndex);
    const raf = requestAnimationFrame(() => updateIndicatorPosition(activeIndex));
    const timer = setTimeout(() => updateIndicatorPosition(activeIndex), 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [activeIndex, windowWidth]);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    updateIndicatorPosition(index);
    if (onNavSelect) {
      onNavSelect(navItemsData[index].id, navItemsData[index]);
    }
  };

  return (
    <div className={`magic-nav-wrapper ${className}`} style={{ '--active-clr': navItemsData[activeIndex]?.color || '#00d2ff' } as React.CSSProperties}>
      <nav className="magic-navigation">
        <ul className="relative flex w-full w-full px-2.5 m-0 p-0">
          {navItemsData.map((item, index) => (
            <li 
              key={item.id}
              ref={(el) => (listRefs.current[index] = el)}
              className={`magic-nav-item ${activeIndex === index ? 'active' : ''}`}
              style={{ '--clr': item.color } as React.CSSProperties}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(index);
              }}
            >
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(index);
                }}
              >
                <span className="icon">
                  <i className={`fa-${item.iconType || 'solid'} ${item.icon}`}></i>
                </span>
                <span className="text">{item.title}</span>
              </a>
            </li>
          ))}
          <div className="magic-indicator" style={indicatorStyle}></div>
        </ul>
      </nav>
    </div>
  );
}
