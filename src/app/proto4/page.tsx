'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  apiContent?: string;
  isEnhanced?: boolean;
  appliedFacets?: Record<string, string>;
}

export default function Proto4Page() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Prototype 4 Specific State
  const [generatedFacets, setGeneratedFacets] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [selectedFacets, setSelectedFacets] = useState<Record<string, string>>(
    {}
  );
  const [isGeneratingFacets, setIsGeneratingFacets] = useState(false);
  const [hasTriggeredFacets, setHasTriggeredFacets] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-expand textarea
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

  const generateFacets = async (promptText: string, attempts = 0) => {
    if (hasTriggeredFacets && attempts === 0) return;
    setHasTriggeredFacets(true);
    setIsGeneratingFacets(true);

    try {
      const res = await fetch('/api/proto4/generate-facets', {
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
          return generateFacets(promptText, attempts + 1);
        }
        setIsGeneratingFacets(false);
        return;
      }

      const data = await res.json();
      if (data.facets) setGeneratedFacets(data.facets);
    } catch (error) {
      console.error('Error generating facets:', error);
    } finally {
      setIsGeneratingFacets(false);
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

  const performChat = async (
    currentMessages: Message[],
    isRegeneration = false,
    targetIndex?: number,
    attempts = 0
  ) => {
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
          return performChat(
            currentMessages,
            isRegeneration,
            targetIndex,
            attempts + 1
          );
        }

        const errorData = await res.json();
        const errorMsg = `Error: ${errorData.error || 'Something went wrong'}`;
        if (isRegeneration && targetIndex !== undefined) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[targetIndex] = {
              ...updated[targetIndex],
              content: errorMsg,
            };
            return updated;
          });
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: errorMsg },
          ]);
        }
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!isRegeneration) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '',
            isEnhanced: Object.keys(selectedFacets).length > 0,
            appliedFacets: { ...selectedFacets },
          },
        ]);
      }

      if (reader) {
        let firstTokenReceived = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);

          if (!firstTokenReceived && chunk.trim()) {
            firstTokenReceived = true;
            // After first token, trigger facets
            if (!isRegeneration && currentMessages.length === 1) {
              generateFacets(currentMessages[0].content);
            }
          }

          setMessages((prev) => {
            const updated = [...prev];
            const idx =
              isRegeneration && targetIndex !== undefined
                ? targetIndex
                : updated.length - 1;
            const last = updated[idx];
            updated[idx] = {
              ...last,
              content: last.content + chunk,
            };
            return updated;
          });
        }
      }

      setIsLoading(false);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const constraints = Object.entries(selectedFacets)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const apiContent = constraints
      ? `[SYSTEM: STRICTLY ADHERE to these constraints: ${constraints}]\n\nOriginal prompt: ${input}`
      : input;

    const displayMessage: Message = {
      role: 'user',
      content: input,
      apiContent: apiContent,
    };

    const newMessages = [...messages, displayMessage];
    setMessages(newMessages);
    setInput('');
    setIsChatting(true);
    setIsLoading(true);
    setIsFocused(false);

    await performChat(newMessages);
  };

  const handleUpdateResponse = async (index: number) => {
    if (isLoading) return;

    const historyUpToAssistant = messages.slice(0, index);
    const lastUserMsg = historyUpToAssistant[historyUpToAssistant.length - 1];
    if (!lastUserMsg || lastUserMsg.role !== 'user') return;

    const constraints = Object.entries(selectedFacets)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const enhancedApiContent = `[SYSTEM: The user has refined their request. Please provide a new, complete response that fulfills the original prompt but STRICTLY ADHERES to these new constraints: ${constraints}]\n\nOriginal prompt: ${lastUserMsg.content}`;

    const updatedHistory = [
      ...messages.slice(0, index - 1),
      { ...lastUserMsg, apiContent: enhancedApiContent },
    ];

    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = {
        role: 'assistant',
        content: '',
        isEnhanced: true,
        appliedFacets: { ...selectedFacets },
      };
      return updated;
    });

    setIsLoading(true);
    await performChat(updatedHistory, true, index);
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
    setHasTriggeredFacets(false);
    setIsGeneratingFacets(false);
    setIsFocused(false);
  };

  return (
    <div className="flex flex-col h-screen bg-white font-manrope relative overflow-hidden text-black">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #E3F2FD 0%, #FFFFFF 40%)',
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
          Prototype 4–Blue
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
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything"
                  rows={1}
                  className={`w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 text-[16px] py-3 px-4 resize-none max-h-[300px] shadow-none appearance-none transition-all duration-300 ${isFocused ? 'cursor-text' : 'cursor-pointer'}`}
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
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-x-hidden">
            <div className="max-w-3xl w-full mx-auto p-6 space-y-12 pb-64 relative">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[90%] rounded-[24px] text-[16px] leading-relaxed bg-[#F2F2F2] text-black px-5 py-3 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className={`w-full relative group ${generatedFacets || isGeneratingFacets ? 'lg:min-h-[440px]' : ''}`}
                    >
                      {/* Assistant Response Header & Body */}
                      <div className="w-full pt-1">
                        {msg.isEnhanced ? (
                          <div className="flex flex-col gap-1 mb-5 animate-in fade-in duration-700">
                            <div className="flex items-center">
                              <span className="text-sm font-bold text-gray-500">
                                Enhanced response
                              </span>
                            </div>
                            {msg.appliedFacets &&
                              Object.keys(msg.appliedFacets).length > 0 && (
                                <div className="flex flex-wrap gap-x-2 text-[12px] text-gray-400 font-medium">
                                  {Object.entries(msg.appliedFacets).map(
                                    ([k, v], idx, arr) => (
                                      <span key={k}>
                                        {k}:{' '}
                                        <span className="text-gray-500">
                                          {v}
                                        </span>
                                        {idx < arr.length - 1 ? ' · ' : ''}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="mb-4 h-2" />
                        )}

                        <div className="text-black prose prose-slate max-w-none prose-p:my-0 [&_li_p]:mb-0 text-[16px] leading-relaxed">
                          {msg.content ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-4 last:mb-0">{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc ml-6 mb-4">
                                    {children}
                                  </ul>
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
                          ) : (
                            isLoading && (
                              <div className="animate-pulse text-gray-400 text-sm italic pt-1">
                                Thinking...
                              </div>
                            )
                          )}
                        </div>

                        {i === messages.length - 1 && !isLoading && (
                          <button
                            onClick={handleRetry}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black transition-colors mt-6"
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

                      {/* Facet Refinement Panel - Positioned to the left of the max-w-3xl column on desktop, below on mobile */}
                      <div className="lg:absolute lg:right-full lg:mr-8 lg:top-0 w-full lg:w-[240px] mt-6 lg:mt-0">
                        {isGeneratingFacets ? (
                          <div className="w-full bg-gray-50/50 rounded-2xl border border-gray-100 p-5 flex flex-col gap-6 animate-pulse">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                              <span className="text-[11px] font-bold text-gray-500 tracking-tight">
                                Analyzing context...
                              </span>
                            </div>
                            <div className="flex flex-col gap-4">
                              <div className="h-3 bg-gray-200 rounded-full w-1/2"></div>
                              <div className="flex gap-1.5">
                                <div className="h-6 bg-gray-200 rounded-xl w-16"></div>
                                <div className="h-6 bg-gray-200 rounded-xl w-20"></div>
                              </div>
                              <div className="h-3 bg-gray-200 rounded-full w-2/3"></div>
                              <div className="flex gap-1.5">
                                <div className="h-6 bg-gray-200 rounded-xl w-24"></div>
                                <div className="h-6 bg-gray-200 rounded-xl w-14"></div>
                              </div>
                            </div>
                          </div>
                        ) : generatedFacets ? (
                          <div className="w-full bg-gray-50/50 rounded-2xl border border-gray-100 p-5 flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="flex items-center gap-2">
                              <Image
                                src="/AI.png"
                                alt="AI Icon"
                                width={14}
                                height={14}
                                className="opacity-70"
                              />
                              <span className="text-[11px] font-bold text-gray-500 tracking-tight">
                                Suggested enhancements
                              </span>
                            </div>
                            <div className="flex flex-col gap-5">
                              {Object.entries(generatedFacets).map(
                                ([key, options]) => (
                                  <div
                                    key={key}
                                    className="flex flex-col gap-2"
                                  >
                                    <div className="text-[11px] font-bold text-gray-500">
                                      {key.charAt(0).toUpperCase() +
                                        key.slice(1).toLowerCase()}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {options.map((option) => (
                                        <button
                                          key={option}
                                          onClick={() =>
                                            toggleFacet(key, option)
                                          }
                                          className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all duration-300 cursor-pointer ${
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
                                )
                              )}
                            </div>
                            <button
                              disabled={
                                isLoading ||
                                i !== messages.length - 1 ||
                                Object.keys(selectedFacets).length === 0 ||
                                JSON.stringify(selectedFacets) ===
                                  JSON.stringify(msg.appliedFacets)
                              }
                              onClick={() => handleUpdateResponse(i)}
                              className="w-full py-2 bg-black text-white text-[11px] font-bold rounded-xl hover:bg-gray-800 disabled:bg-gray-200 transition-colors cursor-pointer"
                            >
                              Update response
                            </button>{' '}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 flex flex-col items-center bg-gradient-to-t from-white via-white to-transparent z-20 pointer-events-none">
              <div className="w-full max-w-3xl flex flex-col gap-3 pointer-events-auto">
                <div className="bg-white border border-gray-200 rounded-[28px] shadow-lg flex overflow-hidden">
                  <form
                    onSubmit={handleSubmit}
                    className="flex-1 flex flex-col p-2"
                  >
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything"
                      rows={1}
                      className={`w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 text-[16px] py-3 px-4 resize-none max-h-[200px] shadow-none appearance-none transition-all duration-300 ${isFocused ? 'cursor-text' : 'cursor-pointer'}`}
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
