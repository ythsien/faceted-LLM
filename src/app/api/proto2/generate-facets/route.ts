import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key not configured' },
        { status: 500 }
      );
    }

    const systemInstruction = `# ROLE
    You are an expert prompt engineering assistant. Your goal is to generate 2 to 4 HIGHLY SPECIFIC and ACTIONABLE constraint categories (facets) that help a user refine their intent and get a better AI response.

    # MISSION: DRAFT REFINEMENT
    Analyze the user's initial prompt draft. Anticipate what the user is trying to write and offer dimensions to help them flesh out, complete, or target their thought more effectively while they are still drafting.

    # CONSTRAINTS & STYLE
    - SPECIFICITY: Avoid generic terms like "Tone", "Format", or "Length". Use domain-specific terms relevant to the prompt (e.g., "Technical Depth", "Code Style", "Narrative Perspective", "Data Granularity").
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
