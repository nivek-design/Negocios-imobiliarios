import { lazy, Suspense, ErrorBoundary, useState, useEffect } from 'react';
import { ComponentLoader, LazyComponentError } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Calendar, FileText } from 'lucide-react';

// Lazy load dashboard sections to reduce initial bundle
const PropertyMetrics = lazy(() => import('@/components/property-metrics').catch(() => ({
  default: () => <div>Metrics component not found</div>
})));

const AppointmentCalendar = lazy(() => import('@/components/appointment-calendar'));

const RecentInquiries = lazy(() => import('@/components/recent-inquiries').catch(() => ({
  default: () => <div>Inquiries component not found</div>
})));

interface DashboardSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isVisible: boolean;
  onToggle: () => void;
  fallbackHeight?: string;
}

/**
 * Collapsible dashboard section with lazy loading
 */
function DashboardSection({ 
  title, 
  icon, 
  children, 
  isVisible, 
  onToggle, 
  fallbackHeight = 'h-64' 
}: DashboardSectionProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            data-testid={`toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {isVisible ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>
      </CardHeader>
      {isVisible && (
        <CardContent>
          <ErrorBoundary
            fallback={
              <LazyComponentError 
                error={new Error(`Erro ao carregar ${title}`)} 
                resetError={onToggle} 
              />
            }
          >
            <Suspense fallback={<ComponentLoader height={fallbackHeight} />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Lazy-loaded dashboard metrics section
 */
export function LazyPropertyMetrics() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <DashboardSection
      title="Métricas de Propriedades"
      icon={<BarChart3 className="w-5 h-5" />}
      isVisible={isVisible}
      onToggle={() => setIsVisible(!isVisible)}
      fallbackHeight="h-48"
    >
      <PropertyMetrics />
    </DashboardSection>
  );
}

/**
 * Lazy-loaded calendar section
 */
export function LazyCalendarSection() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <DashboardSection
      title="Calendário de Agendamentos"
      icon={<Calendar className="w-5 h-5" />}
      isVisible={isVisible}
      onToggle={() => setIsVisible(!isVisible)}
      fallbackHeight="h-96"
    >
      <AppointmentCalendar />
    </DashboardSection>
  );
}

/**
 * Lazy-loaded inquiries section
 */
export function LazyInquiriesSection() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <DashboardSection
      title="Consultas Recentes"
      icon={<FileText className="w-5 h-5" />}
      isVisible={isVisible}
      onToggle={() => setIsVisible(!isVisible)}
      fallbackHeight="h-64"
    >
      <RecentInquiries />
    </DashboardSection>
  );
}

/**
 * Smart dashboard that only loads sections when needed
 */
export function LazyDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'calendar' | 'inquiries'>('overview');

  return (
    <div className="space-y-6">
      {/* Dashboard navigation */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          onClick={() => setActiveTab('overview')}
          data-testid="tab-overview"
        >
          Visão Geral
        </Button>
        <Button 
          variant={activeTab === 'properties' ? 'default' : 'outline'}
          onClick={() => setActiveTab('properties')}
          data-testid="tab-properties"
        >
          Propriedades
        </Button>
        <Button 
          variant={activeTab === 'calendar' ? 'default' : 'outline'}
          onClick={() => setActiveTab('calendar')}
          data-testid="tab-calendar"
        >
          Calendário
        </Button>
        <Button 
          variant={activeTab === 'inquiries' ? 'default' : 'outline'}
          onClick={() => setActiveTab('inquiries')}
          data-testid="tab-inquiries"
        >
          Consultas
        </Button>
      </div>

      {/* Dashboard content */}
      <div className="grid gap-6">
        {activeTab === 'overview' && (
          <div className="grid gap-4">
            <LazyPropertyMetrics />
          </div>
        )}
        
        {activeTab === 'properties' && (
          <LazyPropertyMetrics />
        )}
        
        {activeTab === 'calendar' && (
          <LazyCalendarSection />
        )}
        
        {activeTab === 'inquiries' && (
          <LazyInquiriesSection />
        )}
      </div>
    </div>
  );
}