# Faceted Prompt Interfaces

Faceted Prompt Interfaces is a research prototype for comparing six approaches to prompt refinement in an LLM chat. The interfaces vary when selectable prompt facets appear—before writing, while drafting, or after receiving an answer—and whether those facets remain fixed or adapt between turns.

The application is designed for moderated study sessions. Participants enter a study ID, complete the same dinner-planning task in an assigned prototype, and interact with streamed Gemini responses while timing and facet-use telemetry is recorded.

## Prototype conditions

| Route     | Condition                               | Facet behavior                                                                                                                                                                             |
| --------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/proto0` | **0–Gray: baseline**                    | Conventional chat with no facets.                                                                                                                                                          |
| `/proto1` | **1–Red: static pre-prompt**            | Generic Tone, Format, Length, and Audience facets are available before the prompt and retained across turns.                                                                               |
| `/proto2` | **2–Yellow: progressive, single-theme** | Gemini suggests context-specific facets after at least three words and a 600 ms typing pause. The first prompt establishes the facet set used throughout the chat.                         |
| `/proto3` | **3–Green: progressive, multi-turn**    | Gemini suggests facets while each prompt is drafted, using the conversation history. The set resets and is generated again for every turn.                                                 |
| `/proto4` | **4–Blue: post-response, single-theme** | A facet set is generated from the initial prompt after the first response. Selecting facets and choosing **Update response** replaces the answer in place; the set is reused for the chat. |
| `/proto5` | **5–Purple: post-response, multi-turn** | A fresh facet set is generated for each response. The latest answer can be updated in place using that turn's selections.                                                                  |

Facet selections never alter the raw prompt shown in the conversation. They are added as hidden constraints to the request sent to Gemini. All conditions support multi-turn chat, streamed Markdown responses, retrying the latest response, starting a new chat, and a collapsible reminder for the standardized study task.

For the complete experimental specification, see [PROTOTYPE.md](./PROTOTYPE.md).

## Tech stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 and `@tailwindcss/typography`
- Gemini `gemini-3.1-flash-lite` for chat and generated facets
- Supabase PostgREST for study telemetry
- `react-markdown` with GitHub Flavored Markdown support

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm
- A [Google AI Studio](https://aistudio.google.com/) API key
- A Supabase project if telemetry should be persisted

### Install and configure

Install the locked dependency versions:

```bash
npm ci
```

Create `.env.local` in the project root:

```dotenv
GEMINI_API_KEY=your_gemini_api_key

# Required only for persisted study telemetry
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

`GEMINI_API_KEY` is required for chat and the dynamically generated facets in prototypes 2–5. The two Supabase variables are used by the server-side telemetry route. Without them, the interfaces still run, but telemetry events are not saved.

Before collecting study data, create the `telemetry_events` table described in [TELEMETRY.md](./TELEMETRY.md). That document contains the expected schema, timing model, and deployment-region requirement.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a non-identifying participant ID, and select the prototype assigned by the moderator. The participant ID is stored in the browser's `localStorage` until it is changed from the directory page or the site data is cleared.

## Telemetry

Each completed interaction is posted asynchronously to `/api/log`. A telemetry record can include:

- participant ID, prototype condition, turn number, and iteration depth;
- raw prompt text plus generated and selected facets;
- total turn time, prompt-formulation time, facet-interaction time, and model-response lag.

Post-response updates in prototypes 4 and 5 increment the iteration depth while keeping the same turn number. Use study-specific, non-identifying participant IDs and configure data handling in line with the study's consent and retention requirements.

## Project structure

```text
src/
├── app/
│   ├── page.tsx                         # Participant gate and prototype directory
│   ├── proto0/ … proto5/                # Six isolated interface conditions
│   └── api/
│       ├── chat/route.ts                # Streamed Gemini chat proxy
│       ├── proto2/ … proto5/            # Condition-specific facet generation
│       └── log/route.ts                 # Supabase telemetry endpoint
├── components/TaskReminder.tsx          # Standardized study-task reminder
└── utils/
    ├── telemetry.ts                     # Timing and event collection
    └── useNaturalSticky.ts              # Post-response panel positioning
```

The prototype pages are intentionally isolated so changes to one experimental condition do not alter another.

## Commands

| Command          | Purpose                               |
| ---------------- | ------------------------------------- |
| `npm run dev`    | Start the local development server.   |
| `npm run build`  | Create a production build.            |
| `npm run start`  | Serve the production build.           |
| `npx eslint .`   | Run the current ESLint configuration. |
| `npm run format` | Format the repository with Prettier.  |

> `npm run lint` currently invokes the removed `next lint` command and does not work with Next.js 16; use `npx eslint .` until the package script is updated.

## Deployment

The intended deployment target is Vercel. Configure the same environment variables in the deployment, provision the Supabase table before running a study, and use a server-capable deployment because the application relies on route handlers and streamed responses. A static export is not supported by this architecture.
