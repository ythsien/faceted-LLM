import { NextResponse } from 'next/server';

interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('API Route: GEMINI_API_KEY is missing');
      return NextResponse.json(
        { error: 'Gemini API Key not configured in .env.local' },
        { status: 500 }
      );
    }

    // Gemini API expects 'user' and 'model' roles.
    const contents = messages.map((m: ChatMessage) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    console.log('API Route: Sending request to Gemini...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error Response:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Gemini API error', details: data },
        { status: response.status }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Gemini API: Empty response', data);
      return NextResponse.json(
        { error: 'AI returned an empty response', details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';
    console.error('API Route Catch Error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
