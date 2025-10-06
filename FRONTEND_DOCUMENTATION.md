# METR Productivity Study Dashboard - Frontend Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack & Architecture](#tech-stack--architecture)
3. [Project Structure](#project-structure)
4. [Key Components](#key-components)
5. [Data Flow](#data-flow)
6. [Sankey Diagram Implementation](#sankey-diagram-implementation)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Design System](#design-system)
9. [Environment Setup](#environment-setup)
10. [Development Guide](#development-guide)

---

## Project Overview

A Next.js 15 dashboard visualizing the recruitment funnel for METR's productivity study with developers. The app connects to Airtable via API and displays real-time metrics, status breakdowns, and an interactive Sankey diagram showing how 124 applicants flow through 9 recruitment stages.

**Current State:** Fully functional MVP with all Priority 1 and Priority 2 features complete. Backend is stable. Frontend ready for design enhancements.

---

## Tech Stack & Architecture

### Core Technologies
- **Framework:** Next.js 15.5.4 with Turbopack
- **Runtime:** React 19.1.0
- **Language:** TypeScript 5+ (strict mode enabled)
- **Styling:** Tailwind CSS 4
- **Data Visualization:** D3.js 7 + d3-sankey 0.12.3
- **Backend/Data:** Airtable API (via `airtable` npm package v0.12.2)

### Architecture Pattern
- **App Router:** Next.js 15 App Router (`/app` directory)
- **Rendering Strategy:** 
  - Client-side components for interactivity (`'use client'`)
  - Server-side API routes for Airtable data fetching
- **State Management:** React hooks (`useState`, `useEffect`) - no external state library
- **API Layer:** RESTful endpoints in `/app/api`

---

## Project Structure

```
metr-productivity-app/
├── app/
│   ├── api/                      # Server-side API routes
│   │   ├── people/
│   │   │   ├── route.ts          # GET /api/people - Fetch all applicants
│   │   │   └── [id]/
│   │   │       └── route.ts      # PATCH /api/people/[id] - Update record
│   │   └── funnel-events/
│   │       └── route.ts          # GET /api/funnel-events - Fetch 218 transitions
│   ├── table/
│   │   └── page.tsx              # /table - Searchable data table view
│   ├── page.tsx                  # / - Main dashboard with Sankey + metrics
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   └── globals.css               # Global styles + Tailwind imports
├── components/
│   └── SankeyChart.tsx           # D3 Sankey diagram component
├── lib/
│   ├── airtable.ts               # Airtable client & data fetchers
│   └── sankeyData.ts             # Transform funnel events → Sankey format
├── public/                       # Static assets
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.ts                # Next.js config
├── tailwind.config.js            # Tailwind config (auto-generated)
└── .env.local                    # Environment variables (not in git)
```

---

## Key Components

### 1. Dashboard (`app/page.tsx`)
**Purpose:** Main landing page showing KPIs, Sankey diagram, status breakdown, and closure reasons.

**Key Features:**
- Fetches both `/api/people` and `/api/funnel-events` in parallel on mount
- 30-second auto-refresh interval for live data updates
- Displays 4 key metrics with percentages
- Sankey diagram as centerpiece
- Pipeline status bars with counts and percentages
- Closure reasons breakdown (conditional - only if closed records exist)
- Link to full table view

**State:**
```typescript
const [people, setPeople] = useState<Person[]>([]);
const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
const [loading, setLoading] = useState(true);
```

**Data Loading Pattern:**
```typescript
useEffect(() => {
  const load = async () => {
    const [peopleRes, eventsRes] = await Promise.all([
      fetch('/api/people'),
      fetch('/api/funnel-events')
    ]);
    const peopleData = await peopleRes.json();
    const eventsData = await eventsRes.json();
    setPeople(peopleData);
    setSankeyData(transformEventsToSankey(eventsData));
    setLoading(false);
  };
  load();
  const interval = setInterval(load, 30000); // Auto-refresh every 30s
  return () => clearInterval(interval);
}, []);
```

---

### 2. Table View (`app/table/page.tsx`)
**Purpose:** Searchable, filterable table of all 124 applicants.

**Key Features:**
- Search by name or email (case-insensitive)
- Filter by status dropdown
- Color-coded status badges
- Shows: Name, Email, Status, Close Class, Role, Source
- Displays filtered count vs total count
- Status badges have hover tooltips with descriptions

**Filters:**
```typescript
const [filter, setFilter] = useState('');         // Text search
const [statusFilter, setStatusFilter] = useState('All'); // Status dropdown
```

---

### 3. Sankey Chart Component (`components/SankeyChart.tsx`)
**Purpose:** D3-powered visualization of recruitment funnel flow.

**Props:**
```typescript
interface SankeyChartProps {
  data: SankeyData;
  width?: number;   // Default: 1200px
  height?: number;  // Default: 600px
}
```

**D3 Configuration:**
```typescript
const sankeyGenerator = sankey<any, any>()
  .nodeId((d: any) => d.name)          // Use status name as node ID
  .nodeAlign(sankeyLeft)                // Left-align nodes in columns
  .nodeWidth(20)                        // Node rectangle width
  .nodePadding(30)                      // Vertical space between nodes
  .extent([[0, 0], [innerWidth, innerHeight]])
  .iterations(32);                      // Layout optimization iterations
```

**Margins:**
- Top: 40px (space for labels)
- Right: 150px (right-side labels)
- Bottom: 20px
- Left: 100px (left-side labels)

**Color Scheme:**
- `#3b82f6` - Blue for active stages (New, Lead, Scheduling Email Sent, etc.)
- `#ef4444` - Red for Closed
- `#eab308` - Yellow for Paused

**Interactions:**
- Hover on links: Opacity increases 0.4 → 0.7, width increases 20%
- Tooltips on nodes: Shows status name + count
- Tooltips on links: Shows "Source → Target\nX people"

---

### 4. Data Transformation (`lib/sankeyData.ts`)
**Purpose:** Convert Airtable funnel events into D3 Sankey format.

**Critical Detail - Status Names MUST Match Airtable Exactly:**
```typescript
const STATUS_ORDER = [
  'New',
  'Lead',
  'Scheduling Email Sent',    // Note: Capital E, Capital S
  'Call Scheduled',            // Note: Capital S, Capital C
  'Call Completed',            // Note: Capital C, Capital C
  'Onboarded',
  'Active',
  'Paused',
  'Closed'
] as const;
```

**Algorithm:**
1. Count all transitions from `From Status` → `To Status` fields in funnel events
2. Create nodes for all 9 statuses
3. Create links only for transitions where both source and target exist in `STATUS_ORDER`
4. Use status **names** (not indices) as `source`/`target` because D3 `.nodeId()` expects names

**Data Structures:**
```typescript
interface SankeyNode {
  name: string;
  category: 'active' | 'closed' | 'paused';
}

interface SankeyLink {
  source: number | string;  // Status name (e.g., "New", "Lead")
  target: number | string;  // Status name (e.g., "Lead", "Closed")
  value: number;            // Number of people who made this transition
}
```

---

### 5. Airtable Integration (`lib/airtable.ts`)
**Purpose:** Connect to Airtable base and fetch data.

**Environment Variables Required:**
```bash
AIRTABLE_ACCESS_TOKEN=your_pat_here
AIRTABLE_BASE_ID=appfGnLBEP1dDQasz
AIRTABLE_TABLE_NAME=People
```

**Tables Used:**
1. **People** (`AIRTABLE_TABLE_NAME`)
   - Fields: Name, Email, Status, Close Class, Role, GitHub Link, Source/Channel, Created
   - 124 total records

2. **Funnel Events** (hardcoded name: `'Funnel Events'`)
   - Fields: From Status, To Status, Changed At, Lead (linked record), Changed By
   - 218 backfilled transition events

**Functions:**
```typescript
getAllPeople() → Person[]           // Fetch all applicants
getAllFunnelEvents() → FunnelEvent[] // Fetch all transitions (sorted by Changed At)
updatePersonStatus(id, status)      // Update a person's status
updatePersonField(id, field, value) // Generic field update
```

---

## Data Flow

### Request Flow Diagram
```
User opens dashboard
    ↓
Client Component (app/page.tsx)
    ↓
    ├─→ fetch('/api/people')
    │       ↓
    │   API Route (app/api/people/route.ts)
    │       ↓
    │   getAllPeople() from lib/airtable.ts
    │       ↓
    │   Airtable API → People table
    │       ↓
    │   Returns 124 records
    │
    └─→ fetch('/api/funnel-events')
            ↓
        API Route (app/api/funnel-events/route.ts)
            ↓
        getAllFunnelEvents() from lib/airtable.ts
            ↓
        Airtable API → Funnel Events table
            ↓
        Returns 218 events
            ↓
        transformEventsToSankey() in client
            ↓
        SankeyData { nodes, links }
            ↓
        <SankeyChart data={sankeyData} />
            ↓
        D3 renders SVG
```

### Funnel Flow Logic (Business Rules)
1. **All applicants start at "New"** when form is submitted
2. **Lead → Scheduling Email Sent is automatic** (100% conversion via Airtable automation)
   - No one stays at "Lead" status in current data
   - Lead is a passthrough node
3. **Progressive dropoff** through subsequent stages:
   - New: 113 start
   - Lead: 34 reach (all auto-progress to Scheduling Email Sent)
   - Scheduling Email Sent: 34
   - Call Scheduled: 25 (9 dropped off)
   - Call Completed: 20 (5 dropped off)
   - Onboarded: 17 (3 went to Paused)
   - Active: 6 (final success state)
   - Paused: 3
   - Closed: 79 (total dropouts from various stages)

---

## Sankey Diagram Implementation

### Critical Issues Encountered & Solutions

#### **Issue 1: "missing: 0" Runtime Error**
**Error Message:**
```
Runtime Error: missing: 0
at sankeyGenerator(graphData)
```

**Root Cause:** D3 Sankey mutates the input data structure in place, rather than returning a new object. The code was trying to use the return value.

**Solution:**
```typescript
// ❌ WRONG - This causes "missing: 0" error
const graph = sankeyGenerator({ nodes: [...], links: [...] });
const nodes = graph.nodes;

// ✅ CORRECT - D3 mutates graphData directly
const graphData = { nodes: [...], links: [...] };
sankeyGenerator(graphData);  // Returns graphData (mutated)
const nodes = graphData.nodes;  // Use the mutated data
```

---

#### **Issue 2: Status Name Capitalization Mismatch**
**Symptoms:**
- Only 3 links rendering (New→Lead, New→Closed, Onboarded→Active)
- Console warnings: "Skipping link: 'Scheduling Email Sent' → 'Call Scheduled' (source exists: false)"
- 5 of 8 transitions ignored

**Root Cause:** `STATUS_ORDER` array used lowercase status names that didn't match Airtable's exact field values.

**Comparison:**
```typescript
// ❌ WRONG - Didn't match Airtable
'Scheduling email sent'   // lowercase e, s
'Call scheduled'          // lowercase s
'Call completed'          // lowercase c

// ✅ CORRECT - Exact Airtable values
'Scheduling Email Sent'   // Capital E, S
'Call Scheduled'          // Capital S, C  
'Call Completed'          // Capital C, C
```

**Debug Process:**
1. Added console logging to `transformEventsToSankey()`
2. Logged `transitionCounts` object → saw "Lead→Scheduling Email Sent: 34"
3. Logged `STATUS_ORDER` → saw mismatched capitalization
4. Fixed `STATUS_ORDER` to match exact Airtable values
5. Result: All 8 transitions now render correctly

**Key Takeaway:** When integrating with Airtable, field values are **case-sensitive** and must match exactly.

---

#### **Issue 3: Nodes Stacked Vertically Instead of Horizontal Flow**
**Symptoms:**
- All nodes bunched on left/right sides
- Large empty space in middle
- Nodes vertically stacked with no horizontal progression

**Root Cause:** Default D3 Sankey alignment wasn't optimized for this funnel structure.

**Solutions Applied:**
```typescript
// 1. Set left-alignment for consistent flow
.nodeAlign(sankeyLeft)

// 2. Increase iterations for better layout optimization
.iterations(32)  // Default is 6, more iterations = better spacing

// 3. Adjust node sizing
.nodeWidth(20)      // Wider nodes for visibility
.nodePadding(30)    // More vertical space between nodes

// 4. Increase margins for labels
const margin = { top: 40, right: 150, bottom: 20, left: 100 };
```

---

#### **Issue 4: Link Source/Target Format Confusion**
**Issue:** Should links use numeric indices or string names?

**Answer:** **Use string names** when using `.nodeId()`.

```typescript
// D3 Sankey with .nodeId() expects:
{
  source: 'New',    // ✅ String name
  target: 'Lead',   // ✅ String name
  value: 34
}

// NOT:
{
  source: 0,        // ❌ Numeric index
  target: 1,        // ❌ Numeric index
  value: 34
}
```

**Why:** When you configure `.nodeId((d) => d.name)`, D3 uses node names to match links to nodes. If you pass indices, it can't find the nodes and fails silently or throws errors.

---

## Design System

### Current Color Palette
```css
/* Primary Blues (Active Stages) */
--blue-600: #3b82f6;      /* Links, active nodes */
--blue-100: #dbeafe;      /* Lead badge background */
--cyan-100: #cffafe;      /* Scheduling Email Sent badge */
--teal-100: #ccfbf1;      /* Call Scheduled badge */
--green-100: #d1fae5;     /* Call Completed badge */
--emerald-100: #d1fae5;   /* Onboarded badge */
--green-200: #bbf7d0;     /* Active badge (darker green) */

/* Warning/Paused */
--yellow-100: #fef3c7;    /* Paused badge background */
--yellow-800: #92400e;    /* Paused badge text */
--yellow-500: #eab308;    /* Paused node in Sankey */

/* Danger/Closed */
--red-500: #ef4444;       /* Closed node, bars */
--gray-200: #e5e7eb;      /* Closed badge background */
--gray-800: #1f2937;      /* Closed badge text */

/* Neutrals */
--gray-50: #f9fafb;       /* Page background */
--gray-600: #4b5563;      /* Secondary buttons */
--gray-700: #374151;      /* Text, labels */
```

### Typography
```css
/* Headings */
h1: text-3xl font-bold (30px, 700 weight)
h2: text-xl font-semibold (20px, 600 weight)

/* Body */
text-sm: 14px
text-xs: 12px

/* Sankey Labels */
Node labels: 11px, font-weight 500, fill #374151
Value labels: 10px, font-weight 600, fill white
```

### Component Patterns

#### Metric Card
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="text-gray-600 text-sm mb-1">{label}</div>
  <div className="text-3xl font-bold text-gray-900">{value}</div>
  {percent && <div className="text-xs text-gray-500 mt-1">{percent}%</div>}
</div>
```

#### Status Badge
```tsx
<span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
  {status}
</span>
```

#### Progress Bar
```tsx
<div className="w-64 bg-gray-200 rounded-full h-2">
  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentage}%` }} />
</div>
```

### Layout Grid
- Max width: `max-w-7xl` (1280px)
- Padding: `p-8` (32px)
- Gap between sections: `mb-8` (32px)
- Card grid: `grid grid-cols-4 gap-4` (4 columns, 16px gap)

---

## Environment Setup

### Prerequisites
- Node.js 20+ (for Next.js 15)
- npm or yarn
- Airtable account with access to base `appfGnLBEP1dDQasz`

### Installation
```bash
# Clone repo
cd ~/metr-productivity-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local  # If .env.example exists, otherwise create manually

# Add Airtable credentials to .env.local
# AIRTABLE_ACCESS_TOKEN=your_personal_access_token_here
# AIRTABLE_BASE_ID=appfGnLBEP1dDQasz
# AIRTABLE_TABLE_NAME=People
```

### Getting Airtable Personal Access Token
1. Go to https://airtable.com/create/tokens
2. Create new token with scopes: `data.records:read`, `data.records:write`
3. Add base `appfGnLBEP1dDQasz` to token access
4. Copy token to `.env.local`

### Running Locally
```bash
npm run dev
# Opens on http://localhost:3000
```

---

## Development Guide

### File Modification Guidelines

#### Adding a New Status
1. **Update `lib/sankeyData.ts`:**
   ```typescript
   const STATUS_ORDER = [
     'New',
     // ... existing statuses ...
     'Your New Status',  // Add here in funnel order
     'Closed'
   ] as const;
   ```

2. **Update status badge colors in `app/table/page.tsx`:**i
   ```typescript
   const colors: Record<string, string> = {
     // ... existing colors ...
     'Your New Status': 'bg-purple-100 text-purple-800',
   };
   ```

3. **Update status descriptions:**
   ```typescript
   const descriptions: Record<string, string> = {
     // ... existing descriptions ...
     'Your New Status': 'Description of what this status means',
   };
   ```

---

#### Modifying Sankey Visual Appearance

**Change Colors:**
```typescript
// In components/SankeyChart.tsx
const colorScale = (category: string) => {
  if (category === 'closed') return '#your-red-color';
  if (category === 'paused') return '#your-yellow-color';
  return '#your-blue-color';  // Active stages
};
```

**Adjust Node Sizing:**
```typescript
.nodeWidth(30)      // Make nodes wider (default: 20)
.nodePadding(40)    // More space between nodes (default: 30)
```

**Change Dimensions:**
```tsx
// In app/page.tsx
<SankeyChart data={sankeyData} width={1400} height={700} />
```

**Adjust Margins (if labels cut off):**
```typescript
// In components/SankeyChart.tsx
const margin = { 
  top: 50,      // More space above
  right: 200,   // More space for right labels
  bottom: 30,   
  left: 120     // More space for left labels
};
```

---

#### Adding a New Metric Card
```tsx
// In app/page.tsx, after existing MetricCard components
<MetricCard 
  label="Your New Metric" 
  value={calculatedValue} 
  percent={percentageIfApplicable} 
/>
```

---

#### Modifying Auto-Refresh Interval
```typescript
// In app/page.tsx, change 30000ms (30s) to your desired interval
const interval = setInterval(load, 60000); // 60 seconds
```

---

### Testing API Endpoints

```bash
# Test people endpoint
curl http://localhost:3000/api/people

# Test funnel events endpoint
curl http://localhost:3000/api/funnel-events

# Update a person's status
curl -X PATCH http://localhost:3000/api/people/rec123abc \
  -H "Content-Type: application/json" \
  -d '{"Status":"Call Scheduled"}'
```

---

### Common Debugging Steps

#### Sankey Not Rendering
1. **Check browser console for errors**
2. **Verify data is loading:**
   ```typescript
   console.log('People:', people);
   console.log('Sankey data:', sankeyData);
   ```
3. **Check if links array is empty:**
   ```typescript
   console.log('Links count:', sankeyData?.links.length);
   ```
4. **Verify STATUS_ORDER matches Airtable exactly** (case-sensitive!)

#### Status Badges Not Showing Colors
1. Check if status name exists in `colors` object
2. Verify exact spelling (spaces, capitalization)
3. Check Tailwind classes are valid (not purged)

#### Auto-Refresh Not Working
1. Check `useEffect` cleanup function runs on unmount
2. Verify interval is set correctly
3. Check for errors in fetch calls (network tab)

---

### Performance Considerations

**Current Data Scale:**
- 124 people
- 218 funnel events
- 9 status nodes
- ~8 unique transitions

**Scaling Concerns (if data grows 10x):**
1. **API Response Size:** Consider pagination if > 1000 records
2. **Sankey Rendering:** D3 handles up to ~100 nodes well, current setup is fine
3. **Auto-Refresh:** Consider debouncing or only refreshing on visibility change
4. **Client-Side Filtering:** Current approach works up to ~5000 records

**Optimization Opportunities:**
- Server-side rendering for initial load (convert to Server Component + client island for interactivity)
- React.memo() on SankeyChart if parent re-renders frequently
- Virtual scrolling in table if rows exceed 500

---

## Build & Deployment

### Production Build
```bash
npm run build
npm start  # Serves production build on port 3000
```

### Environment Variables for Production
Ensure these are set in your deployment platform:
```bash
AIRTABLE_ACCESS_TOKEN=***
AIRTABLE_BASE_ID=appfGnLBEP1dDQasz
AIRTABLE_TABLE_NAME=People
```

### Deployment Platforms
Works on any Next.js-compatible platform:
- **Vercel** (recommended, zero-config)
- **Netlify**
- **Railway**
- **Fly.io**
- **AWS Amplify**

---

## Known Limitations & Future Enhancements

### Current Limitations
1. **No historical trend data** - Shows current snapshot only
2. **No date filtering** - Cannot view funnel for specific time periods
3. **No user authentication** - Dashboard is publicly accessible if deployed
4. **No edit capabilities** - Read-only dashboard (update endpoints exist but not exposed in UI)

### Suggested Enhancements (Design Opportunities)

#### **Visual/UX Improvements**
1. **Animated transitions** when data updates (Framer Motion, React Spring)
2. **Dark mode toggle** (already using Tailwind, easy to add)
3. **Responsive design** for mobile/tablet (Sankey currently desktop-only)
4. **Loading skeletons** instead of "Loading..." text
5. **Error states** with retry buttons
6. **Export to PDF/PNG** functionality for Sankey diagram

#### **Feature Additions**
1. **Date range picker** to filter funnel events by time period
2. **Comparison view** (This month vs last month)
3. **Conversion rate calculations** between each stage
4. **Time-to-conversion metrics** (avg days from New → Active)
5. **Drill-down modals** clicking a Sankey link shows those specific people
6. **Email notifications** when someone reaches Active status
7. **Admin panel** to manually update statuses without Airtable access

#### **Performance Enhancements**
1. **Server-side caching** of Airtable data (Redis, Next.js cache)
2. **Incremental Static Regeneration** for dashboard page
3. **Webhook listener** to invalidate cache when Airtable updates

---

## Dependencies Deep Dive

### Production Dependencies

#### `airtable` (v0.12.2)
- Official Airtable JavaScript client
- Handles authentication, pagination, rate limiting
- **Why:** Direct, type-safe API access to Airtable base

#### `d3` (v7)
- Industry-standard data visualization library
- Modular (we only use d3-selection, d3-shape, d3-scale)
- **Why:** Powerful, flexible, customizable visualizations

#### `d3-sankey` (v0.12.3)
- D3 plugin specifically for Sankey diagrams
- Calculates node positions, link paths, flow optimization
- **Why:** Specialized library for funnel visualization (vs building from scratch)

#### `next` (v15.5.4)
- React framework with file-based routing, API routes, optimizations
- **Why:** Best-in-class DX, performance, deployment story

#### `react` & `react-dom` (v19.1.0)
- UI library
- **Why:** Industry standard, huge ecosystem

### Dev Dependencies

#### `@types/d3` & `@types/d3-sankey`
- TypeScript type definitions for D3 libraries
- **Why:** Type safety, autocomplete, error catching

#### `tailwindcss` (v4)
- Utility-first CSS framework
- **Why:** Rapid UI development, consistent design system

#### `typescript` (v5)
- Typed superset of JavaScript
- **Why:** Catch errors at compile time, better DX

---

## Troubleshooting Guide

### "Module not found: Can't resolve '@/lib/sankeyData'"
**Cause:** TypeScript path alias not resolving  
**Fix:** Check `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "Error: getaddrinfo ENOTFOUND api.airtable.com"
**Cause:** Network/firewall blocking Airtable API  
**Fix:** Check internet connection, corporate firewall, VPN settings

### "401 Unauthorized" from Airtable
**Cause:** Invalid or expired access token  
**Fix:** 
1. Regenerate token at https://airtable.com/create/tokens
2. Ensure token has `data.records:read` scope
3. Verify base ID is added to token access list

### Sankey Shows Empty/Blank Area
**Cause:** No valid links (all filtered out)  
**Debug:**
```typescript
// Add to transformEventsToSankey() temporarily:
console.log('Events:', events.length);
console.log('Links generated:', links.length);
console.log('First link:', links[0]);
```
**Fix:** Verify STATUS_ORDER matches Airtable status values exactly

---

## File-by-File Breakdown

### `app/page.tsx` (182 lines)
- **Purpose:** Main dashboard
- **Client Component:** Yes (`'use client'`)
- **Key Hooks:** `useState`, `useEffect`
- **Dependencies:** `SankeyChart`, `transformEventsToSankey`
- **Performance:** Auto-refresh every 30s, cleanup on unmount

### `app/table/page.tsx` (151 lines)
- **Purpose:** Full data table
- **Client Component:** Yes
- **Key Features:** Search, filter, status badges
- **Note:** Could be converted to Server Component with search params

### `components/SankeyChart.tsx` (143 lines)
- **Purpose:** D3 Sankey visualization
- **Client Component:** Yes (uses `useRef`, `useEffect` for D3 DOM manipulation)
- **Key Logic:** SVG creation, node positioning, link drawing, tooltips
- **Re-render Trigger:** `data`, `width`, or `height` prop changes

### `lib/sankeyData.ts` (87 lines)
- **Purpose:** Transform funnel events → Sankey format
- **Pure Function:** No side effects, easy to test
- **Critical:** STATUS_ORDER array must match Airtable exactly

### `lib/airtable.ts` (36 lines)
- **Purpose:** Airtable client initialization, data fetchers
- **Server-only:** Uses `process.env`, should never run in browser
- **Security:** Access token never exposed to client

### `app/api/people/route.ts` (11 lines)
- **Purpose:** GET endpoint for all applicants
- **Error Handling:** Returns 500 with error message on failure
- **Caching:** None (always fresh data)

### `app/api/funnel-events/route.ts` (11 lines)
- **Purpose:** GET endpoint for all transitions
- **Sorting:** By `Changed At` field (ascending)
- **Performance:** 218 records loads in <100ms typically

---

## Design Handoff Notes

### What's Implemented (Don't Need to Redesign)
- ✅ Data fetching & state management
- ✅ API routes & Airtable integration
- ✅ Sankey diagram logic & D3 implementation
- ✅ Search & filter functionality
- ✅ Auto-refresh mechanism
- ✅ Status badge color mapping

### What Needs Design Work
1. **Visual Polish:**
   - Typography hierarchy
   - Spacing/whitespace optimization
   - Shadow/elevation system
   - Border radius consistency
   - Hover states on interactive elements

2. **Responsive Design:**
   - Mobile layout for dashboard
   - Tablet optimization
   - Sankey behavior on small screens (horizontal scroll? Vertical layout?)

3. **Micro-interactions:**
   - Loading states (skeletons, spinners)
   - Transitions between states
   - Button hover/active states
   - Toast notifications for errors

4. **Accessibility:**
   - Keyboard navigation
   - ARIA labels for Sankey nodes/links
   - Focus indicators
   - Color contrast checks (WCAG AA)

5. **Dark Mode:**
   - Color palette for dark theme
   - Toggle component
   - Persistence in localStorage

### Design System Recommendations
- Consider using **shadcn/ui** components (headless, accessible, Tailwind-based)
- Or **Radix UI** for primitives + custom styling
- Use **Framer Motion** for animations
- Add **Lucide Icons** for consistent icon set

---

## Contact & Support

**Frontend Engineer Starting Point:**
1. Read this doc fully
2. Run `npm install && npm run dev`
3. Open http://localhost:3000
4. Check browser console for any errors
5. Explore `/app/page.tsx` to understand data flow
6. Review `components/SankeyChart.tsx` for visualization logic
7. Start with visual polish, then responsive design, then new features

**Questions? Check:**
- This documentation
- Inline code comments
- TypeScript types (hover in VS Code)
- Next.js 15 docs: https://nextjs.org/docs
- D3 Sankey examples: https://observablehq.com/@d3/sankey

---

## Changelog

**Version 1.0 - Current State (Oct 2025)**
- ✅ MVP Dashboard with Sankey diagram
- ✅ Table view with search/filter
- ✅ Auto-refresh every 30s
- ✅ All 218 funnel events visualized
- ✅ Status tooltips and descriptions
- ✅ Percentage displays on metrics
- ✅ Responsive Sankey container

**Known Issues:**
- None blocking. App is stable and production-ready for design work.

---

*Last Updated: October 3, 2025*  
*Author: AI Assistant*  
*Status: Ready for Design Enhancements*

