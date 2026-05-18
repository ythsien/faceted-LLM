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
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    if (isChatting) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'user' || isLoading) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
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
    setIsFocused(false);

    await performChat(newMessages);
  };

  const performChat = async (currentMessages: Message[]) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages }),
      });

      if (!res.ok) {
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
      let assistantContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
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
    setIsFocused(false);
  };

  return (
    <div className="flex flex-col h-screen bg-white font-manrope relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #E4E4E4 0%, #FFFFFF 30%)',
        }}
      />

      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-white/50 backdrop-blur-md z-10">
        <Link
          href="/"
          className="text-sm font-medium text-gray-500 hover:text-black transition-colors cursor-pointer"
        >
          ← Back to Directory
        </Link>
        <div className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          Prototype 0–Gray
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
                isFocused={isFocused}
                setIsFocused={setIsFocused}
              />
            </div>
          </div>
        ) : (
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

            <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
              <div className="w-full max-w-3xl pointer-events-auto">
                <PromptBox
                  input={input}
                  setInput={setInput}
                  textareaRef={textareaRef}
                  handleSubmit={handleSubmit}
                  handleKeyDown={handleKeyDown}
                  isLoading={isLoading}
                  isFocused={isFocused}
                  setIsFocused={setIsFocused}
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
  isFocused: boolean;
  setIsFocused: (val: boolean) => void;
}

function PromptBox({
  input,
  setInput,
  textareaRef,
  handleSubmit,
  handleKeyDown,
  isLoading,
  isFocused,
  setIsFocused,
}: PromptBoxProps) {
  return (
    <div className="relative w-full bg-white border border-gray-200 rounded-[28px] shadow-sm transition-all duration-300 ease-in-out hover:border-gray-300">
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
      </form>
    </div>
  );
}
