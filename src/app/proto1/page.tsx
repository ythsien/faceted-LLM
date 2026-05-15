'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  facets?: Record<string, string>;
}

const FACETS = {
  Tone: ['Formal', 'Casual', 'Upbeat', 'Professional', 'Neutral'],
  Format: ['Paragraph', 'Bulleted List', 'Email', 'Table', 'Short Notes'],
  Length: ['Concise', 'Standard', 'Detailed'],
  Audience: ['General', 'Expert', 'Partner', 'Child', 'Colleague'],
};

export default function Proto1Page() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFacets, setSelectedFacets] = useState<Record<string, string>>(
    {}
  );
  const [isFacetPanelOpen, setIsFacetPanelOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to collapse
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputContainerRef.current &&
        !inputContainerRef.current.contains(event.target as Node)
      ) {
        setIsFacetPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-expand textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [input]);

  // Scroll to bottom when user sends a message or loading starts
  useEffect(() => {
    if (isChatting) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'user' || isLoading) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, isLoading, isChatting]);

  const toggleFacet = (category: string, value: string) => {
    setSelectedFacets((prev) => {
      const newFacets = { ...prev };
      if (newFacets[category] === value) {
        delete newFacets[category];
      } else {
        newFacets[category] = value;
      }
      return newFacets;
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    let hiddenPrompt = input;
    const activeFacets = Object.entries(selectedFacets);
    if (activeFacets.length > 0) {
      const constraints = activeFacets.map(([k, v]) => `${k}: ${v}`).join(', ');
      hiddenPrompt += `\n\nConstraints: ${constraints}`;
    }

    const displayMessage: Message = {
      role: 'user',
      content: input,
      facets: { ...selectedFacets },
    };

    const apiMessages = [
      ...messages.map((m) => m),
      { role: 'user', content: hiddenPrompt },
    ];
    const newMessages = [...messages, displayMessage];

    setMessages(newMessages);
    setInput('');
    setIsChatting(true);
    setIsLoading(true);
    setIsFacetPanelOpen(false);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: `Error: ${errorData.error || 'Something went wrong'}`,
          },
        ]);
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);
      setIsLoading(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: assistantContent,
            };
            return updated;
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Network Error: ${errorMessage}` },
      ]);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setIsChatting(false);
    setInput('');
    setIsLoading(false);
    setSelectedFacets({});
    setIsFacetPanelOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-white font-manrope relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #FFE5E5 0%, #FFFFFF 30%)',
        }}
      />

      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-white/50 backdrop-blur-md z-10">
        <Link
          href="/"
          className="text-sm font-medium text-gray-700 hover:text-black transition-colors cursor-pointer"
        >
          ← Back to Directory
        </Link>
        <div className="text-sm font-semibold text-gray-500">
          Prototype 1–Red
        </div>
        <button
          onClick={handleReset}
          className="text-sm font-medium text-gray-500 hover:text-black transition-colors px-3 py-1 rounded-full border border-gray-200 hover:border-gray-400 bg-white/50 cursor-pointer"
        >
          New Chat
        </button>
      </header>

      <main className="flex-1 overflow-y-auto relative flex flex-col z-0">
        {!isChatting ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 z-0">
            <h1 className="text-4xl font-bold text-black opacity-80 mb-8 mt-12">
              What&apos;s on your mind?
            </h1>

            <div className="w-full max-w-5xl bg-white border border-gray-200 rounded-[24px] shadow-sm flex overflow-hidden min-h-[500px]">
              <div className="w-1/3 border-r border-gray-100 p-6 overflow-y-auto bg-gray-50/30">
                <FacetPanel
                  selectedFacets={selectedFacets}
                  toggleFacet={toggleFacet}
                />
              </div>
              <div className="flex-1 flex flex-col relative bg-white">
                <form
                  onSubmit={handleSubmit}
                  className="flex-1 flex flex-col p-6"
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything"
                    className="w-full flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 text-[18px] resize-none shadow-none appearance-none placeholder-gray-400 cursor-text"
                  />
                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="p-3 bg-black text-white rounded-full hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors focus:outline-none cursor-pointer"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m5 12 7-7 7 7" />
                        <path d="M12 19V5" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-x-hidden">
            <div className="max-w-3xl w-full mx-auto p-6 space-y-8 pb-64">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-[24px] text-[16px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#F2F2F2] text-black px-5 py-3 whitespace-pre-wrap'
                        : 'text-black prose prose-slate max-w-none prose-p:my-0 [&_li_p]:mb-0'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="flex flex-col gap-1">
                        <div>{msg.content}</div>
                        {msg.facets && Object.keys(msg.facets).length > 0 && (
                          <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 font-medium">
                            {Object.entries(msg.facets).map(
                              ([key, val], idx, arr) => (
                                <span key={key}>
                                  {key}: {val}
                                  {idx < arr.length - 1 ? ', ' : ''}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-[12px] last:mb-0">{children}</p>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold mb-4">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-bold mb-3">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-bold mb-2">
                              {children}
                            </h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc ml-6 mb-3">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal ml-6 mb-3">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="mb-0">{children}</li>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start">
                  <div className="animate-pulse text-gray-400 text-sm italic">
                    Gemini is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 flex flex-col items-center bg-gradient-to-t from-white via-white to-transparent pointer-events-none z-20">
              <div
                ref={inputContainerRef}
                className={`pointer-events-auto bg-white border border-gray-200 rounded-[28px] shadow-lg flex overflow-hidden transition-all duration-500 ease-in-out ${
                  isFacetPanelOpen
                    ? 'w-full max-w-5xl h-[450px]'
                    : 'w-full max-w-3xl h-[64px]'
                }`}
              >
                {/* Facet Panel - Slides down directly, width only 1/3 when open */}
                <div
                  className={`border-r border-gray-100 overflow-y-auto bg-gray-50/30 transition-all duration-500 transform ${
                    isFacetPanelOpen
                      ? 'w-1/3 p-6 translate-y-0 opacity-100 visible'
                      : 'w-0 p-0 translate-y-full opacity-0 invisible absolute'
                  }`}
                >
                  <FacetPanel
                    selectedFacets={selectedFacets}
                    toggleFacet={toggleFacet}
                  />
                </div>

                <div className="flex-1 flex flex-col relative bg-white overflow-hidden">
                  <form
                    onSubmit={handleSubmit}
                    className="flex-1 flex flex-col p-2"
                  >
                    <div className="flex items-start flex-1">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setIsFacetPanelOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything"
                        rows={1}
                        className={`flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 resize-none shadow-none appearance-none transition-all duration-300 text-left ${
                          isFacetPanelOpen
                            ? 'text-[18px] p-4 cursor-text'
                            : 'text-[16px] py-3 px-4 cursor-pointer'
                        }`}
                        style={{ height: 'auto', minHeight: '48px' }}
                      />
                    </div>
                    <div
                      className={`flex justify-end items-center px-2 pb-1 transition-opacity duration-200 ${input.trim() || isFacetPanelOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
                    >
                      <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors focus:outline-none cursor-pointer"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m5 12 7-7 7 7" />
                          <path d="M12 19V5" />
                        </svg>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FacetPanel({
  selectedFacets,
  toggleFacet,
}: {
  selectedFacets: Record<string, string>;
  toggleFacet: (category: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {Object.entries(FACETS).map(([category, options]) => (
        <div key={category} className="flex flex-col gap-2 min-w-[150px]">
          <div className="text-sm text-gray-400 font-medium">{category}</div>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const isSelected = selectedFacets[category] === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleFacet(category, option)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-black border-black text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
