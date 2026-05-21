import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 1. Basic Validation
    const {
      participant_id,
      prototype_version,
      turn_number,
      iteration_depth,
      total_turn_time_ms,
      formulation_time_ms,
      interaction_time_ms,
      system_lag_ms,
      prompt_text,
      generated_facets,
      applied_facets,
    } = data;

    if (!participant_id || typeof participant_id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing participant_id' },
        { status: 400 }
      );
    }

    if (!prototype_version || typeof prototype_version !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing prototype_version' },
        { status: 400 }
      );
    }

    if (typeof turn_number !== 'number') {
      return NextResponse.json(
        { error: 'Invalid or missing turn_number' },
        { status: 400 }
      );
    }

    // 2. Fetch database credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase database configuration variables are missing.');
      return NextResponse.json(
        { error: 'Telemetry backend is not configured' },
        { status: 500 }
      );
    }

    // 3. Prepare payload for Supabase PostgREST insertion
    const payload = {
      participant_id,
      prototype_version,
      turn_number,
      iteration_depth:
        typeof iteration_depth === 'number' ? iteration_depth : 0,
      total_turn_time_ms:
        typeof total_turn_time_ms === 'number' ? total_turn_time_ms : null,
      formulation_time_ms:
        typeof formulation_time_ms === 'number' ? formulation_time_ms : null,
      interaction_time_ms:
        typeof interaction_time_ms === 'number' ? interaction_time_ms : null,
      system_lag_ms: typeof system_lag_ms === 'number' ? system_lag_ms : null,
      prompt_text: typeof prompt_text === 'string' ? prompt_text : null,
      generated_facets:
        generated_facets !== undefined ? generated_facets : null,
      applied_facets: applied_facets !== undefined ? applied_facets : null,
    };

    // 4. Zero-dependency PostgREST insertion call
    const response = await fetch(`${supabaseUrl}/rest/v1/telemetry_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase database error response:', errorText);
      return NextResponse.json(
        { error: `Failed to save telemetry to database: ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown Error';
    console.error(
      'Telemetry logging endpoint encountered an error:',
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
