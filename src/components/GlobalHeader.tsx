'use client';

import { Menu, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/lib/store';

export function GlobalHeader() {
  const { ui, toggleTheme, setTheme, toggleSidebar } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    // Apply theme to document with smooth transition
    document.documentElement.style.setProperty('--theme-transition', '0.3s ease');
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [setTheme]);

  // Sync theme changes with document and localStorage
  useEffect(() => {
    if (!mounted) return;
    
    localStorage.setItem('theme', ui.theme);
    
    // Add smooth transition for theme changes
    document.documentElement.style.setProperty('--theme-transition', '0.3s ease');
    
    if (ui.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [ui.theme, mounted]);

  const handleToggleTheme = () => {
    // Add haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Announce theme change to screen readers
    const newTheme = ui.theme === 'light' ? 'dark' : 'light';
    const announcement = `Switched to ${newTheme} mode`;
    
    // Create temporary announcement element for screen readers
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
    
    toggleTheme();
  };

  const handleMenuClick = () => {
    toggleSidebar();
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <header className="bg-sand border-b border-border px-4 py-3 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button 
            className="p-2 hover:bg-accent-bg rounded-md transition-all duration-200 lg:hidden focus:outline-none focus:ring-2 focus:ring-peach focus:ring-offset-2"
            aria-label="Open menu"
            disabled
          >
            <Menu className="w-5 h-5 text-navy" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy rounded-md flex items-center justify-center transition-colors duration-300">
              <span className="text-sand font-bold text-sm">LS</span>
            </div>
            <h1 className="text-navy font-semibold text-lg transition-colors duration-300">
              Literature Synthesizer
            </h1>
          </div>
        </div>
        
        <button
          className="p-2 hover:bg-accent-bg rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-peach focus:ring-offset-2"
          aria-label="Toggle theme"
          disabled
        >
          <Moon className="w-5 h-5 text-navy" />
        </button>
      </header>
    );
  }

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-sand dark:bg-navy border-b border-border px-4 py-3 flex items-center justify-between shadow-sm backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <motion.button 
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95, rotate: -5 }}
          onClick={handleMenuClick}
          className="p-2 hover:bg-accent-bg rounded-md transition-all duration-200 lg:hidden focus:outline-none focus:ring-2 focus:ring-peach focus:ring-offset-2 hover:shadow-md hover:-translate-y-0.5 hover:shadow-peach/20 active:translate-y-0 active:shadow-sm"
          aria-label="Toggle menu"
        >
          <motion.div
            animate={{ rotate: ui.sidebarOpen ? 90 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Menu className="w-5 h-5 text-navy dark:text-sand transition-colors duration-300" />
          </motion.div>
        </motion.button>
        
        <motion.div 
          className="flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div 
            whileHover={{ 
              scale: 1.1, 
              rotate: [0, -5, 5, 0],
              boxShadow: '0 4px 12px rgba(217, 193, 161, 0.3)'
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-8 h-8 bg-navy dark:bg-sand rounded-md flex items-center justify-center transition-all duration-300 cursor-pointer shadow-sm"
          >
            <motion.span 
              className="text-sand dark:text-navy font-bold text-sm transition-colors duration-300"
              animate={{ 
                scale: ui.theme === 'dark' ? [1, 1.1, 1] : [1, 0.9, 1] 
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              LS
            </motion.span>
          </motion.div>
          <motion.h1 
            className="text-navy dark:text-sand font-semibold text-lg transition-colors duration-300"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Literature Synthesizer
          </motion.h1>
        </motion.div>
      </div>
      
      <motion.button
        whileHover={{ 
          scale: 1.1, 
          rotate: ui.theme === 'dark' ? 180 : -180,
          boxShadow: '0 4px 12px rgba(217, 193, 161, 0.4)'
        }}
        whileTap={{ scale: 0.9 }}
        onClick={handleToggleTheme}
        className="relative p-2 hover:bg-accent-bg rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-peach focus:ring-offset-2 hover:shadow-xl hover:shadow-peach/20 hover:-translate-y-1"
        aria-label={ui.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <motion.div
          className="relative w-5 h-5 overflow-hidden"
          animate={{ rotate: ui.theme === 'dark' ? 360 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <motion.div
            animate={{ 
              rotate: ui.theme === 'dark' ? 0 : 180,
              opacity: ui.theme === 'dark' ? 1 : 0,
              scale: ui.theme === 'dark' ? 1 : 0.5
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Sun className="w-5 h-5 text-sand drop-shadow-sm" />
          </motion.div>
          <motion.div
            animate={{ 
              rotate: ui.theme === 'dark' ? -180 : 0,
              opacity: ui.theme === 'dark' ? 0 : 1,
              scale: ui.theme === 'dark' ? 0.5 : 1
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Moon className="w-5 h-5 text-navy dark:text-sand drop-shadow-sm" />
          </motion.div>
        </motion.div>
        
        {/* Subtle glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-peach/20 -z-10"
          animate={{ 
            scale: ui.theme === 'dark' ? [1, 1.2, 1] : [1, 1.1, 1],
            opacity: [0, 0.3, 0]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: 'easeInOut',
            delay: 0.5
          }}
        />
      </motion.button>
    </motion.header>
  );
}