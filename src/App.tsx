import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import EventEditor from "./pages/EventEditor";
import EventHome from "./pages/EventHome";
import EventProgram from "./pages/EventProgram";
import EventParticipants from "./pages/EventParticipants";
import EventExhibitors from "./pages/EventExhibitors";
import EventMap from "./pages/EventMap";
import EventInfo from "./pages/EventInfo";
import EventSponsors from "./pages/EventSponsors";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/events/:id" element={<EventEditor />} />
            <Route path="/events/:slug" element={<EventHome />} />
            <Route path="/events/:slug/program" element={<EventProgram />} />
            <Route path="/events/:slug/participants" element={<EventParticipants />} />
            <Route path="/events/:slug/exhibitors" element={<EventExhibitors />} />
            <Route path="/events/:slug/map" element={<EventMap />} />
            <Route path="/events/:slug/info" element={<EventInfo />} />
            <Route path="/events/:slug/leverandorer" element={<EventSponsors />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
