import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Building2, Map, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  eventSlug: string;
  modules: {
    program: boolean;
    participants: boolean;
    exhibitors: boolean;
    map: boolean;
    info: boolean;
  };
}

export function BottomNav({ eventSlug, modules }: BottomNavProps) {
  const location = useLocation();
  
  const items = [
    { name: 'Program', path: `/events/${eventSlug}/program`, icon: Calendar, enabled: modules.program },
    { name: 'Deltakere', path: `/events/${eventSlug}/participants`, icon: Users, enabled: modules.participants },
    { name: 'Utstillere', path: `/events/${eventSlug}/exhibitors`, icon: Building2, enabled: modules.exhibitors },
    { name: 'Kart', path: `/events/${eventSlug}/map`, icon: Map, enabled: modules.map },
    { name: 'Info', path: `/events/${eventSlug}/info`, icon: Info, enabled: modules.info },
  ].filter(item => item.enabled);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-7xl mx-auto px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
