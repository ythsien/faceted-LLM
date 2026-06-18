'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const prototypes = [
  { id: 0, name: 'Prototype 0–Gray', color: '#e4e4e4', path: '/proto0' },
  { id: 1, name: 'Prototype 1–Red', color: '#ffcaca', path: '/proto1' },
  { id: 2, name: 'Prototype 2–Yellow', color: '#fff5c2', path: '/proto2' },
  { id: 3, name: 'Prototype 3–Green', color: '#d5ffdb', path: '/proto3' },
  { id: 4, name: 'Prototype 4–Blue', color: '#dae4ff', path: '/proto4' },
  { id: 5, name: 'Prototype 5–Purple', color: '#f5dbff', path: '/proto5' },
];

export default function StartPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('participant_id');
    if (savedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParticipantId(savedId);
    }
    setIsMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = inputId.trim();
    if (!trimmedId) {
      setError('Please enter a Participant ID to proceed.');
      return;
    }
    localStorage.setItem('participant_id', trimmedId);
    setParticipantId(trimmedId);
    setError(null);
  };

  const handleChangeId = () => {
    localStorage.removeItem('participant_id');
    setParticipantId(null);
    setInputId('');
    setError(null);
  };

  // Prevent hydration flash of incorrect layout
  if (!isMounted) {
    return (
      <div className="bg-neutral-50 min-h-screen w-full flex items-center justify-center font-manrope">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-200 border-t-indigo-600 animate-spin" />
          <p className="text-neutral-500 text-sm font-medium">
            Loading session...
          </p>
        </div>
      </div>
    );
  }

  // Gatekeeper Form Mode
  if (!participantId) {
    return (
      <div className="bg-neutral-50 min-h-screen w-full relative flex items-center justify-center font-manrope overflow-hidden px-4">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative w-full max-w-[420px] bg-white/80 backdrop-blur-xl border border-neutral-200/50 p-8 rounded-3xl shadow-2xl transition-all duration-300">
          <div className="flex flex-col items-center text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">
              AI Interface Study
            </h1>
            <p className="text-sm text-neutral-500 mt-2 max-w-[320px]">
              Please enter your Participant ID.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="participant-id"
                className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2"
              >
                Participant ID
              </label>
              <input
                id="participant-id"
                type="text"
                value={inputId}
                onChange={(e) => {
                  setInputId(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. P-101"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 font-medium"
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-xs font-medium mt-2 flex items-center gap-1.5 animate-pulse">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 shrink-0"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="group w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-3.5 px-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              Unlock Prototypes
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Prototype List View (Active State)
  return (
    <div className="bg-white min-h-screen w-full relative flex flex-col items-center pt-[80px] pb-[80px] font-manrope text-black">
      {/* Sleek Participant Badge & Change Handler */}
      <div className="absolute top-4 right-4 flex items-center gap-3 bg-neutral-50 border border-neutral-200/60 px-4 py-2 rounded-full shadow-sm text-sm">
        <span className="text-neutral-500 font-medium">
          Participant:{' '}
          <strong className="text-neutral-800">{participantId}</strong>
        </span>
        <button
          onClick={handleChangeId}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer border-l border-neutral-200 pl-3"
        >
          Change ID
        </button>
      </div>

      <h1 className="font-extrabold text-[32px] text-neutral-800 tracking-tight mb-3">
        Prototypes
      </h1>
      <p className="text-neutral-500 text-sm max-w-[500px] text-center mb-12 px-6">
        Please only proceed with prototypes advised by the moderator.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] max-w-[1000px] w-full px-8">
        {prototypes.map((proto) => (
          <Link
            key={proto.id}
            href={proto.path}
            className="group relative bg-gradient-to-b border border-[#ededed] border-solid flex flex-col items-start justify-end p-[24px] rounded-[24px] aspect-square transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${proto.color}, white)`,
            }}
          >
            <p className="font-bold text-[20px] text-black w-full">
              {proto.name}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
