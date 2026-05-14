'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Proto0Page() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-expand textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isChatting) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isChatting]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setIsChatting(true);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: `Error: ${data.error || 'Something went wrong'}`,
          },
        ]);
      } else if (data.text) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.text },
        ]);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send message:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Network Error: ${errorMessage}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-manrope">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-white z-10">
        <Link
          href="/"
          className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          ← Back to Directory
        </Link>
        <div className="text-sm font-semibold text-gray-400">
          Prototype 0–Gray
        </div>
        <div className="w-20" /> {/* Spacer */}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {!isChatting ? (
          /* Welcome Screen Layout */
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <h1 className="text-4xl font-bold text-black opacity-80 mb-12">
              What&apos;s on your mind?
            </h1>
            <div className="w-full max-w-3xl">
              <PromptBox
                input={input}
                setInput={setInput}
                textareaRef={textareaRef}
                handleSubmit={handleSubmit}
                handleKeyDown={handleKeyDown}
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : (
          /* Chat Interface Layout */
          <div className="flex-1 flex flex-col overflow-x-hidden">
            <div className="max-w-3xl w-full mx-auto p-6 space-y-8 pb-40">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-[24px] text-[16px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#F2F2F2] text-black whitespace-pre-wrap px-5 py-3'
                        : 'text-black prose prose-slate max-w-none prose-p:my-0 [&_li_p]:mb-0'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
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

            {/* Sticky Bottom Input */}
            <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
              <div className="w-full max-w-3xl pointer-events-auto">
                <PromptBox
                  input={input}
                  setInput={setInput}
                  textareaRef={textareaRef}
                  handleSubmit={handleSubmit}
                  handleKeyDown={handleKeyDown}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface PromptBoxProps {
  input: string;
  setInput: (val: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleSubmit: (e?: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
}

function PromptBox({
  input,
  setInput,
  textareaRef,
  handleSubmit,
  handleKeyDown,
  isLoading,
}: PromptBoxProps) {
  return (
    <div className="relative w-full bg-white border border-gray-200 rounded-[28px] shadow-sm transition-all duration-300 ease-in-out hover:border-gray-300">
      <form onSubmit={handleSubmit} className="flex flex-col p-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything"
          rows={1}
          className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 text-[16px] py-3 px-4 resize-none max-h-[300px] shadow-none appearance-none"
          style={{ height: 'auto', minHeight: '48px' }}
        />
        <div
          className={`flex justify-end items-center px-2 pb-1 transition-opacity duration-200 ${input.trim() ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
        >
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors focus:outline-none"
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
  );
}
