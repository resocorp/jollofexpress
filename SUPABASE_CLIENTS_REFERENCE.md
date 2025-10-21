# 🔑 Supabase Clients Reference

## Overview: 3 Different Clients

Your project has **3 different Supabase clients** for different use cases:

---

## 1️⃣ **Browser Client** (`lib/supabase/client.ts`)

### When to Use:
- ✅ Client-side React components
- ✅ Browser-only operations
- ✅ Public data access with RLS

### API Key Used:
```typescript
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  // New (recommended)
NEXT_PUBLIC_SUPABASE_ANON_KEY         // Legacy (fallback)
```

### Example Usage:
```typescript
import { createClient } from '@/lib/supabase/client';

export function MenuComponent() {
  const supabase = createClient();
  // Fetch menu items, user session, etc.
}
```

### Security:
- 🔓 **Public key** - Safe to expose in browser
- 🔒 **RLS enforced** - Row Level Security applies
- 👤 **User context** - Respects auth state

---

## 2️⃣ **Server Client** (`lib/supabase/server.ts`)

### When to Use:
- ✅ Server Components
- ✅ API routes that need user context
- ✅ Operations respecting RLS
- ✅ SSR operations

### API Key Used:
```typescript
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  // New (recommended)
NEXT_PUBLIC_SUPABASE_ANON_KEY         // Legacy (fallback)
```

### Example Usage:
```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  // Fetch data with user's RLS context
}
```

### Security:
- 🔓 **Public key** - Same as browser client
- 🔒 **RLS enforced** - Row Level Security applies
- 👤 **User context** - Has access to cookies/sessions
- 🍪 **Cookie handling** - Manages auth cookies

---

## 3️⃣ **Service Client** (`lib/supabase/service.ts`)

### When to Use:
- ✅ Admin operations
- ✅ Bypassing RLS (trusted operations)
- ✅ Order creation
- ✅ System-level tasks
- ✅ Bulk operations

### API Key Used:
```typescript
SUPABASE_SECRET_KEY              // New (recommended)
SUPABASE_SERVICE_ROLE_KEY        // Legacy (fallback)
```

### Example Usage:
```typescript
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  // Create order without RLS restrictions
}
```

### Security:
- 🔐 **Secret key** - NEVER expose to browser
- 🚫 **RLS bypassed** - Full database access
- 🤖 **No user context** - System-level operations
- ⚠️ **High privilege** - Use with caution

---

## 🎯 Quick Decision Tree

```
Need to access data?
│
├─ From browser/client component?
│  └─ Use: Browser Client (lib/supabase/client.ts)
│
├─ From server with user context?
│  └─ Use: Server Client (lib/supabase/server.ts)
│
└─ Admin/system operation (bypass RLS)?
   └─ Use: Service Client (lib/supabase/service.ts)
```

---

## 📊 Comparison Table

| Feature | Browser Client | Server Client | Service Client |
|---------|---------------|---------------|----------------|
| **File** | `client.ts` | `server.ts` | `service.ts` |
| **Location** | Client-side | Server-side | Server-side |
| **API Key** | Publishable/Anon | Publishable/Anon | Secret/Service Role |
| **RLS** | ✅ Enforced | ✅ Enforced | ❌ Bypassed |
| **User Context** | ✅ Yes | ✅ Yes | ❌ No |
| **Cookies** | ✅ Yes | ✅ Yes | ❌ No |
| **Exposure** | 🔓 Public | 🔓 Public | 🔐 Secret |
| **Use Case** | UI components | Server components | Admin/System |

---

## ⚠️ Common Mistakes

### ❌ DON'T:
```typescript
// DON'T use service client in browser
import { createServiceClient } from '@/lib/supabase/service'; // ❌

export function Component() {
  const supabase = createServiceClient(); // ❌ NEVER!
}
```

### ✅ DO:
```typescript
// DO use browser client in components
import { createClient } from '@/lib/supabase/client'; // ✅

export function Component() {
  const supabase = createClient(); // ✅ Correct!
}
```

---

### ❌ DON'T:
```typescript
// DON'T use browser/server client for admin operations
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  // This will fail due to RLS! ❌
  await supabase.from('orders').insert(...);
}
```

### ✅ DO:
```typescript
// DO use service client for admin operations
import { createServiceClient } from '@/lib/supabase/service';

export async function POST() {
  const supabase = createServiceClient();
  // This bypasses RLS ✅
  await supabase.from('orders').insert(...);
}
```

---

## 🔄 Migration Status

All three clients now support both **new** and **legacy** API keys:

### ✅ Client Updated:
```typescript
// lib/supabase/client.ts
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### ✅ Server Updated:
```typescript
// lib/supabase/server.ts
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### ✅ Service Updated:
```typescript
// lib/supabase/service.ts
SUPABASE_SECRET_KEY || SUPABASE_SERVICE_ROLE_KEY
```

---

## 📝 Environment Variables Needed

### For All Clients:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### For Browser + Server Clients:
```bash
# NEW (Recommended)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# OR Legacy (Fallback)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

### For Service Client:
```bash
# NEW (Recommended)
SUPABASE_SECRET_KEY=sb_secret_...

# OR Legacy (Fallback)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
```

---

## 🎯 Where Each Client is Used

### Browser Client (`client.ts`):
- ✅ Menu components
- ✅ Cart components
- ✅ User profile
- ✅ Client-side data fetching

### Server Client (`server.ts`):
- ✅ `/api/menu` - Menu API (public data)
- ✅ `/api/restaurant/status` - Status API
- ✅ `/api/delivery/cities` - Cities API
- ✅ Server Components

### Service Client (`service.ts`):
- ✅ `/api/orders` - Order creation
- ✅ `/api/orders/[id]` - Order details
- ✅ `/api/admin/*` - All admin endpoints
- ✅ `/api/kitchen/*` - All kitchen endpoints

---

## ✨ Summary

**3 clients, 3 use cases:**

1. **Browser** → Public UI components
2. **Server** → Server-side with user context
3. **Service** → Admin/system operations

**All support both old and new API keys!** 🚀
