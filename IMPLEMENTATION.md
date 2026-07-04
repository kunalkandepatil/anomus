# AI Internship PPT Generator — Implementation Plan

## 0. What this app does

User fills a form with 5 fields:

- Internship Title
- Student Name
- PRN
- Class & Div
- Program

The app then:

1. Sends the Internship Title to **Gemini** (with Google Search grounding) to research the topic on the internet.
2. Asks Gemini to turn that research into a **structured slide outline** — the number of "Module N" slides varies by topic (e.g. a simple topic gets Module 1–2, a broad one gets Module 1–4), everything else (Introduction, Objectives, Architecture, Results, Advantages & Limitations, Conclusion) is fixed.
3. Builds a **.pptx** file that is byte-for-byte the same *design* as `PPTFormat.pptx` — same fonts, same colors, same layout geometry — just with the placeholder text replaced and new content slides inserted in the same visual style.
4. Returns the file for download.

**Hard constraint from the user: do not change the look of the template.** This drives the core architectural decision below.

---

## 1. Core architectural decision: template surgery, not "build from scratch"

Do **not** use `pptxgenjs` to build slides from a blank canvas. Recreating the template visually (fonts, exact colors, exact spacing, the two-tone accent bars, the background art on slide 1) by hand in `pptxgenjs` will drift from the original and is a maintenance trap.

Instead, treat `PPTFormat.pptx` as a **zip of XML files** (OOXML) and do direct XML surgery, the same way you'd edit any Office file:

- A `.pptx` is a zip. Unzip it → you get `ppt/slides/slide1.xml`, `slide2.xml`, `slide3.xml`, `ppt/slideLayouts/*.xml`, `ppt/presentation.xml`, `[Content_Types].xml`, and `_rels` files.
- To add slides, you: create new `slideN.xml` parts (cloned from an existing slide's XML with text swapped), register them in `[Content_Types].xml` and `ppt/_rels/presentation.xml.rels`, and add `<p:sldId>` entries to `ppt/presentation.xml`'s `<p:sldIdLst>`.
- Zip it back up = valid `.pptx`.

This is 100% deterministic and preserves formatting exactly, because we're never "designing" — we're transplanting known-good XML fragments.

### 1.1 What's actually in the uploaded template (confirmed by inspection)

The template has exactly 3 slides today:

| # | Slide | Content |
|---|-------|---------|
| 1 | Title slide | FST/School header image, "School of Computational Sciences" (red, Cambria 32 bold), **Internship Title** (navy `002060`, Cambria 32 bold), **Student Name:**, **PRN:**, **Class & Div:**, **Program : (B.Tech-FY/SY/TY-CSE/IT/AIML/DS)/(BSc-FY/SY-CS/DSAI)/BCA(FY/SY)** — all Cambria 24 |
| 2 | Table of Contents | Title "Table of Contents" (red `FF0000`, Times New Roman 32 bold), then a bulleted list (Times New Roman 20, bullet `•`, justified) with the 8 fixed default entries |
| 3 | Thank You | Closing slide |

There is **no existing example of a generic content slide** (e.g. "Introduction" with a paragraph of body text) — we have to build that ourselves, in the same visual language as slide 2 (red bold title, Times New Roman body). The layout `ppt/slideLayouts/slideLayout2.xml` ("Title and Content") is the generic PowerPoint layout behind this look and already defines: title placeholder, content placeholder, footer, date, and — importantly — a **slide-number placeholder** (`<p:ph type="sldNum" idx="12">` with an auto-updating `<a:fld type="slidenum">` field). None of the 3 existing slides currently instantiate that slide-number field on the slide itself, so page numbers are **not currently showing**. We will add it (see §4.4).

Slide size: `12192000 x 6858000` EMU (16:9, 13.33in × 7.5in).

Palette to reuse (already extracted, do not invent new colors):
- Navy text: `002060`
- Red accent/titles: `FF0000`, `D43225`
- Blue bar: `183A7C` / `17397F`
- Muted gray: `A5A5A5`
- Fonts: **Cambria** (title slide fields), **Times New Roman** (TOC + content slides), **Arial** (small print)

### 1.2 Recommended library

Use **[`pptx-automizer`](https://github.com/singerla/pptx-automizer)** (Node/TS library purpose-built for "edit an existing .pptx template while preserving its design") if the coding agent wants a higher-level API. It wraps exactly the unzip → clone slide → replace text/shapes → repack workflow.

If `pptx-automizer`'s API doesn't cleanly support a particular edit (e.g. dynamically varying the TOC bullet count, or inserting the slide-number field), **fall back to raw XML string manipulation via `jszip`**. This plan is written so either approach works — §4 gives you the exact XML edits needed either way.

```bash
npm install pptx-automizer jszip
```

---

## 2. Tech stack

- **Frontend:** Vite + React + TypeScript, **`@unbrn/ui`** component library (see §2.2), vanilla CSS for app-level layout only.
- **Backend:** Node.js + Express (or Vite's own dev-server API routes / a small serverless function — pick one, see §6). The Gemini API key and the PPTX assembly logic **must** live server-side. Never call Gemini directly from the browser (API key exposure).
- **AI:** `@google/genai` SDK, Gemini model with Google Search grounding.
- **PPTX engine:** `pptx-automizer` + `jszip` as fallback (§1.2).

### 2.1 Project structure

```
internship-ppt-ai/
├── template/
│   └── PPTFormat.pptx              # the uploaded template, committed as an asset
├── server/
│   ├── index.ts                    # Express app entrypoint
│   ├── routes/generate.ts          # POST /api/generate-ppt
│   ├── ai/
│   │   ├── research.ts             # Stage A: Gemini + Google Search grounding
│   │   └── outline.ts              # Stage B: Gemini structured JSON outline
│   ├── ppt/
│   │   ├── buildDeck.ts            # orchestrates the whole assembly
│   │   ├── titleSlide.ts           # fills slide1.xml placeholders
│   │   ├── tocSlide.ts             # rebuilds slide2.xml bullet list dynamically
│   │   ├── contentSlide.ts         # clones a "content slide" XML template per section
│   │   └── xmlUtils.ts             # shared XML find/replace + escaping helpers
│   └── types.ts                    # shared TS types (Outline, Section, FormInput)
├── src/                             # Vite React frontend
│   ├── App.tsx
│   ├── index.css                   # app-level layout only; @unbrn/ui handles component styles
│   ├── components/
│   │   ├── IntakeForm.tsx
│   │   ├── ProgressStepper.tsx
│   │   └── DownloadCard.tsx
│   └── api/client.ts               # calls POST /api/generate-ppt
├── .env                             # GEMINI_API_KEY=...
├── vite.config.ts
└── package.json
```

### 2.2 `@unbrn/ui` — frontend component library

The project lives inside the `@unbrn` monorepo where `@unbrn/ui` is already developed. Install it as a **workspace dependency** (no npm publish needed) so the frontend always tracks the local source:

```bash
# In internship-ppt-ai/package.json add:
"@unbrn/ui": "workspace:*"
# or, if the monorepo tooling doesn't support workspace:, use a local path:
"@unbrn/ui": "file:../../ui"
```

Then import individual sub-packages — `@unbrn/ui` ships named sub-paths for tree-shaking, and each brings its own CSS:

```ts
import { Button } from '@unbrn/ui/Button';
import { Input }  from '@unbrn/ui/Input';
import { Select } from '@unbrn/ui/Select';
import { Steps }  from '@unbrn/ui/Steps';
import { Alert }  from '@unbrn/ui/Alert';
import { Badge }  from '@unbrn/ui/Badge';
```

Also import the base CSS once in `src/main.tsx`:

```ts
import '@unbrn/ui/styles.css';
```

**Component mapping for this app:**

| UI need | `@unbrn/ui` component |
|---|---|
| Text inputs (Internship Title, Student Name, PRN, Class & Div) | `<Input variant="outlined" fullWidth label="…" />` |
| Program dropdown | `<Select variant="outlined" fullWidth label="Program" options={programOptions} />` |
| Generate button | `<Button variant="filled" size={2} fullWidth loading={isLoading}>Generate PPT</Button>` |
| Progress stages (Research → Draft → Build) | `<Steps items={stages} />` with custom step marker styling to show active/done state |
| Error feedback | `<Alert variant="duo" accentColor="#ef4444" title="Error" description={errorMessage} />` |
| Download again / Start over buttons | `<Button variant="outlined">…</Button>` |

Do **not** write raw `<input>`, `<button>`, or `<select>` HTML elements in form components — always use the `@unbrn/ui` equivalents above. App-level layout (page centering, card container, spacing) may use plain CSS since there are no layout primitives in `@unbrn/ui`.

---

## 3. AI pipeline (two Gemini calls, not one)

### Why two calls, not one

Your original snippet tried to do web-grounded research **and** force a strict `responseSchema` JSON output in a single call. In the Gemini API, combining the **Google Search grounding tool** with a strict structured-output schema in the same call is unreliable / not fully supported. So split it:

- **Stage A — Research (grounded, free text):** ask Gemini to research the internship title using Google Search grounding, return organized markdown notes.
- **Stage B — Structuring (schema-enforced, no tools):** feed Stage A's notes back into a second Gemini call with `responseMimeType: "application/json"` and a strict `responseSchema` to get the exact slide outline your PPTX builder needs.

Also: **the model name and `ThinkingLevel` import in your snippet don't exist.** Use a real current model id (check `/mnt/skills/public/product-self-knowledge` / Gemini docs at build time, since model names change — as of this plan, `gemini-2.5-flash` or `gemini-2.5-pro` are the right family). Verify exact ids before wiring this up.

### 3.1 Stage A — `server/ai/research.ts`

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function researchTopic(internshipTitle: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash", // verify current model id before shipping
    contents: [
      {
        role: "user",
        parts: [{
          text: `You are helping a computer science / IT college student prepare an
internship presentation titled: "${internshipTitle}".

Research this topic using web search and produce structured notes covering:
- What the technology/domain is and why it matters (for an Introduction)
- 3-5 concrete learning/project objectives typical of such an internship
- The natural breakdown of this topic into 2-4 technical modules (name each one)
- A plausible system/technical architecture for a project in this domain
- Typical results/observations a student would report
- Advantages and limitations of the technology/approach
- A closing conclusion

Write plain, factual notes in your own words. No fluff, no marketing language.`
        }],
      },
    ],
    tools: [{ googleSearch: {} }],
  });

  return response.text; // markdown/plain-text research notes
}
```

### 3.2 Stage B — `server/ai/outline.ts`

Define the JSON schema so the **module count is variable** but everything else is fixed and ordered. This directly encodes the user's rule: "Introduction, Objectives, Module 1..N, Architecture, Results, Advantages & Limitations, Conclusion."

```ts
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const outlineSchema = {
  type: Type.OBJECT,
  properties: {
    introduction: { type: Type.ARRAY, items: { type: Type.STRING } },
    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    modules: {
      type: Type.ARRAY,
      minItems: 1,
      maxItems: 5,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },        // e.g. "Data Preprocessing"
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "bullets"],
      },
    },
    architecture: { type: Type.ARRAY, items: { type: Type.STRING } },
    resultsAndObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
    advantages: { type: Type.ARRAY, items: { type: Type.STRING } },
    limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
    conclusion: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "introduction", "objectives", "modules", "architecture",
    "resultsAndObservations", "advantages", "limitations", "conclusion",
  ],
};

export async function buildOutline(researchNotes: string, internshipTitle: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{
      role: "user",
      parts: [{
        text: `Using ONLY the research notes below about the internship topic
"${internshipTitle}", produce a slide-ready outline as JSON.

Rules:
- Each array of bullets should have 4-6 concise bullet points (max ~15 words each), suitable for a PPT slide, not paragraphs.
- "modules" must contain between 1 and 4 modules depending on how naturally this topic decomposes — do not force a fixed number.
- Each module title should be a short technical phrase (2-5 words), NOT literally "Module 1".
- Be specific to this topic; no generic filler.

Research notes:
"""${researchNotes}"""`
      }],
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: outlineSchema,
    },
  });

  return JSON.parse(response.text);
}
```

### 3.3 Deriving the final slide list from the outline

```ts
type TocEntry = { title: string; kind: "intro" | "objectives" | "module" | "architecture" | "results" | "adv_lim" | "conclusion"; bullets: string[] };

function toSections(outline): TocEntry[] {
  return [
    { title: "Introduction", kind: "intro", bullets: outline.introduction },
    { title: "Introduction Objectives", kind: "objectives", bullets: outline.objectives },
    ...outline.modules.map((m, i) => ({
      title: `Module ${i + 1}: ${m.title}`,
      kind: "module" as const,
      bullets: m.bullets,
    })),
    { title: "Architecture", kind: "architecture", bullets: outline.architecture },
    { title: "Results and Observations", kind: "results", bullets: outline.resultsAndObservations },
    { title: "Advantages & Limitations", kind: "adv_lim", bullets: [...outline.advantages.map(a => `Advantage: ${a}`), ...outline.limitations.map(l => `Limitation: ${l}`)] },
    { title: "Conclusion", kind: "conclusion", bullets: outline.conclusion },
  ];
}
```

This array is what drives **both** the Table of Contents slide (§4.3) and the content slides (§4.4) — always build the TOC from this same list so it never drifts from what's actually in the deck.

---

## 4. PPTX assembly (`server/ppt/*`)

### 4.1 One-time setup

At server startup (or lazily on first request), load `template/PPTFormat.pptx` into memory once. Per-request, work on an in-memory clone (via `jszip`'s `.loadAsync(buffer)` on a fresh copy of the bytes) — don't mutate a shared instance across concurrent requests.

### 4.2 Title slide (`titleSlide.ts`)

Slide 1's XML has these exact known text runs to replace (confirmed from inspection):

| Placeholder text in XML | Replace with |
|---|---|
| `Internship Title` | form's Internship Title |
| `Student Name` (the run right before the literal `: ` run) | form's Student Name |
| `PRN:` → append value | form's PRN |
| `Class & Div:` → append value | form's Class & Div |
| `: (B.Tech- FY/SY/TY-CSE/IT/AIML/DS)/(BSc-FY/SY-CS/DSAI)/BCA(FY/SY)` | keep the label, but you can either leave the bracketed options as-is (student circles/deletes manually per college convention) **or** replace the whole run with `: ` + the selected Program value. **Ask the user which behavior they want** — default to replacing it with the exact program value the student typed, since the form already collects it.

Implementation: do a targeted string replace on the unzipped `ppt/slides/slide1.xml` text, matching on the `<a:t>...</a:t>` run contents shown above (not on styling attributes), so all formatting (Cambria 32 bold navy, etc.) is untouched. Always XML-escape user input (`&`, `<`, `>`, `"`, `'`) before inserting.

### 4.3 Table of Contents slide (`tocSlide.ts`)

Slide 2 currently hardcodes 8 `<a:p>` paragraph blocks (one per bullet, all sharing identical `pPr`/`rPr` styling — confirmed identical block structure per bullet). To make this dynamic:

1. Take **one** of the existing `<a:p>...</a:p>` bullet blocks as a template fragment.
2. For each entry in the `sections` array from §3.3, clone that fragment and swap only the `<a:t>` text.
3. Join all cloned fragments and replace the entire run of 8 `<a:p>` blocks inside the content text box (`Shape id="4"`, the one after the "Table of Contents" title shape) with the new dynamic list.
4. Keep the "Table of Contents" title shape untouched.

Because module titles can be longer than "Module 1" (e.g. "Module 2: Data Preprocessing"), and item count varies (could be 7–11 total entries vs. the fixed 8), **check for text overflow**: the content box is `cy="4529592"` EMU tall (~4.95in) at 20pt with `spcBef=1000`. Roughly 10-11 lines fit comfortably at 20pt; beyond that, shrink font size in steps (20pt → 18pt → 16pt) rather than letting text overflow — implement a simple loop: estimate lines needed, drop font size if the list has more than ~10 entries.

### 4.4 Content slides (`contentSlide.ts`) — the new part

There's no existing content-slide XML to clone verbatim, so construct one **content-slide template fragment** once (hand-authored, committed as a constant/string in the codebase, styled to match the deck's existing language from §1.1):

- Title textbox: same position/size class as slide 2's title shape, text color `FF0000`, Times New Roman, bold, 32pt.
- Body textbox: same position/size as slide 2's content shape, Times New Roman 20pt (drop to 18pt if >6 bullets), bullet char `•`, `algn="just"`, one `<a:p>` per bullet — same paragraph style already used in slide 2's TOC bullets so it's visually a sibling of the TOC, not a foreign layout.
- **Slide number field** (this is the "update Page Nos" requirement): add a placeholder shape referencing `<p:ph type="sldNum" idx="12"/>` (matching `slideLayout2.xml`) containing:
  ```xml
  <a:fld id="{GENERATE-A-GUID}" type="slidenum">
    <a:rPr lang="en-US"/>
    <a:t>‹#›</a:t>
  </a:fld>
  ```
  This is a **live PowerPoint field** — it auto-recalculates the correct page number no matter how many slides you insert, so you do not need to hardcode numbers per slide. Add this same field to slide 1, slide 2, and the Thank You slide too, so numbering is consistent across the whole deck (currently none of the 3 slides show a number at all — confirmed by inspection).
- Reference the new slide to `slideLayout2.xml` ("Title and Content") in its `.rels` file so PowerPoint treats it as a proper content slide (enables outline view, "Reset" behavior, etc.) even though we're hand-authoring the shape XML rather than inheriting placeholder positions.

For each entry in `sections` (§3.3), map it to one or more content slides depending on text volume, applying the auto-pagination rules described in §4.7.

### 4.5 Thank You slide

Slide 3 (existing) is unchanged in content — just gets moved to the end of `sldIdLst` (see §4.6) and gets the same slide-number field added.

### 4.6 Wiring new slides into the package

For every new slide file `ppt/slides/slideN.xml` you create:

1. Add it to `[Content_Types].xml`:
   ```xml
   <Override PartName="/ppt/slides/slideN.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
   ```
2. Add a relationship in `ppt/_rels/presentation.xml.rels`:
   ```xml
   <Relationship Id="rIdXX" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slideN.xml"/>
   ```
3. Create `ppt/slides/_rels/slideN.xml.rels` pointing that slide at its layout:
   ```xml
   <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/>
   ```
4. Insert a `<p:sldId id="..." r:id="rIdXX"/>` into `ppt/presentation.xml`'s `<p:sldIdLst>` **in the correct order**: Title → TOC → \[Introduction, Objectives, Module 1..N, Architecture, Results, Advantages & Limitations, Conclusion\] → Thank You. `id` attributes must be unique (increment from the current max, PowerPoint requires ≥ 256); `r:id` values must be unique across the whole `.rels` file.
5. Re-zip everything (`jszip.generateAsync({ type: "nodebuffer" })`) and return the buffer.

This 5-step pattern (Content_Types + presentation.rels + slide.rels + sldIdLst + rezip) is the standard recipe for adding any slide to any `.pptx` programmatically — `pptx-automizer`'s `addSlide()` does this for you if you go that route; if hand-rolling with `jszip`, write it once as a reusable `insertSlide()` helper.

### 4.7 Handling Content Overflow and Auto-Pagination — Full Spec

> **Why this matters:** If the Gemini-generated text for any section doesn't fit inside the slide's physical body textbox (`cy="4529592"` EMU / ~4.95in at 20pt), PowerPoint will silently let it overflow the box boundary and clip or overlap neighboring shapes — ruining the design. The frontend can't fix this because the PPTX is assembled server-side. This must be caught and resolved entirely in `contentSlide.ts` before writing the XML.

#### Step 0 — Enforce prompt-level limits first (upstream prevention)

In the Stage B prompt (§3.2) already enforce:
- **Max bullets per section: 6**
- **Max words per bullet: 15** (~75–90 chars including spaces)

This is your first line of defense. Overflow handling below is the **safety net** for when Gemini ignores or bends these limits, not the primary strategy.

#### Step 1 — Virtual line budget calculation

Before writing any slide XML, run this estimate for every section's bullet array:

```ts
const CHARS_PER_LINE: Record<number, number> = {
  20: 65,  // Times New Roman 20pt, widescreen body box
  18: 75,
  16: 85,
};
const SPACING_LINES_PER_BULLET = 1; // spcBef = 1 virtual line
const MAX_VIRTUAL_LINES = 9;        // safe budget at any font size

function estimateVirtualLines(bullets: string[], fontSize: 20 | 18 | 16): number {
  const cpl = CHARS_PER_LINE[fontSize];
  return bullets.reduce((sum, b) => {
    const textLines = Math.ceil(b.length / cpl);
    return sum + textLines + SPACING_LINES_PER_BULLET;
  }, 0);
}
```

#### Step 2 — Tier 1: Font-size reduction (minor overflow)

Run this before deciding to paginate:

```ts
function chooseFontSize(bullets: string[]): 20 | 18 | 16 | null {
  for (const fs of [20, 18, 16] as const) {
    if (estimateVirtualLines(bullets, fs) <= MAX_VIRTUAL_LINES) return fs;
  }
  return null; // still overflows even at 16pt → must paginate
}
```

- If `chooseFontSize` returns 18 or 16, set that font size in the `<a:rPr sz="…"/>` of every run in the body textbox.
- At 16pt the box fits ~11 lines; beyond that, shrinking font further would make the slide unreadable, so paginate instead.

#### Step 3 — Tier 2: Slide auto-pagination (major overflow)

If `chooseFontSize` returns `null`, split the bullet array into multiple slides:

```ts
const CHUNK_VIRTUAL_LINE_BUDGET = 8; // leave 1 line margin vs MAX_VIRTUAL_LINES

function paginateBullets(bullets: string[]): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];

  for (const bullet of bullets) {
    const candidate = [...current, bullet];
    // Try to fit at 20pt first; if it doesn't, still add — next loop will trim
    if (estimateVirtualLines(candidate, 20) > CHUNK_VIRTUAL_LINE_BUDGET && current.length > 0) {
      pages.push(current);
      current = [bullet];
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) pages.push(current);
  return pages;
}
```

**Title naming for paginated slides:**
- If `pages.length === 1` → just use the base section title (no suffix).
- If `pages.length > 1` → title each slide `"Title (1/N)"`, `"Title (2/N)"`, … where N = total pages.

**Integration in `buildDeck.ts`:**
```ts
for (const section of sections) {
  const pages = paginateBullets(section.bullets);
  const totalPages = pages.length;

  for (let p = 0; p < pages.length; p++) {
    const slideTitle = totalPages > 1
      ? `${section.title} (${p + 1}/${totalPages})`
      : section.title;
    const fontSize = chooseFontSize(pages[p]) ?? 16; // 16 is the floor
    insertSlide(zip, { title: slideTitle, bullets: pages[p], fontSize });
  }
}
```

#### Step 4 — TOC slide integrity

The TOC is built from `sections` **before** pagination, so it always lists each section once by its base title — pagination sub-slides are never added to the TOC. This keeps the TOC uncluttered regardless of how many times a section is split.

Example: "Advantages & Limitations" may produce 2 slides (`Advantages & Limitations (1/2)` and `(2/2)`), but the TOC entry is just `Advantages & Limitations`.

#### Step 5 — TOC overflow guard (same principle)

The TOC itself can overflow if there are many modules + paginated entries. Apply the same font-size reduction to `tocSlide.ts`:
- Count total TOC entries (= `sections.length`, which is always the **base** section count, not the paginated count).
- If entries > 10: use 18pt; if > 12: use 16pt. Beyond 14 entries reduce to 14pt as a last resort (the TOC box is taller than content boxes).
- Maximum realistic entry count: 3 fixed (Intro, Objectives, Architecture) + 4 modules + 3 fixed (Results, Adv&Lim, Conclusion) = **10 entries** at max modules — comfortably fits at 20pt in most cases.

#### Step 6 — QA test cases to run

Before connecting AI, write a unit test for `contentSlide.ts`/`tocSlide.ts` that feeds each of these inputs and asserts the correct font size and page count:

| Input | Expected behavior |
|---|---|
| 4 bullets × 10 words each | 1 slide, 20pt |
| 6 bullets × 15 words each | 1 slide, 18pt (borderline) |
| 8 bullets × 15 words each | 2 slides, 20pt each |
| 1 bullet × 200 chars | 1 slide (single bullet won't paginate), 16pt |
| 12 bullets × 5 words each | 2 slides (chunk by virtual-line budget) |

---

## 5. Backend API

### `POST /api/generate-ppt`

**Request body:**
```json
{
  "internshipTitle": "Machine Learning for Predictive Maintenance",
  "studentName": "Jane Doe",
  "prn": "2023xxxxxx",
  "classDiv": "TY-B",
  "program": "B.Tech-TY-CSE"
}
```

**Response:** `application/vnd.openxmlformats-officedocument.presentationml.presentation` binary stream, with `Content-Disposition: attachment; filename="<slugified-internship-title>.pptx"`.

**Server-side flow (`buildDeck.ts`):**
1. Validate all 5 fields are non-empty (400 if not).
2. `researchTopic(internshipTitle)` → Stage A.
3. `buildOutline(notes, internshipTitle)` → Stage B → parsed JSON, wrap in try/catch (`JSON.parse` can fail if the model misbehaves — retry once on parse failure before failing the request).
4. `toSections(outline)` → ordered section list.
5. Clone template bytes → apply `titleSlide()`, `tocSlide(sections)`, then loop `contentSlide(section, index)` for each section, then fix up Thank You + numbering.
6. Return buffer.

Consider a simple in-memory queue or just letting Express handle it synchronously per request — this is a low-traffic college tool, no need for a job queue unless you expect concurrent classroom usage spikes (in which case, cap concurrent Gemini calls with a semaphore, e.g. `p-limit(3)`).

### Timing / UX note

The full pipeline (2 Gemini calls + XML assembly) will likely take **15–45 seconds**. The frontend must show real progress, not a spinner that looks frozen (see §6).

---

## 6. Frontend (`src/`)

> **Design rule:** All interactive UI elements (inputs, selects, buttons, progress, alerts) **must** use `@unbrn/ui` components. See §2.2 for the component map, install instructions, and the base CSS import.

### 6.1 `IntakeForm.tsx`

Controlled form with 5 fields, all using `@unbrn/ui`:

```tsx
import { Input }  from '@unbrn/ui/Input';
import { Select } from '@unbrn/ui/Select';
import { Button } from '@unbrn/ui/Button';

const PROGRAM_OPTIONS = [
  { value: 'B.Tech-FY-CSE',  label: 'B.Tech FY – CSE' },
  { value: 'B.Tech-SY-CSE',  label: 'B.Tech SY – CSE' },
  { value: 'B.Tech-TY-CSE',  label: 'B.Tech TY – CSE' },
  { value: 'B.Tech-FY-IT',   label: 'B.Tech FY – IT'  },
  // … all options from the template
  { value: 'BSc-FY-CS',      label: 'BSc FY – CS'     },
  { value: 'BSc-SY-DSAI',    label: 'BSc SY – DSAI'   },
  { value: 'BCA-FY',         label: 'BCA FY'           },
  { value: 'BCA-SY',         label: 'BCA SY'           },
];

// Usage:
<Input variant="outlined" fullWidth label="Internship Title" ... />
<Input variant="outlined" fullWidth label="Student Name" ... />
<Input variant="outlined" fullWidth label="PRN" ... />
<Input variant="outlined" fullWidth label="Class & Div" ... />
<Select variant="outlined" fullWidth label="Program" options={PROGRAM_OPTIONS} ... />
<Button variant="filled" size={2} fullWidth loading={isLoading} type="submit">
  Generate PPT
</Button>
```

The `Input` component already handles `error` props for field validation feedback — pass the validation error string and it renders it below the input automatically.

### 6.2 `ProgressStepper.tsx`

Use `@unbrn/ui/Steps` to show the 3 pipeline stages:

```tsx
import { Steps } from '@unbrn/ui/Steps';

const STAGE_ITEMS = [
  { title: 'Researching topic',        description: 'Searching the web…'      },
  { title: 'Drafting slide content',   description: 'Structuring your deck…'  },
  { title: 'Building presentation',    description: 'Assembling .pptx file…'  },
];

<Steps items={STAGE_ITEMS} />
```

Since a single POST can't easily push discrete stage events without SSE/WebSocket plumbing, fake per-stage timing on the client: advance `currentStep` by a timer (e.g., ~10s for stage 1, ~10s for stage 2, hold on stage 3 until the response arrives). Style the active marker differently using the `classNames.marker` / `styles.marker` prop — the `Steps` component accepts per-part style overrides.

### 6.3 `DownloadCard.tsx`

On success, trigger a file download (`URL.createObjectURL` on the returned blob) and show:

```tsx
<Button variant="filled" icon={<Download size={16} />}>Download PPT</Button>
<Button variant="outlined" onClick={onReset}>Start Over</Button>
```

Both are `@unbrn/ui/Button`. The `icon` prop places an icon left of the label with the correct spacing built in.

### 6.4 Error states

Handle and surface all failures using `@unbrn/ui/Alert`:

```tsx
import { Alert } from '@unbrn/ui/Alert';

<Alert
  variant="duo"
  accentColor="#ef4444"
  icon={<AlertCircle size={18} />}
  title="Generation failed"
  description={errorMessage}
  actions={
    <Button variant="outlined" size={1} onClick={onRetry}>Try again</Button>
  }
/>
```

Errors to handle: empty/invalid form fields (use `Input`/`Select` `error` prop, not `Alert`), Gemini API failures (rate limit, safety block, malformed JSON after retry), and PPTX assembly failures.

---

## 7. Environment & secrets

```
# .env (server only — never expose to the Vite client bundle)
GEMINI_API_KEY=your-key-here
PORT=3001
```

In `vite.config.ts`, proxy `/api` to the Express server during dev so the frontend can call relative paths.

---

## 8. Build order for the coding agent (do this sequentially)

1. Scaffold Vite + React + TS project; scaffold Express server as a sibling, wired via Vite proxy.
2. Commit `template/PPTFormat.pptx` as a binary asset.
3. Write `xmlUtils.ts`: `escapeXml()`, `unzipTemplate()`, `insertSlide()` helper (the 5-step recipe in §4.6), `rezip()`.
4. Hand-author the content-slide XML fragment (§4.4) as a constant and get it rendering correctly as a **static test** first (hardcode dummy text, generate a .pptx, open it, confirm it visually matches slide 2's style and the page number field works) — **do this before touching AI at all**, so template-fidelity bugs are isolated from AI-content bugs.
5. Implement `titleSlide.ts` + `tocSlide.ts` with static test data; confirm placeholders replace correctly and TOC dynamic-length logic doesn't overflow at 8, and also test at 11 entries.
6. Wire up `research.ts` + `outline.ts` against the real Gemini API with 2-3 sample internship titles; log/inspect the raw outline JSON before connecting it to the PPTX builder.
7. Connect the AI outline → `toSections()` → apply auto-pagination/line estimation logic (§4.7) → the slide builders → full `buildDeck.ts`. Generate an end-to-end deck for a real sample input.
8. **Visual QA the generated deck** (see §9) including verifying pagination behavior by artificially feeding long text inputs before building the frontend.
9. Build the React form + progress UI + download flow.
10. End-to-end test with 3-4 different internship titles of varying "breadth" (one that should yield 1 module, one that should yield 4) to confirm the module-count logic behaves.

---

## 9. QA checklist (run this on every generated deck before calling it done)

- [ ] Slide 1: all 5 form fields appear correctly, no leftover placeholder text (`Internship Title`, `Student Name`, `: (B.Tech...)` literal text) anywhere in the final file.
- [ ] Slide 2 TOC entry list **exactly matches** the titles of the content slides that follow, in the same order.
- [ ] Slide numbers appear on every slide and are sequential (open in PowerPoint/LibreOffice — the `slidenum` field should just work).
- [ ] No text overflow on the TOC slide when module count is at its max (4 modules → 11 TOC entries).
- [ ] No text overflow on any content slide. Verify that slides with excessive content or long bullets are dynamically split into paginated slides (e.g. "Title (1/2)") and font sizes scaled appropriately according to §4.7.
- [ ] TOC lists only the unique parent section names (not the individual paginated sub-slides) to keep the TOC within bounds.
- [ ] Fonts/colors on new content slides match slide 2's existing look (Times New Roman body, red bold titles) — no stray default "Calibri/Aptos" from an unstyled placeholder.
- [ ] Thank You slide is last.
- [ ] File opens cleanly in real PowerPoint, not just LibreOffice (LibreOffice is more forgiving of malformed OOXML — always sanity check in real PowerPoint or Office Online before shipping).

---

## 10. Open questions to resolve with your professor/team before building

1. Should the **Program** field on slide 1 replace the full bracketed options text, or should the bracketed options stay and the student's specific program just gets appended/bolded? (§4.2)
2. Do you want **images/diagrams** on the Architecture slide (AI-generated or a simple auto-drawn box diagram), or bullets-only for v1? Bullets-only is much simpler and matches the "no design changes" constraint most safely — recommend starting there.
3. Confirm current exact Gemini model ids and whether your Google AI Studio / Vertex plan has Google Search grounding enabled (it's a paid-tier feature on some plans) — verify before building Stage A.