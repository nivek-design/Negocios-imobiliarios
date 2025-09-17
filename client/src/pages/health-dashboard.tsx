/**
 * HEALTH MONITORING DASHBOARD
 * Real-time system health, metrics, and alert management interface for administrators
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  HardDrive,
  MemoryStick,
  Network,
  Server,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  Eye,
  Settings,
  RefreshCw,
  AlertCircle,
  Info,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';

// Health and metrics interfaces
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  responseTime: number;
  environment: string;
  version: string;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  checks: Record<string, HealthCheck>;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
}

interface SystemMetrics {
  timestamp: string;
  responseTime: number;
  system: {
    status: string;
    uptime: number;
    healthy: boolean;
    issues: string[];
  };
  performance: {
    http: {
      totalRequests: number;
      activeConnections: number;
      endpoints: Array<{
        endpoint: string;
        count: number;
        averageDuration: number;
        errorRate: number;
        p95: number;
      }>;
      topSlowEndpoints: Array<{
        endpoint: string;
        averageDuration: number;
        count: number;
      }>;
    };
    database: {
      queryCount: number;
      averageDuration: number;
      slowQueryCount: number;
      errorCount: number;
      poolUtilization: number;
    };
    cache: {
      hitRate: number;
      totalOperations: number;
      operationsPerSecond: number;
      errorCount: number;
    };
  };
  resources: {
    memory: {
      used: number;
      total: number;
      percentage: number;
      heap: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    cpu: {
      percentage: number;
      user: number;
      system: number;
    };
    gc: {
      collections: number;
      averageDuration: number;
      lastCollection: string;
    };
    eventLoopDelay: number;
    uptimeSeconds: number;
  };
}

interface ActiveAlert {
  id: string;
  metric: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  currentValue: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export default function HealthDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    alerts: true,
    dependencies: true,
  });
  
  const queryClient = useQueryClient();
  
  // Health status query
  const { data: healthData, isLoading: healthLoading, error: healthError } = useQuery<SystemHealth>({
    queryKey: ['/api/health/detailed'],
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 10000, // Consider data stale after 10 seconds
  });
  
  // System metrics query
  const { data: metricsData, isLoading: metricsLoading } = useQuery<SystemMetrics>({
    queryKey: ['/api/metrics'],
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 10000,
  });
  
  // Active alerts query
  const { data: alertsData, isLoading: alertsLoading } = useQuery<{ alerts: ActiveAlert[] }>({
    queryKey: ['/api/observability/alerts'],
    refetchInterval: autoRefresh ? 15000 : false, // More frequent for alerts
    staleTime: 5000,
  });
  
  // Manual refresh function
  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/health/detailed'] });
    queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
    queryClient.invalidateQueries({ queryKey: ['/api/observability/alerts'] });
  };
  
  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  
  // Status color helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'degraded': return 'text-yellow-600 dark:text-yellow-400';
      case 'unhealthy': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': return <XCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };
  
  // Format uptime
  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };
  
  // Format bytes
  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  if (healthError) {
    return (
      <div className="container mx-auto p-6 max-w-7xl" data-testid="health-dashboard">
        <Alert variant="destructive" data-testid="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load health dashboard: {healthError instanceof Error ? healthError.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6" data-testid="health-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="dashboard-title">
            System Health Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="dashboard-description">
            Real-time monitoring and observability for Premier Properties
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={healthLoading || metricsLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${healthLoading || metricsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-testid="button-auto-refresh"
            >
              <Activity className="h-4 w-4 mr-2" />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* System Overview */}
      <Card data-testid="card-overview">
        <CardHeader 
          className="cursor-pointer" 
          onClick={() => toggleSection('overview')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <CardTitle>System Overview</CardTitle>
              {healthData && (
                <Badge 
                  variant={healthData.status === 'healthy' ? 'default' : 'destructive'}
                  className={getStatusColor(healthData.status)}
                  data-testid="badge-system-status"
                >
                  {getStatusIcon(healthData.status)}
                  <span className="ml-1 capitalize">{healthData.status}</span>
                </Badge>
              )}
            </div>
            {expandedSections.overview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        
        {expandedSections.overview && (
          <CardContent>
            {healthLoading ? (
              <div className="text-center py-8" data-testid="loading-overview">Loading system overview...</div>
            ) : healthData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Uptime</span>
                  </div>
                  <div className="text-2xl font-bold" data-testid="text-uptime">
                    {formatUptime(healthData.uptime)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Since {format(new Date(Date.now() - healthData.uptime), 'MMM dd, HH:mm')}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-medium">Response Time</span>
                  </div>
                  <div className="text-2xl font-bold" data-testid="text-response-time">
                    {healthData.responseTime}ms
                  </div>
                  <div className="text-xs text-muted-foreground">Average response</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="text-sm font-medium">Dependencies</span>
                  </div>
                  <div className="text-2xl font-bold" data-testid="text-dependencies">
                    {healthData.summary.healthy}/{healthData.summary.total}
                  </div>
                  <div className="text-xs text-muted-foreground">Healthy services</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Environment</span>
                  </div>
                  <div className="text-2xl font-bold capitalize" data-testid="text-environment">
                    {healthData.environment}
                  </div>
                  <div className="text-xs text-muted-foreground">v{healthData.version}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-data">
                No health data available
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
      {/* Alerts Section */}
      <Card data-testid="card-alerts">
        <CardHeader 
          className="cursor-pointer" 
          onClick={() => toggleSection('alerts')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Active Alerts</CardTitle>
              {alertsData?.alerts && (
                <Badge 
                  variant={alertsData.alerts.length > 0 ? "destructive" : "secondary"}
                  data-testid="badge-alerts-count"
                >
                  {alertsData.alerts.length}
                </Badge>
              )}
            </div>
            {expandedSections.alerts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        
        {expandedSections.alerts && (
          <CardContent>
            {alertsLoading ? (
              <div className="text-center py-8" data-testid="loading-alerts">Loading alerts...</div>
            ) : alertsData?.alerts && alertsData.alerts.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {alertsData.alerts.map((alert) => (
                    <Alert key={alert.id} data-testid={`alert-${alert.id}`}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityColor(alert.severity) as any}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <span className="font-medium">{alert.metric}</span>
                            </div>
                            <p className="text-sm">{alert.message}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Value: {alert.currentValue}</span>
                              <span>Threshold: {alert.threshold}</span>
                              <span>Triggered: {format(new Date(alert.triggeredAt), 'MMM dd, HH:mm')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {alert.acknowledged && (
                              <Badge variant="outline">
                                Acknowledged
                              </Badge>
                            )}
                            <Button variant="outline" size="sm" data-testid={`button-acknowledge-${alert.id}`}>
                              {alert.acknowledged ? 'View' : 'Acknowledge'}
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-alerts">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                No active alerts - System is healthy
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="performance" className="w-full" data-testid="dashboard-tabs">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="resources" data-testid="tab-resources">Resources</TabsTrigger>
          <TabsTrigger value="dependencies" data-testid="tab-dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>
        
        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {metricsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* HTTP Performance */}
              <Card data-testid="card-http-performance">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    HTTP Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-2xl font-bold" data-testid="text-total-requests">
                        {metricsData.performance.http.totalRequests.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Requests</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold" data-testid="text-active-connections">
                        {metricsData.performance.http.activeConnections}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Connections</div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div>
                    <h4 className="font-medium mb-2">Slowest Endpoints</h4>
                    <div className="space-y-2">
                      {metricsData.performance.http.topSlowEndpoints.slice(0, 5).map((endpoint, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {endpoint.endpoint}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{Math.round(endpoint.averageDuration)}ms</span>
                            <span className="text-muted-foreground">({endpoint.count} requests)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Database Performance */}
              <Card data-testid="card-database-performance">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-2xl font-bold" data-testid="text-query-count">
                        {metricsData.performance.database.queryCount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Queries</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold" data-testid="text-avg-query-time">
                        {Math.round(metricsData.performance.database.averageDuration)}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Average Duration</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Pool Utilization</span>
                        <span>{Math.round(metricsData.performance.database.poolUtilization * 100)}%</span>
                      </div>
                      <Progress 
                        value={metricsData.performance.database.poolUtilization * 100} 
                        className="h-2"
                        data-testid="progress-pool-utilization"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Slow Queries</div>
                        <div className={`text-lg ${metricsData.performance.database.slowQueryCount > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                          {metricsData.performance.database.slowQueryCount}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Query Errors</div>
                        <div className={`text-lg ${metricsData.performance.database.errorCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {metricsData.performance.database.errorCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          {metricsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Memory Usage */}
              <Card data-testid="card-memory-usage">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MemoryStick className="h-5 w-5" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>System Memory</span>
                        <span>{Math.round(metricsData.resources.memory.percentage)}% ({formatBytes(metricsData.resources.memory.used)})</span>
                      </div>
                      <Progress 
                        value={metricsData.resources.memory.percentage} 
                        className="h-3"
                        data-testid="progress-system-memory"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Heap Memory</span>
                        <span>{Math.round(metricsData.resources.memory.heap.percentage)}% ({formatBytes(metricsData.resources.memory.heap.used)})</span>
                      </div>
                      <Progress 
                        value={metricsData.resources.memory.heap.percentage} 
                        className="h-3"
                        data-testid="progress-heap-memory"
                      />
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Total: {formatBytes(metricsData.resources.memory.total)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* CPU Usage */}
              <Card data-testid="card-cpu-usage">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    CPU Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU Usage</span>
                        <span>{Math.round(metricsData.resources.cpu.percentage)}%</span>
                      </div>
                      <Progress 
                        value={metricsData.resources.cpu.percentage} 
                        className="h-3"
                        data-testid="progress-cpu-usage"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">User Time</div>
                        <div className="text-lg">{Math.round(metricsData.resources.cpu.user)}ms</div>
                      </div>
                      <div>
                        <div className="font-medium">System Time</div>
                        <div className="text-lg">{Math.round(metricsData.resources.cpu.system)}ms</div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Event Loop Delay: {Math.round(metricsData.resources.eventLoopDelay)}ms
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-6">
          {healthData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(healthData.checks).map(([name, check]) => (
                <Card key={name} data-testid={`card-dependency-${name}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{name.replace('_', ' ')}</span>
                      <Badge 
                        variant={check.status === 'healthy' ? 'default' : 'destructive'}
                        className={getStatusColor(check.status)}
                      >
                        {getStatusIcon(check.status)}
                        <span className="ml-1 capitalize">{check.status}</span>
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Response Time:</span>
                        <span className="font-mono">{check.responseTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Check:</span>
                        <span>{format(new Date(check.lastCheck), 'HH:mm:ss')}</span>
                      </div>
                      {check.message && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {check.message}
                        </div>
                      )}
                      {check.details && (
                        <div className="text-xs space-y-1 mt-2">
                          {Object.entries(check.details).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key}:</span>
                              <span className="font-mono">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card data-testid="card-history">
            <CardHeader>
              <CardTitle>System History</CardTitle>
              <CardDescription>
                Historical health and performance data (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4" />
                Historical data visualization will be available in the next update
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}