'use client';

import { useState } from 'react';

export default function TaskReminder() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-12px)]'
      }`}
    >
      {/* Toggle Chevron Handle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border-l border-y border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-black rounded-l-lg p-2 transition-colors cursor-pointer focus:outline-none flex items-center justify-center shadow-[-2px_0_8px_rgba(0,0,0,0.02)]"
        style={{
          height: '40px',
          width: '24px',
          borderRight: '0',
        }}
        aria-label={isOpen ? 'Collapse reminder' : 'Expand reminder'}
      >
        {isOpen ? (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        )}
      </button>

      {/* Drawer Panel */}
      <div className="w-[200px] bg-white/95 backdrop-blur-md border border-gray-200/85 shadow-[-10px_0_30px_rgba(0,0,0,0.06)] rounded-l-2xl p-4 text-left font-manrope">
        <div className="space-y-4">
          <div>
            <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Starting Prompt
            </h4>
            <p className="text-[12px] text-gray-700 leading-relaxed font-medium bg-gray-50/50 p-2 rounded-lg border border-gray-100">
              Help me plan a quick dinner. I have [items].
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Fridge Inventory
            </h4>
            <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
              <p className="text-[12px] text-gray-700 leading-relaxed font-medium">
                Chicken breasts, Eggs, Broccoli, Spinach, Rice, Spaghetti, Soy
                sauce, Garlic, and Butter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
