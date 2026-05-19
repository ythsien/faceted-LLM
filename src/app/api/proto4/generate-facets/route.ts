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

    const systemInstruction = `You are an expert prompt engineering assistant. 
    Based on the user's initial prompt draft, generate 2 to 4 HIGHLY SPECIFIC and ACTIONABLE constraint categories (facets) that will significantly improve the quality, depth, or utility of the AI response.

    Guidelines for Facets:
    1. RELEVANCE: Every category must be directly tied to the subject matter of the prompt.
    2. SPECIFICITY: Avoid generic categories like "Tone" or "Length" unless they are uniquely critical to the specific request. Instead, use domain-specific constraints (e.g., "Technical Depth", "Code Style", "Narrative Perspective", "Data Format").
    3. OPTIONS: Provide 3 to 5 distinct, high-signal options for each category. Keep each option VERY CONCISE (1-3 words max).
    4. VARIETY: Ensure the facets cover different dimensions of the prompt (e.g., structural, stylistic, and content-based).

    Negative Constraints:
    - DO NOT suggest facets that are already obvious from the prompt.
    - DO NOT use filler options.
    - DO NOT exceed 4 categories.

    Return ONLY valid JSON in the following format:
    {
      "facets": {
        "Category Name": ["Option 1", "Option 2", "Option 3"],
        ...
      }
    }`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
