# Master Telemetry & Data Collection Plan

## Objective

Implement a secure, non-blocking telemetry system to capture human-computer interaction data across Prototypes 0 through 5. The system must isolate specific cognitive phases (formulation vs. interaction) and securely log the data for academic analysis without degrading the user interface performance.

## 1. Global Architecture & Security

- **Tech Stack:** Next.js API Routes (`/app/api/log/route.ts`), deployed on Vercel, connecting to a Supabase (PostgreSQL) database.
- **Data Residency (Ethics Compliance):** The Supabase project MUST be created in the **London (eu-west-2)** region to comply with UK GDPR.
- **Participant State:** The system relies on a manual `participant_id` entered via a "Gatekeeper" UI on the Starting Page. This ID is saved to `localStorage` and appended to every telemetry payload.
- **Environment Variables:** Database credentials (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be stored in Vercel/`.env.local` and never hardcoded.

## 2. Database Schema (Supabase SQL)

The backend must target the following table structure. Execute this in the Supabase SQL Editor:

\`\`\`sql
create table telemetry_events (
id uuid default gen_random_uuid() primary key,
participant_id text not null,
prototype_version text not null,
turn_number integer not null,
iteration_depth integer default 0,
total_turn_time_ms integer, -- Reference only (includes reading/API lag)
formulation_time_ms integer, -- Bucket 1: Time spent typing
interaction_time_ms integer, -- Bucket 2: Time spent selecting facets
system_lag_ms integer, -- Bucket 3: API waiting time
prompt_text text,
generated_facets jsonb,
applied_facets jsonb,
created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
\`\`\`

## 3. The "Three Bucket" Time Tracking Strategy

To isolate usability metrics fairly across all prototypes, the frontend must track time using three distinct buckets:

- **Bucket 1: Formulation Time (Typing)**
  - _Starts:_ The exact moment of the first keystroke in an empty input box.
  - _Pauses/Stops:_ If the user clicks a facet, or if they submit the prompt.
- **Bucket 2: Interaction Time (Facets)**
  - _Starts:_ The moment the user clicks their first facet in a given turn/iteration.
  - _Stops:_ When they click back into the text input, or when they hit submit/update.
- **Bucket 3: System Lag (API Response)**
  - _Starts:_ The exact moment the user hits "Send" or "Update".
  - _Stops:_ The moment the LLM response is fully rendered on the screen.

## 4. Event Dictionary & Triggers

The frontend components must calculate the bucket times and fire a single, fire-and-forget `POST` request to `/api/log` at the end of each interaction cycle.

1. **`TURN_COMPLETED` (For P0, P1, P2, P3)**
   - **Trigger:** When the LLM response finishes rendering on screen.
   - **Payload:** \* `participant_id`, `prototype_version`, `turn_number`
     - `formulation_time_ms`, `interaction_time_ms`, `system_lag_ms`
     - Total overall time from first keystroke to rendered response (`total_turn_time_ms`)
     - `prompt_text` (The raw user input)
     - `generated_facets` (What the API suggested, if applicable)
     - `applied_facets` (What the user actually selected)

2. **`ITERATION_COMPLETED` (For P4, P5 Post-Prompt Updates)**
   - **Trigger:** When the updated LLM response finishes rendering after a user clicks "Update response".
   - **Payload:** \* Identical to `TURN_COMPLETED`, but `turn_number` remains the same, and `iteration_depth` increments by 1.
     - `formulation_time_ms` will be `0` for iterations where the user only clicked facets and didn't type.

## 5. Implementation Instructions for CLI

1. **Gatekeeper:** Update the Starting Page to exclusively show an input for "Participant ID". Upon submission, save to `localStorage` and reveal the prototype links.
2. **Telemetry Utility:** Create a global utility function `logTelemetry(payload)` that handles the `fetch` POST request without `await`ing it in the main UI thread.
3. **State Management:** Implement React `useRef` or state variables in the prototype components to act as the timers for the Three Buckets. Reset these timers appropriately at the start of each new turn or iteration.
