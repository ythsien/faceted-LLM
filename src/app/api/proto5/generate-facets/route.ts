import { NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key not configured' },
        { status: 500 }
      );
    }

    const systemInstruction = `You are an expert prompt engineering assistant specializing in iterative refinement. 
    Based on the conversation history provided, generate 2 to 4 HIGHLY SPECIFIC and CONTEXT-SENSITIVE constraint categories (facets) that will help the user refine their LATEST prompt or explore the current topic with greater precision.

    Guidelines for Facets:
    1. CONTEXTUAL AWARENESS: Facets must account for what has already been discussed. Do not repeat constraints that are already established or obvious.
    2. DEPTH & EXPLORATION: Suggest categories that push the conversation further (e.g., "Counter-arguments to explore", "Specific edge cases", "Implementation strategy", "Output Visualization").
    3. DOMAIN SPECIFICITY: Use terminology relevant to the current topic (e.g., if discussing law, use "Jurisdiction" or "Statutory Context"; if discussing code, use "Error Handling" or "Performance Optimization").
    4. ACTIONABLE OPTIONS: Provide 3 to 5 distinct options that would result in noticeably different AI responses. Keep each option VERY CONCISE (1-3 words max).

    Negative Constraints:
    - DO NOT use generic categories like "Tone", "Format", or "Length" unless the user's latest prompt specifically asks for stylistic adjustment.
    - DO NOT exceed 4 categories.

    Return ONLY valid JSON in the following format:
    {
      "facets": {
        "Category Name": ["Option 1", "Option 2", "Option 3"],
        ...
      }
    }`;

    // Convert history to Gemini format
    const contents = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Gemini API error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: 'Empty response' }, { status: 500 });
    }

    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
