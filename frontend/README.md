# MediaShare — Frontend Documentation

> **Stack:** React 18 · TypeScript · Tailwind CSS · Vite · Zustand · Axios
> **Status:** Phase 5 ✅ — All pages built and functional

---

## Table of Contents

- [Project Structure](#project-structure)
- [Setup](#setup)
- [Design System](#design-system)
- [Architecture Decisions](#architecture-decisions)
- [Pages](#pages)
- [Components](#components)
- [State Management](#state-management)
- [API Layer](#api-layer)
- [Real-Time Notifications](#real-time-notifications)
- [File Upload Flow](#file-upload-flow)
- [Auth and Token Management](#auth-and-token-management)
- [Key Concepts](#key-concepts)

---

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx         # Login form with auth flow
│   │   ├── RegisterPage.tsx      # Register with live password validation
│   │   ├── InboxPage.tsx         # Received shares + cluster modal
│   │   ├── SentPage.tsx          # Sent shares history
│   │   ├── UploadPage.tsx        # Drag/drop upload with progress
│   │   ├── SearchPage.tsx        # User search + send modal + block
│   │   └── ProfilePage.tsx       # Profile edit + storage + blocked users
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx        # Sidebar, navbar, notification bell
│   │   │   └── ProtectedRoute.tsx # Auth guard for protected pages
│   │   └── ui/
│   │       ├── Button.tsx        # Reusable button (primary/ghost/danger)
│   │       └── Input.tsx         # Reusable input with label + error
│   │
│   ├── api/
│   │   ├── client.ts             # Axios instance + token refresh interceptor
│   │   ├── auth.ts               # Auth API calls
│   │   ├── media.ts              # Upload/confirm/list API calls
│   │   ├── shares.ts             # Share/inbox/sent API calls
│   │   └── users.ts              # Profile/search/block API calls
│   │
│   ├── store/
│   │   ├── authStore.ts          # Zustand: user + access token
│   │   └── notificationStore.ts  # Zustand: unread count
│   │
│   ├── hooks/
│   │   └── useNotifications.ts   # SSE connection hook
│   │
│   ├── types/
│   │   ├── auth.ts               # User, TokenResponse interfaces
│   │   ├── media.ts              # MediaFile, InitiateUploadResponse
│   │   ├── shares.ts             # InboxItem, ClusterDetail, SentItem
│   │   └── profile.ts            # Profile, PublicProfile, SearchResult
│   │
│   ├── App.tsx                   # Router setup + auth load on mount
│   ├── main.tsx                  # React entry point
│   └── index.css                 # CSS variables + Tailwind import
│
├── vite.config.ts                # Vite config + API proxy
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Setup

```bash
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

The Vite dev server proxies all `/api/*` requests to `http://localhost:8000`,
so no CORS issues during development.

```typescript
// vite.config.ts
server: {
    proxy: {
        '/api': {
            target: 'http://localhost:8000',
            changeOrigin: true,
        }
    }
}
```

---

## Design System

### Color Palette

```css
--bg:          #0A0A0F   /* near-black with blue undertone — page background */
--surface:     #13131A   /* cards, sidebar, modals */
--border:      #252535   /* all borders */
--text:        #E8E8F0   /* primary text */
--muted:       #6B6B8A   /* secondary text, placeholders, icons */
--accent:      #6C63FF   /* electric violet — primary action color */
--accent-dim:  #2D2B5E   /* accent at low opacity — hover states, badges */
```

### Accent Color Philosophy

The electric violet (`#6C63FF`) appears **only** on:
- Active sidebar navigation item
- Primary action buttons
- Unread notification badge
- Upload progress bar
- File selection checkboxes
- Focus states on inputs

Everything else is dark and muted. Scarcity makes the accent earn attention.

### Typography

- Font: **Inter** (loaded from Google Fonts)
- `-webkit-font-smoothing: antialiased` for crisp rendering on Mac
- No custom font sizes beyond what Tailwind provides

### Spacing Principle

All components use inline styles with consistent values:
- Card padding: `24px` or `28px`
- Gap between elements: `8px`, `12px`, `16px`
- Border radius: `8px` (buttons, small cards), `12px` (search results), `16px` (main cards)

---

## Architecture Decisions

### Why No Component Library

We use Tailwind CSS utility classes and inline styles directly — no shadcn/ui,
Chakra, or MUI. This gives full control over every visual detail and avoids
fighting against opinionated defaults.

### Why Zustand Over Redux

Redux requires actions, reducers, dispatch, and selectors — significant boilerplate.
Zustand is a store in ~15 lines with hooks-based access. Right tool for this scale.

### Why Inline Styles Alongside Tailwind

Some dynamic styles (hover states with JS, conditional colors) are easier with
inline styles than Tailwind's conditional class approach. We use both:
- Tailwind for static layout and spacing
- Inline styles for dynamic values and CSS variables

### Why Blob Download Instead of `<a download>`

Browsers ignore the `download` attribute on cross-origin URLs (like LocalStack
presigned URLs). We fetch the file as a blob first, create a same-origin
blob URL, then trigger download:

```typescript
const response = await fetch(url)
const blob = await response.blob()
const objectUrl = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = objectUrl
link.download = filename
link.click()
URL.revokeObjectURL(objectUrl)
```

---

## Pages

### LoginPage (`/login`)

Dark full-screen layout with radial gradient. Email + password form.
On success: stores token + user in Zustand, redirects to `/inbox`.

### RegisterPage (`/register`)

Same layout as Login. Live password validation with strength bar:

```
Rules (checked in real-time):
  ○ → ✓  At least 8 characters
  ○ → ✓  At least one uppercase letter
  ○ → ✓  At least one lowercase letter
  ○ → ✓  At least one number
  ○ → ✓  At least one special character

Strength bar: weak (red) → fair (amber) → strong (green)
Submit button disabled until all rules pass.
```

### InboxPage (`/inbox`)

Lists received share clusters. Each card shows:
- Sender avatar (initials)
- Unread dot (violet) / read (no dot)
- Sender username + share type badge
- File count + total size + optional message
- Timestamp
- `✕` delete button (soft delete from inbox)

Clicking a card opens a **ClusterModal** showing all files with:
- Thumbnail (if image) or file type icon
- Original filename + size
- Download button (triggers blob download to device)

### SentPage (`/sent`)

Lists sent share clusters. Each card shows file count, size, recipient count, timestamp.

### UploadPage (`/upload`)

Drag-and-drop dropzone with:
- Drag visual feedback (border + background change)
- Click to browse files
- Per-file validation before upload starts:
  - MIME type check
  - Size limit check
  - **Video duration check** (browser reads metadata, rejects > 5 min instantly)
- Progress bar per file (XHR to presigned S3 URL)
- Status: `validating → uploading → processing → ready / error`
- Polls `GET /media/{id}` every 2 seconds until `processing_status = ready`
- "X files ready to share" banner with "Share now →" button

### SearchPage (`/search`)

Debounced search (400ms delay after typing stops).

Results show:
- User avatar + username + display name
- **"Send files"** button → opens SendModal
- **🚫 block button** → blocks user, removes from results

Blocked users **still appear** in search (so you can unblock them):
- Grayed out with red "Blocked" badge
- "Unblock" button instead of "Send files"
- Clicking blocked card does nothing

**SendModal:**
- Shows list of your ready files with checkboxes
- Optional message input
- "X of 20 selected" counter
- "Send files →" button
- Block option in modal header
- Success state with green checkmark

### ProfilePage (`/profile`)

Three sections:

**Profile card:**
- Avatar (initials in violet circle)
- Username + email + role badge
- Display name + bio (read view)
- "Edit profile" → inline edit mode with save/cancel

**Storage card:**
- Used / quota display
- Progress bar (violet → amber → red as usage increases)

**Blocked users card:**
- List of all users you've blocked
- Each row has an "Unblock" button
- Shows "You haven't blocked anyone" when empty

---

## Components

### `Button`

```tsx
<Button variant="primary" size="md" loading={false} fullWidth={false}>
    Label
</Button>
```

Variants: `primary` (violet), `ghost` (outline), `danger` (red outline)
Sizes: `sm`, `md`, `lg`
Shows spinner when `loading={true}`, disables when `disabled={true}`.

### `Input`

```tsx
<Input
    label="Email"
    type="email"
    placeholder="you@example.com"
    error="Invalid email"
    value={value}
    onChange={handler}
/>
```

Forwards ref for programmatic focus. Shows red border + error message when
`error` prop is set.

### `Layout`

Sidebar navigation with:
- MediaShare logo
- Notification bell with unread badge + dropdown
- Nav items (Inbox, Sent, Upload, Search, Profile) with active state
- User avatar (initials) + username + email
- Sign out button

### `ProtectedRoute`

```tsx
// Checks isAuthenticated from Zustand
// If false → redirects to /login (replace, not push)
// If true → renders <Outlet /> (child routes)
```

---

## State Management

### `authStore`

```typescript
{
    user: User | null
    accessToken: string | null
    isAuthenticated: boolean

    setAuth(user, token)   // called on login/register
    clearAuth()            // called on logout
    setToken(token)        // called on token refresh
}
```

Access token persisted in `localStorage`. User object is in memory only
(fetched from `/auth/me` on app load if token exists).

### `notificationStore`

```typescript
{
    unreadCount: number
    increment()     // called by SSE hook on new notification
    reset()         // called on "mark all read"
    setCount(n)     // called on app load from /notifications/unread-count
}
```

---

## API Layer

### `src/api/client.ts`

Axios instance with two interceptors:

**Request interceptor** — Attaches Bearer token to every request:
```typescript
config.headers.Authorization = `Bearer ${localStorage.getItem('access_token')}`
```

**Response interceptor** — Handles 401 with token refresh:
```
Request returns 401
        ↓
Check if already retrying (prevents infinite loop)
        ↓
POST /auth/refresh (uses httpOnly cookie automatically)
        ↓
Store new access token
        ↓
Retry original request with new token
        ↓
If refresh also fails → clear auth → redirect to /login
```

The `failedQueue` pattern holds other concurrent requests while one
refresh is in progress, then replays them all with the new token.

---

## Real-Time Notifications

### `src/hooks/useNotifications.ts`

Opens an `EventSource` connection to `/api/v1/notifications/stream?token=<jwt>`.

```typescript
const evtSource = new EventSource(`/api/v1/notifications/stream?token=${token}`)

evtSource.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === 'share_received') {
        increment()  // bumps unread badge count
    }
}
```

`EventSource` reconnects automatically on disconnect. The hook runs
in `Layout.tsx` so the connection is alive for all authenticated pages.

### Notification Bell Dropdown

Click bell → loads recent notifications from `/notifications/` → shows dropdown.

Each notification:
- Unread: violet dot + highlighted background
- Click → navigate to `/inbox` + close dropdown

"Mark all read" → calls `PATCH /notifications/read-all` → resets badge to 0.

---

## File Upload Flow

```
1. User drops file on dropzone (or clicks "browse files")

2. Client-side validation (instant, no server call):
   - MIME type allowed?
   - Size within limit?
   - If video: read duration from browser metadata
     → duration > 5 min? → reject immediately with error message

3. POST /media/initiate
   → returns { upload_id, presigned_url, s3_key }

4. XHR PUT to presigned_url
   - Tracks progress via xhr.upload.onprogress
   - Updates progress bar in UI

5. POST /media/confirm
   → writes MediaFile to DB
   → Celery task queued

6. Poll GET /media/{id} every 2 seconds
   → processing_status: "pending" → "ready" (or "rejected")
   → Update UI when ready
```

---

## Auth and Token Management

### On App Load (`App.tsx`)

```typescript
useEffect(() => {
    if (!isAuthenticated) return
    authApi.me()
        .then(res => setAuth(res.data, token))
        .catch(() => clearAuth())  // invalid token → logout
}, [])
```

Ensures `user` object is always populated after page refresh.

### Token Storage

```
Access token: localStorage (accessible to JS, short-lived 15 min)
Refresh token: httpOnly cookie (JS cannot read, sent automatically)
```

The access token being in localStorage is acceptable because it has a
15-minute TTL. The refresh token being in httpOnly cookie means XSS cannot
steal it.

### On Every API Call

Axios request interceptor reads the access token from localStorage and
adds `Authorization: Bearer <token>` header automatically.

### On Token Expiry

Response interceptor catches 401, calls `/auth/refresh` (refresh token cookie
sent automatically), gets new access token, retries the original request.
User never sees an interruption.

---

## Key Concepts

### Why `useEffect` with Empty Dependency Array

```typescript
useEffect(() => {
    // runs once after first render
    fetchData()
}, [])  // ← empty array = run on mount only
```

With a dependency array, `useEffect` re-runs when those values change.
Empty array = run once on component mount. No array = run after every render.

### Why `e.stopPropagation()` on Delete/Block Buttons

```typescript
const handleDelete = async (e: React.MouseEvent, item: InboxItem) => {
    e.stopPropagation()  // prevents the card's onClick from firing
    ...
}
```

Without this, clicking the delete button also triggers the card's
`onClick` handler (open cluster modal), so both fire simultaneously.

### Why Debounced Search

```typescript
useEffect(() => {
    const timer = setTimeout(() => {
        // API call
    }, 400)
    return () => clearTimeout(timer)  // cancel if user types again
}, [query])
```

Without debouncing, typing "pratham" fires 7 API calls. With 400ms debounce,
only 1 call fires (400ms after the last keystroke).

### Why Optimistic Updates

```typescript
// Mark as read optimistically — update UI immediately
setItems(prev => prev.map(i =>
    i.cluster_id === item.cluster_id ? { ...i, is_read: true } : i
))
// Then call API in background
sharesApi.markRead(item.share_recipient_id).catch(console.error)
```

Optimistic updates make the UI feel instant. If the API call fails,
in most cases it's harmless (the read state just reverts on next load).