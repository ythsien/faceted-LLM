# Master Project Plan: Faceted Prompt Interfaces

This document serves as the master prompt plan and instruction set for building a series of faceted LLM interface prototypes.

## Global Engineering Rules

- **Tech Stack:** Next.js, Tailwind, Gemini API
- **Absolute Isolation:** Each prototype (0 through 5) MUST be built as a completely separate component/page/directory. Once a prototype is approved, its code must NOT be altered when working on subsequent prototypes.
- **API Integration:** Use the Gemini API (Gemini 2.5 Flash-Lite) with a securely stored private API key (e.g., via `.env`).
- **Implicit Constraints:** In all faceted prototypes, selected values are _not_ visually appended to the user's raw text input in the UI. Instead, they are combined with the user's prompt under the hood before being sent to the Gemini API.
- **Progressive Trigger Logic (Prototypes 2 & 3):** Do NOT use a strict character or word count to trigger facet generation. Instead, use **Debouncing** combined with a minimum length: Wait until the user has typed at least 3 words, and then trigger the API call only after they have _paused typing for 800 to 1000 milliseconds_.

---

## Stage 0: Foundation & Baseline

### The Starting Page

- **Goal:** A simple index/landing page acting as a directory.
- **Behaviour:** Displays a list of links or cards for Prototypes 0 through 5. Clicking a link routes the user to that specific, isolated prototype environment.

### Prototype 0-Gray (The Baseline)

- **Goal:** Replicate the standard, current-state LLM interface.
- **Behaviour:**
  - **Welcome Screen:** Displays "What’s in your mind?" and a floating textbox at the bottom with a placeholder "Ask anything".
  - **Input Interaction:** Clicking the input box expands its height (with animation) to allow multi-line input.
  - **Submission:** User presses Enter or clicks Send. The page transitions to a standard chat interface.
  - **Reset:** The new prompt appears as a chat bubble, and the input box animates back to its shorter resting height.
- **Figma Reference:** `[Ask me to insert URL]`

---

## Stage 1: Pre-prompt, Context-free

### Prototype 1-Red

- **Timing:** Pre-prompt (Facets appear immediately before the user types).
- **Content:** Context-free (Generic, universal, pre-defined facets: Tone, Format, Length, Audience).
- **Behaviour:**
  - **Welcome Screen:** Displays "What’s in your mind?". The main input area is split: the left pane shows the static facets, the right pane is the text input.
  - **Facet UI:** 4 distinct facets, each with 3-5 single-select values.
  - **Submission:** Page transitions to the chat interface. The user's chat bubble includes a footnote displaying the applied facets/values.
  - **Subsequent Turns:** The input box floats at the bottom. Clicking it expands it and reveals a scrollable version of the facet panel, retaining previously selected values.
- **Figma Reference:** `[Ask me to insert URL]`

---

## Stage 2: Progressive, Context-sensitive, Single-turn

### Prototype 2-Yellow

- **Timing:** Progressive (Facets appear dynamically while the user is drafting the initial prompt).
- **Content:** Context-sensitive & Single-turn (Facets are AI-generated based _only_ on the initial prompt, establishing a permanent theme for the rest of the chat).
- **Behaviour:**
  - **Welcome Screen:** Standard Prototype 0 baseline.
  - **Progressive Trigger:** Once the user types >3 words and pauses for 800ms (Debounce), a loading state appears: _"Suggesting prompt enhancements..."_
  - **Facet Generation:** The system quietly pings the Gemini API to generate 2-4 contextually relevant facets (with 3-5 single-select values each). The loading text changes to _"Suggested prompt enhancements"_.
  - **Submission:** Chat bubble appears with footnotes of applied constraints.
  - **Subsequent Turns:** When expanding the input box for the next message, the facet panel shows the _same_ facets generated in turn 1, retaining previous selections.
- **Figma Reference:** `[Ask me to insert URL]`

---

## Stage 3: Progressive, Context-sensitive, Multi-turn

### Prototype 3-Green

- **Timing:** Progressive (Facets appear dynamically while typing).
- **Content:** Context-sensitive & Multi-turn (Facets are re-generated for _every single prompt_, tailored specifically to the immediate conversational turn).
- **Behaviour:**
  - **Welcome Screen:** Standard Prototype 0 baseline.
  - **Progressive Trigger:** Uses the same 800ms debounce logic as Prototype 2 to generate 2-4 facets.
  - **Submission:** Chat bubble appears with footnotes of applied constraints.
  - **Subsequent Turns:** When the user begins drafting their _next_ message, the system triggers a new generation cycle, discarding the old facets and presenting entirely new ones based on the current text being typed.
- **Figma Reference:** `[Ask me to insert URL]`

---

## Stage 4: Post-prompt, Context-sensitive, Single-turn

### Prototype 4-Blue

- **Timing:** Post-prompt (Facets appear _after_ the user receives a response from the LLM).
- **Content:** Context-sensitive & Single-turn (Facets are generated based on the initial prompt, acting as a one-time theme for the topic).
- **Behaviour:**
  - **Welcome/Submission:** Functions exactly like Prototype 0.
  - **Post-Response Trigger:** Once the AI's response renders, a loading state _"Suggesting prompt enhancements..."_ appears on the left side of the response block.
  - **Facet UI:** 2-4 context-specific facets load with an "Update response" CTA button below them.
  - **Update Action:** User selects values and clicks "Update response" (CTA is disabled until a selection is made). The system sends a new request combining the previous prompt + new constraints.
  - **UI Update:** The response text updates in place. A header _"Enhanced response"_ appears at the top of the block, alongside footnotes of the applied facets.
  - **Subsequent Turns:** Future AI responses in this chat will display this exact same set of facets generated in turn 1.
- **Figma Reference:** `[Ask me to insert URL]`

---

## Stage 5: Post-prompt, Context-sensitive, Multi-turn

### Prototype 5-Purple

- **Timing:** Post-prompt (Facets appear after receiving a response).
- **Content:** Context-sensitive & Multi-turn (Facets are uniquely generated for _each_ new response in the conversation).
- **Behaviour:**
  - **Welcome/Submission:** Functions exactly like Prototype 0.
  - **Post-Response Trigger:** Works exactly like Prototype 4 (loads next to the response block, requires an "Update response" click to regenerate the answer in place).
  - **Subsequent Turns:** Every time the user sends a new prompt and gets a new response, the system generates a brand-new, unique set of facets tailored specifically to that latest exchange.
- **Figma Reference:** `[Ask me to insert URL]`
