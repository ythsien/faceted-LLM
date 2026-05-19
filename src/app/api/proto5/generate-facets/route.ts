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

    const systemInstruction = `# ROLE
    You are an expert prompt engineering assistant. Your goal is to generate 2 to 4 HIGHLY SPECIFIC and ACTIONABLE constraint categories (facets) that help a user refine their intent and get a better AI response.

    # MISSION: ITERATIVE EXPLORATION (MULTI-TURN)
    Analyze the current AI response and conversation history. Suggest dimensions that allow the user to deep-dive, correct, or expand upon the existing answer. Ensure the facets account for what has already been discussed and provide fresh avenues for exploration.

    # CONSTRAINTS & STYLE
    - SPECIFICITY: Avoid generic terms like "Tone", "Format", or "Length". Use domain-specific terms relevant to the topic (e.g., "Legal Rigor", "Mathematical Notation", "Historical Accuracy", "Implementation Strategy").
    - CONCISENESS: Each category name must be 1-2 words. Each option must be VERY CONCISE (1-3 words max).
    - SIGNAL: Options must represent distinct, meaningful choices that result in noticeably different AI behaviors.
    - QUANTITY: Provide 2 to 4 categories, each with 3 to 5 options.

    # NEGATIVE CONSTRAINTS
    - DO NOT suggest facets that are already obvious from the user's text.
    - DO NOT use filler or generic options.

    # OUTPUT FORMAT
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
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
