# Semaphore — Implementation Plan

A real-time workshop status board. Facilitators create workshops, participants join and signal their state (Ready / Working / Stuck) with colored circles. Everyone sees the room status at a glance.

---

## Design Decisions

| Decision | Answer |
|---|---|
| **Stack** | TanStack Start on Cloudflare Workers, Durable Objects, KV |
| **URLs** | `/` home, `/:slug` dashboard, `/:slug/:name` participant |
| **Workshop names** | Auto-generated single fun word, editable, re-rollable, must be unique |
| **Participant names** | Entered on join, must be unique per workshop |
| **Auth** | None. Everything public. Anyone can view, join, delete |
| **Real-time** | WebSockets via Durable Object |
| **Dashboard** | Grid of colored circles, names underneath, online indicator dot, auto-scaling, names hidden at high counts with hover to reveal |
| **Participant page** | Three circles (Ready/Working/Stuck), vertical on mobile, horizontal on desktop, plus Leave button |
| **Disconnected state** | Greyed out on dashboard, persists until explicitly removed |
| **Workshop deletion** | Confirmation dialog, broadcasts "workshop ended" to all connections |
| **Styling** | Cream background, bold typography, status colors as the only color, generous whitespace, minimal chrome |
| **Slug-to-DO mapping** | Cloudflare KV: slug -> DO ID when active, deleted on workshop close |

---

## Phase 1: Infrastructure

Strip all TanStack boilerplate and set up Cloudflare Workers deployment.

### 1.1 Clean the boilerplate
- Remove all existing route content (`index.tsx`, `about.tsx`)
- Remove `Header.tsx`, `Footer.tsx`, `ThemeToggle.tsx` components
- Strip `styles.css` down to a minimal Tailwind base
- Remove Google Fonts imports (Manrope, Fraunces)
- Remove `lucide-react` dependency
- Clean `__root.tsx` to a bare shell

### 1.2 Configure Cloudflare Workers deployment
- Add `wrangler.json` with Workers config
- Configure TanStack Start for Cloudflare Workers preset
- Add `@cloudflare/workers-types` dev dependency
- Set up KV namespace binding (`WORKSHOPS`)
- Set up Durable Object binding (`WORKSHOP_ROOM`)
- Add deploy script to `package.json`
- Verify dev server works with `wrangler dev` or local Vite proxy

### 1.3 Set up the Durable Object class
- Create `src/worker/WorkshopRoom.ts` — the Durable Object class
- Implement basic lifecycle: constructor, fetch handler
- WebSocket accept/close handling
- In-memory state: participants map (`name -> { status, connected }`)
- Broadcast helper: send state updates to all connected clients
- Wire DO into `wrangler.json` bindings

### 1.4 Set up KV for slug registry
- Create KV namespace in Cloudflare dashboard (or via wrangler)
- API helpers: `createWorkshop(slug)`, `deleteWorkshop(slug)`, `listWorkshops()`, `workshopExists(slug)`
- KV stores: `slug -> { doId, name, createdAt }`

---

## Phase 2: Routes & Core UI

### 2.1 Styling foundation
- System font stack or single clean sans-serif
- Cream/off-white background (`#faf9f6` or similar)
- Status colors: green (Ready), amber (Working), coral/red (Stuck)
- Single accent color (deep indigo/blue) for interactive elements
- Bold typographic hierarchy — large headings, generous spacing
- No cards, no shadows, no gradients — just type, circles, and whitespace

### 2.2 Home page (`/`)
- List of active workshops fetched from KV
- Each workshop: name displayed, links to `/:slug`
- "Create workshop" button
- Create flow:
  - Random single word from curated word list (50-100 safe, fun words)
  - Editable text field for the name
  - Re-roll button for a new random word
  - On submit: check KV for uniqueness, block if taken, otherwise create DO + KV entry and redirect to `/:slug`

### 2.3 Workshop dashboard (`/:slug`)
- Fetch workshop from KV, 404 if not found
- Connect to DO via WebSocket
- Display grid of participant circles:
  - Circle color = status (green/amber/coral)
  - Name underneath each circle
  - Small online/offline indicator dot next to name
  - Circles auto-size to fill viewport without scrolling
  - At high participant counts (threshold TBD, maybe 40+), hide names, show on hover
- "Join" section: text input for name, submit button
  - On submit: check name uniqueness in DO, show "name taken" message if duplicate
  - On success: redirect to `/:slug/:name`
- "Close workshop" button with confirmation dialog
- Real-time updates: all status changes reflected instantly via WebSocket broadcast

### 2.4 Participant page (`/:slug/:name`)
- Connect to DO via WebSocket
- Display: participant's name at the top
- Three status circles with labels:
  - Ready (green)
  - Working (amber)
  - Stuck (coral/red)
- Layout: vertical stack on mobile, horizontal row on desktop
- Active status is filled/bold, others are muted/outlined
- Default status on join: Working (amber)
- Tap to change — instant WebSocket update
- "Leave" button: removes participant from workshop entirely, redirects to `/:slug`
- Anyone can access this page and change status / leave (no identity check)

---

## Phase 3: Real-time & Polish

### 3.1 Durable Object WebSocket protocol
- Messages from client to DO:
  - `{ type: "join", name: string }` — add participant
  - `{ type: "status", name: string, status: "ready" | "working" | "stuck" }` — update status
  - `{ type: "leave", name: string }` — remove participant
- Messages from DO to clients:
  - `{ type: "state", participants: Array<{ name, status, connected }> }` — full state broadcast
  - `{ type: "workshop_closed" }` — workshop deleted
- On WebSocket close: mark participant as disconnected (not removed), broadcast updated state
- On WebSocket reconnect (same name): mark as connected again

### 3.2 Workshop deletion flow
- Anyone clicks "Close workshop" on dashboard
- Confirmation dialog: "Are you sure? This will end the workshop for everyone."
- On confirm:
  - DO broadcasts `{ type: "workshop_closed" }` to all connections
  - DO clears all state and closes all WebSockets
  - KV entry for slug is deleted
  - All connected clients show "This workshop has ended" with a link to home

### 3.3 Disconnection handling
- WebSocket heartbeat (ping/pong) to detect stale connections
- On disconnect: participant stays on dashboard, circle goes translucent/greyed, small offline indicator
- On reconnect: circle restores, online indicator returns
- Timeout TBD — or just leave greyed indefinitely until manually removed via Leave

### 3.4 Mobile-first polish
- Participant page: large tap targets, no accidental taps
- Dashboard: responsive grid, readable on phone and on a room monitor
- Test at various participant counts (5, 20, 50, 100)
- Smooth transitions on status changes (subtle color animation)

---

## Phase 4: Fun Details

### 4.1 Word list
- Curate 50-100 single words: animals, space, nature, food
- Examples: falcon, nebula, coral, bonsai, thunder, maple, aurora, pretzel, quasar, cactus
- No words that could be inappropriate or confusing
- Stored as a simple array in source code

### 4.2 "Workshop ended" experience
- Clean full-screen message: "This workshop has ended."
- Link back to home page
- No jarring redirect — participants see the message on their phone

### 4.3 Name editing
- On participant page, name is editable (tap to edit)
- Must still be unique — validate before accepting
- Updates URL from `/:slug/:old-name` to `/:slug/:new-name`

---

## Route Structure

```
src/routes/
  __root.tsx           — minimal shell, cream background, no header/footer chrome
  index.tsx            — home: active workshops list + create
  $slug.tsx            — workshop dashboard: circle grid + join form + close button
  $slug.$name.tsx      — participant page: three status circles + leave button
```

---

## File Structure (anticipated)

```
src/
  routes/
    __root.tsx
    index.tsx
    $slug.tsx
    $slug.$name.tsx
  worker/
    WorkshopRoom.ts      — Durable Object class
  lib/
    words.ts             — curated word list
    protocol.ts          — WebSocket message types
  components/
    StatusCircle.tsx      — reusable colored circle
    ParticipantDot.tsx    — circle + name + online indicator (dashboard)
    WorkshopGrid.tsx      — responsive auto-sizing grid
    CreateWorkshop.tsx    — name input + re-roll + create button
    JoinWorkshop.tsx      — name input for joining
wrangler.json
```
