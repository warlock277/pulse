import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import Overview from "@/routes/Overview";
import Sites from "@/routes/Sites";
import Incidents from "@/routes/Incidents";
import Settings from "@/routes/Settings";
import NotFound from "@/routes/NotFound";

// Lazy-load the chart-heavy detail page + the standalone status page so the
// recharts bundle is only fetched when actually needed.
const SiteDetail = lazy(() => import("@/routes/SiteDetail"));
const Status = lazy(() => import("@/routes/Status"));

function RouteFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public status page — standalone minimal layout, no sidebar. */}
            <Route path="/status" element={<Status />} />

            {/* Admin app shell. */}
            <Route element={<AppLayout />}>
              <Route index element={<Overview />} />
              <Route path="sites" element={<Sites />} />
              <Route path="sites/:id" element={<SiteDetail />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
