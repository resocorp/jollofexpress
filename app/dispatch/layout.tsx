// Chrome-free layout for the big-screen Dispatch Board. Lives outside
// `/admin/*` so it does not inherit the admin sidebar/header. Auth is enforced
// inside the page itself, matching the client-side Supabase pattern used by
// app/admin/layout.tsx.

export default function DispatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {children}
    </div>
  );
}
