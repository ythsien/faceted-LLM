'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  apiContent?: string;
  facets?: Record<string, string>;
}

export default function Proto3Page() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Prototype 3 Specific State
  const [generatedFacets, setGeneratedFacets] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [visibleFacetKeys, setVisibleFacetKeys] = useState<string[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<Record<string, string>>(
    {}
  );
  const [isGeneratingFacets, setIsGeneratingFacets] = useState(false);
  const [showLoadingState, setShowLoadingState] = useState(false);

  // Typing detection
  const [lastTypingTime, setLastTypingTime] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const staggeredTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Handle click outside to collapse
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputContainerRef.current &&
        !inputContainerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-expand textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Scroll to bottom
  useEffect(() => {
    if (isChatting) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'user') {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, isChatting]);

  const clearStaggeredTimers = () => {
    staggeredTimersRef.current.forEach(clearTimeout);
    staggeredTimersRef.current = [];
  };

  // Staggered entry for facets
  useEffect(() => {
    if (generatedFacets && !isGeneratingFacets) {
      const allKeys = Object.keys(generatedFacets);

      allKeys.forEach((key, index) => {
        setVisibleFacetKeys((prev) => {
          if (prev.includes(key)) return prev;

          const timer = setTimeout(
            () => {
              setVisibleFacetKeys((current) => {
                if (!current.includes(key)) {
                  return [...current, key];
                }
                return current;
              });
            },
            (index + 1) * 500
          );

          staggeredTimersRef.current.push(timer);
          return prev;
        });
      });
    }
    return clearStaggeredTimers;
  }, [generatedFacets, isGeneratingFacets]);

  const generateFacets = useCallback(
    async function gf(promptText: string, attempts = 0) {
      const idleTime = Date.now() - lastTypingTime;
      // For Multi-turn, we still want idle stability while drafting a single prompt
      if (idleTime > 2000 && generatedFacets) return;

      setIsGeneratingFacets(true);

      try {
        const res = await fetch('/api/proto3/generate-facets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText }),
        });

        if (!res.ok) {
          if (res.status === 503 && attempts < 2) {
            console.log(
              `Retrying facet generation due to 503 error (attempt ${attempts + 1})...`
            );
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return gf(promptText, attempts + 1);
          }
          setIsGeneratingFacets(false);
          return;
        }

        const data = await res.json();
        if (data.facets) {
          setGeneratedFacets((prev) => {
            if (!prev) return data.facets;

            // Smart merge within the current turn
            const merged = { ...data.facets };
            Object.keys(selectedFacets).forEach((key) => {
              if (prev[key]) merged[key] = prev[key];
            });
            return merged;
          });
        }
      } catch (error) {
        console.error('Error generating facets:', error);
      } finally {
        setIsGeneratingFacets(false);
      }
    },
    [selectedFacets, lastTypingTime, generatedFacets]
  );

  // Debounce logic for Progressive Trigger
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const words = input
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (words.length > 3) {
      debounceTimerRef.current = setTimeout(() => {
        generateFacets(input);
      }, 800);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [input, generateFacets]);

  const handleInputChange = (val: string) => {
    const prevInput = input;
    setInput(val);
    setLastTypingTime(Date.now());

    if (val.length === 0) {
      setShowLoadingState(false);
      setIsGeneratingFacets(false);
      setVisibleFacetKeys([]);
      setGeneratedFacets(null);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      return;
    }

    // Trigger loading state immediately when user starts typing (new turn or start)
    if (!showLoadingState && val.length > 0 && prevInput.length === 0) {
      setShowLoadingState(true);
      setIsGeneratingFacets(true);
    }
  };

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

    clearStaggeredTimers();
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    let hiddenPrompt = input;
    const activeFacets = Object.entries(selectedFacets);
    if (activeFacets.length > 0) {
      const constraints = activeFacets.map(([k, v]) => `${k}: ${v}`).join(', ');
      hiddenPrompt += `\n\nConstraints: ${constraints}`;
    }

    const displayMessage: Message = {
      role: 'user',
      content: input,
      apiContent: hiddenPrompt,
      facets: { ...selectedFacets },
    };

    const newMessages = [...messages, displayMessage];
    setMessages(newMessages);
    setInput('');
    setIsChatting(true);
    setIsLoading(true);
    setIsFocused(false);

    // Reset facets for the next turn
    setGeneratedFacets(null);
    setVisibleFacetKeys([]);
    setSelectedFacets({});
    setShowLoadingState(false);

    await performChat(newMessages);
  };

  const performChat = async (currentMessages: Message[], attempts = 0) => {
    try {
      const apiMessages = currentMessages.map((m) => ({
        role: m.role,
        content: m.apiContent || m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        if (res.status === 503 && attempts < 2) {
          console.log(
            `Retrying chat due to 503 error (attempt ${attempts + 1})...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return performChat(currentMessages, attempts + 1);
        }

        const errorData = await res.json();
        setMessages((prev) => [
          ...prev,
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

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      setIsLoading(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
            return updated;
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Network Error: ${errorMessage}` },
      ]);
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (isLoading || messages.length === 0) return;
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;
    const historyToRetry = messages.slice(0, lastUserIndex + 1);
    setMessages(historyToRetry);
    setIsLoading(true);
    await performChat(historyToRetry);
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
    setGeneratedFacets(null);
    setVisibleFacetKeys([]);
    setIsGeneratingFacets(false);
    setShowLoadingState(false);
    setIsFocused(false);
    clearStaggeredTimers();
  };

  return (
    <div className="flex flex-col h-screen bg-white font-manrope relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #D1F2D3 0%, #FFFFFF 40%)',
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
          Prototype 3–Green
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
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <h1 className="text-4xl font-bold text-black opacity-80 mb-12 text-center animate-in fade-in duration-1000">
              What&apos;s on your mind?
            </h1>

            <div className="w-full max-w-3xl flex flex-col bg-white border border-gray-200 rounded-[28px] shadow-sm overflow-hidden transition-all duration-300 hover:border-gray-300">
              <form onSubmit={handleSubmit} className="flex flex-col p-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything"
                  rows={1}
                  className={`w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 text-[16px] py-3 px-4 resize-none max-h-[300px] shadow-none appearance-none transition-all duration-300 ${
                    isFocused ? 'cursor-text' : 'cursor-pointer'
                  }`}
                  style={{ height: 'auto', minHeight: '48px' }}
                />

                <div
                  className={`flex justify-end items-center px-2 pb-1 transition-opacity duration-200 ${input.trim() ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
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

                <div
                  className={`transition-all duration-700 ease-in-out overflow-hidden ${showLoadingState ? 'max-h-[500px] opacity-100 border-t border-gray-200 mt-2' : 'max-h-0 opacity-0'}`}
                >
                  <div className="px-3 pb-3 pt-3 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-1000">
                      <div className="flex items-center gap-2">
                        {isGeneratingFacets && visibleFacetKeys.length === 0 ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-400"></div>
                        ) : (
                          <Image
                            src="/AI.png"
                            alt="AI Icon"
                            width={16}
                            height={16}
                            className="opacity-70"
                          />
                        )}
                        <span className="text-sm font-semibold text-gray-500">
                          {isGeneratingFacets && visibleFacetKeys.length === 0
                            ? 'Suggesting prompt enhancements...'
                            : 'Suggested prompt enhancements'}
                        </span>
                      </div>
                      {isGeneratingFacets && visibleFacetKeys.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 italic">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                          Updating...
                        </div>
                      )}
                    </div>

                    {visibleFacetKeys.length > 0 && (
                      <div className="flex flex-col gap-5 pb-2">
                        {generatedFacets &&
                          visibleFacetKeys.map((key) => {
                            const options = generatedFacets[key];
                            if (!options) return null;
                            return (
                              <div
                                key={key}
                                className="grid grid-cols-[120px_1fr] gap-4 items-start px-2 animate-in fade-in slide-in-from-bottom-3 duration-1000 ease-out"
                              >
                                <div className="text-[13px] font-semibold text-gray-500 pt-1.5">
                                  {key}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {options.map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => toggleFacet(key, option)}
                                      className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all duration-300 cursor-pointer ${
                                        selectedFacets[key] === option
                                          ? 'bg-black border-black text-white shadow-md'
                                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                                      }`}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-x-hidden">
            <div className="max-w-3xl w-full mx-auto p-6 space-y-8 pb-48">
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
                          <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 font-medium mt-1">
                            {Object.entries(msg.facets).map(
                              ([k, v], idx, arr) => (
                                <span key={k}>
                                  {k}: {v}
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
                            <p className="mb-4 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc ml-6 mb-4">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal ml-6 mb-4">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="mb-1">{children}</li>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  {msg.role === 'assistant' &&
                    i === messages.length - 1 &&
                    !isLoading && (
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors mt-2 ml-1"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                        </svg>
                        Retry
                      </button>
                    )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start">
                  <div className="animate-pulse text-gray-400 text-sm italic">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 flex flex-col items-center bg-gradient-to-t from-white via-white to-transparent z-20 pointer-events-none">
              <div
                className="w-full max-w-3xl flex flex-col gap-3 pointer-events-auto"
                ref={inputContainerRef}
              >
                <div className="bg-white border border-gray-200 rounded-[28px] shadow-lg flex overflow-hidden">
                  <form
                    onSubmit={handleSubmit}
                    className="flex-1 flex flex-col p-2"
                  >
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything"
                      rows={1}
                      className={`w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 text-[16px] py-3 px-4 resize-none max-h-[200px] shadow-none appearance-none transition-all duration-300 ${
                        isFocused ? 'cursor-text' : 'cursor-pointer'
                      }`}
                      style={{ height: 'auto', minHeight: '48px' }}
                    />

                    <div
                      className={`flex justify-end items-center px-2 pb-1 transition-opacity duration-200 ${input.trim() ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
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

                    <div
                      className={`transition-all duration-700 ease-in-out overflow-hidden ${isFocused || input.length > 0 ? (showLoadingState ? 'max-h-[500px] opacity-100 border-t border-gray-200 mt-2' : 'max-h-0 opacity-0') : 'max-h-0 opacity-0'}`}
                    >
                      <div className="px-3 pb-3 pt-3 flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2 pt-1">
                          <div className="flex items-center gap-2">
                            {isGeneratingFacets &&
                            visibleFacetKeys.length === 0 ? (
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-400"></div>
                            ) : (
                              <Image
                                src="/AI.png"
                                alt="AI Icon"
                                width={16}
                                height={16}
                                className="opacity-70"
                              />
                            )}
                            <span className="text-sm font-semibold text-gray-500">
                              {isGeneratingFacets &&
                              visibleFacetKeys.length === 0
                                ? 'Suggesting prompt enhancements...'
                                : 'Suggested prompt enhancements'}
                            </span>
                          </div>
                          {isGeneratingFacets &&
                            visibleFacetKeys.length > 0 && (
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 italic">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                                Updating...
                              </div>
                            )}
                        </div>
                        {visibleFacetKeys.length > 0 && (
                          <div className="flex flex-col gap-5 pb-2">
                            {generatedFacets &&
                              visibleFacetKeys.map((key) => {
                                const options = generatedFacets[key];
                                if (!options) return null;
                                return (
                                  <div
                                    key={key}
                                    className="grid grid-cols-[120px_1fr] gap-4 items-start px-2"
                                  >
                                    <div className="text-[13px] font-semibold text-gray-500 pt-1.5">
                                      {key}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {options.map((option) => (
                                        <button
                                          key={option}
                                          type="button"
                                          onClick={() =>
                                            toggleFacet(key, option)
                                          }
                                          className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all duration-300 cursor-pointer ${
                                            selectedFacets[key] === option
                                              ? 'bg-black border-black text-white shadow-md'
                                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                                          }`}
                                        >
                                          {option}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
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
