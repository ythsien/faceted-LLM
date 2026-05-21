import { useRef, useState, useEffect } from 'react';

export interface TelemetryPayload {
  participant_id: string;
  prototype_version: string;
  turn_number: number;
  iteration_depth: number;
  total_turn_time_ms: number | null;
  formulation_time_ms: number | null;
  interaction_time_ms: number | null;
  system_lag_ms: number | null;
  prompt_text: string | null;
  generated_facets: Record<string, unknown> | null;
  applied_facets: Record<string, unknown> | null;
}

export function logTelemetry(payload: TelemetryPayload) {
  // Fire-and-forget passive fetch
  fetch('/api/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error('Failed to log telemetry:', err);
  });
}

export function useTelemetryTracker(prototypeVersion: string) {
  const [turnNumber, setTurnNumber] = useState(0);
  const [iterationDepth, setIterationDepth] = useState(0);

  // Refs for tracking timestamps & accumulated durations
  const firstInteractionTimeRef = useRef<number | null>(null);
  const formulationStartRef = useRef<number | null>(null);
  const formulationAccumulatedRef = useRef<number>(0);
  const interactionStartRef = useRef<number | null>(null);
  const interactionAccumulatedRef = useRef<number>(0);
  const systemLagStartRef = useRef<number | null>(null);
  const systemLagAccumulatedRef = useRef<number>(0);

  // Keep references to state to avoid stale closure issues
  const turnNumberRef = useRef(0);
  const iterationDepthRef = useRef(0);

  useEffect(() => {
    turnNumberRef.current = turnNumber;
  }, [turnNumber]);

  useEffect(() => {
    iterationDepthRef.current = iterationDepth;
  }, [iterationDepth]);

  const onKeystroke = () => {
    const now = Date.now();
    // Set first interaction timestamp if it's the very start of the cycle
    if (
      firstInteractionTimeRef.current === null &&
      formulationAccumulatedRef.current === 0 &&
      interactionAccumulatedRef.current === 0
    ) {
      firstInteractionTimeRef.current = now;
    }

    if (formulationStartRef.current === null) {
      // Pause interaction if it was active
      if (interactionStartRef.current !== null) {
        interactionAccumulatedRef.current += now - interactionStartRef.current;
        interactionStartRef.current = null;
      }
      formulationStartRef.current = now;
    }
  };

  const onInputFocus = () => {
    const now = Date.now();
    if (
      firstInteractionTimeRef.current === null &&
      formulationAccumulatedRef.current === 0 &&
      interactionAccumulatedRef.current === 0
    ) {
      firstInteractionTimeRef.current = now;
    }

    if (formulationStartRef.current === null) {
      // Pause interaction if it was active
      if (interactionStartRef.current !== null) {
        interactionAccumulatedRef.current += now - interactionStartRef.current;
        interactionStartRef.current = null;
      }
      formulationStartRef.current = now;
    }
  };

  const onFacetClick = () => {
    const now = Date.now();
    if (
      firstInteractionTimeRef.current === null &&
      formulationAccumulatedRef.current === 0 &&
      interactionAccumulatedRef.current === 0
    ) {
      firstInteractionTimeRef.current = now;
    }

    if (interactionStartRef.current === null) {
      // Pause formulation if it was active
      if (formulationStartRef.current !== null) {
        formulationAccumulatedRef.current += now - formulationStartRef.current;
        formulationStartRef.current = null;
      }
      interactionStartRef.current = now;
    }
  };

  const onSubmitStart = () => {
    const now = Date.now();

    // Stop active formulation timer
    if (formulationStartRef.current !== null) {
      formulationAccumulatedRef.current += now - formulationStartRef.current;
      formulationStartRef.current = null;
    }
    // Stop active interaction timer
    if (interactionStartRef.current !== null) {
      interactionAccumulatedRef.current += now - interactionStartRef.current;
      interactionStartRef.current = null;
    }

    systemLagStartRef.current = now;

    // Increment turn number and reset iteration depth (state update is async)
    setTurnNumber((prev) => {
      const next = prev + 1;
      turnNumberRef.current = next;
      return next;
    });
    setIterationDepth(() => {
      iterationDepthRef.current = 0;
      return 0;
    });
  };

  const onUpdateStart = () => {
    const now = Date.now();

    // Stop active formulation timer
    if (formulationStartRef.current !== null) {
      formulationAccumulatedRef.current += now - formulationStartRef.current;
      formulationStartRef.current = null;
    }
    // Stop active interaction timer
    if (interactionStartRef.current !== null) {
      interactionAccumulatedRef.current += now - interactionStartRef.current;
      interactionStartRef.current = null;
    }

    systemLagStartRef.current = now;

    // Increment iteration depth and keep turn number the same
    setIterationDepth((prev) => {
      const next = prev + 1;
      iterationDepthRef.current = next;
      return next;
    });
  };

  const onRenderComplete = (
    promptText: string | null,
    generatedFacets: Record<string, unknown> | null = null,
    appliedFacets: Record<string, unknown> | null = null
  ) => {
    const now = Date.now();

    // Stop system lag timer
    if (systemLagStartRef.current !== null) {
      systemLagAccumulatedRef.current = now - systemLagStartRef.current;
      systemLagStartRef.current = null;
    }

    // Calculate total cycle time
    let totalTurnTimeMs = null;
    if (firstInteractionTimeRef.current !== null) {
      totalTurnTimeMs = now - firstInteractionTimeRef.current;
    } else {
      totalTurnTimeMs =
        formulationAccumulatedRef.current +
        interactionAccumulatedRef.current +
        systemLagAccumulatedRef.current;
    }

    // Read participant ID
    let participantId = 'unknown';
    if (typeof window !== 'undefined') {
      participantId =
        window.localStorage.getItem('participant_id') || 'unknown';
    }

    const payload: TelemetryPayload = {
      participant_id: participantId,
      prototype_version: prototypeVersion,
      turn_number: turnNumberRef.current,
      iteration_depth: iterationDepthRef.current,
      total_turn_time_ms: totalTurnTimeMs,
      formulation_time_ms: formulationAccumulatedRef.current,
      interaction_time_ms: interactionAccumulatedRef.current,
      system_lag_ms: systemLagAccumulatedRef.current,
      prompt_text: promptText,
      generated_facets: generatedFacets,
      applied_facets: appliedFacets,
    };

    console.log(
      `[Telemetry] prototype=${prototypeVersion} turn=${payload.turn_number} depth=${payload.iteration_depth}`,
      payload
    );
    logTelemetry(payload);

    // Reset accumulators for the next interaction cycle
    firstInteractionTimeRef.current = null;
    formulationStartRef.current = null;
    formulationAccumulatedRef.current = 0;
    interactionStartRef.current = null;
    interactionAccumulatedRef.current = 0;
    systemLagStartRef.current = null;
    systemLagAccumulatedRef.current = 0;
  };

  const onReset = () => {
    setTurnNumber(0);
    setIterationDepth(0);
    turnNumberRef.current = 0;
    iterationDepthRef.current = 0;

    firstInteractionTimeRef.current = null;
    formulationStartRef.current = null;
    formulationAccumulatedRef.current = 0;
    interactionStartRef.current = null;
    interactionAccumulatedRef.current = 0;
    systemLagStartRef.current = null;
    systemLagAccumulatedRef.current = 0;
  };

  return {
    turnNumber,
    iterationDepth,
    onKeystroke,
    onInputFocus,
    onFacetClick,
    onSubmitStart,
    onUpdateStart,
    onRenderComplete,
    onReset,
  };
}
