import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useI18n } from "@/contexts/I18nContext";
import Navigation from "@/components/navigation";
import PropertyForm from "@/components/property-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Home, Mail, Eye, Heart, Plus, Edit, Trash2, Calendar, Clock, User } from "lucide-react";
import type { Property, InsertProperty, Inquiry, Appointment } from "@shared/schema";
import AppointmentCalendar from "@/components/appointment-calendar";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AgentDashboard() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('common.unauthorized'),
        description: t('common.loggedOut'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/agent/properties"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/agent/inquiries"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/agent/appointments"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Mutation for confirming appointments
  const confirmAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      await apiRequest("PUT", `/api/appointments/${appointmentId}`, { status: "confirmed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/appointments"] });
      toast({
        title: "Agendamento Confirmado",
        description: "O agendamento foi confirmado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível confirmar o agendamento.",
        variant: "destructive",
      });
    },
  });

  // Mutation for cancelling appointments
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      await apiRequest("PUT", `/api/appointments/${appointmentId}`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/appointments"] });
      toast({
        title: "Agendamento Cancelado",
        description: "O agendamento foi cancelado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o agendamento.",
        variant: "destructive",
      });
    },
  });

  // Mutation for rescheduling appointments
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, newDateTime }: { appointmentId: string; newDateTime: string }) => {
      await apiRequest("PUT", `/api/appointments/${appointmentId}`, { appointmentDate: newDateTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/appointments"] });
      setIsRescheduleDialogOpen(false);
      setRescheduleAppointment(null);
      toast({
        title: "Agendamento Reagendado",
        description: "O agendamento foi reagendado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível reagendar o agendamento.",
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleConfirmAppointment = (appointmentId: string) => {
    confirmAppointmentMutation.mutate(appointmentId);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    cancelAppointmentMutation.mutate(appointmentId);
  };

  const handleRescheduleAppointment = (appointment: Appointment) => {
    setRescheduleAppointment(appointment);
    setIsRescheduleDialogOpen(true);
  };

  const { data: metrics = { totalViews: 0, totalFavorites: 0 } } = useQuery<{ totalViews: number; totalFavorites: number }>({
    queryKey: ["/api/agent/metrics"],
    enabled: isAuthenticated,
    retry: false,
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      await apiRequest("POST", "/api/properties", data);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('property.createdSuccessfully'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/properties"] });
      setIsPropertyFormOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('property.failedToCreate'),
        variant: "destructive",
      });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProperty> }) => {
      await apiRequest("PUT", `/api/properties/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success", 
        description: "Property updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/properties"] });
      setIsPropertyFormOpen(false);
      setSelectedProperty(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: t('property.deletedSuccessfully'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/properties"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: t('property.failedToDelete'),
        variant: "destructive",
      });
    },
  });

  const handleCreateProperty = (data: InsertProperty) => {
    createPropertyMutation.mutate(data);
  };

  const handleUpdateProperty = (data: InsertProperty) => {
    if (selectedProperty) {
      updatePropertyMutation.mutate({ 
        id: selectedProperty.id, 
        data 
      });
    }
  };

  const handleDeleteProperty = (id: string) => {
    if (confirm(t('property.confirmDelete'))) {
      deletePropertyMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Calculate statistics
  const activeListings = properties.filter(p => ['for_sale', 'for_rent'].includes(p.status)).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-dashboard-title">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.description')}
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{t('dashboard.activeListings')}</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-active-listings">
                    {activeListings}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <Home className="text-primary w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{t('dashboard.inquiries')}</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-inquiries-count">
                    {inquiries.length}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-full">
                  <Mail className="text-secondary w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Views</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-total-views">
                    {metrics.totalViews}
                  </p>
                </div>
                <div className="bg-accent/10 p-3 rounded-full">
                  <Eye className="text-accent w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Favorites</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-total-favorites">
                    {metrics.totalFavorites}
                  </p>
                </div>
                <div className="bg-muted-foreground/10 p-3 rounded-full">
                  <Heart className="text-muted-foreground w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="properties" className="space-y-4">
          <TabsList>
            <TabsTrigger value="properties" data-testid="tab-properties">Properties</TabsTrigger>
            <TabsTrigger value="inquiries" data-testid="tab-inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="appointments" data-testid="tab-appointments">
              <Calendar className="w-4 h-4 mr-2" />
              Agendamentos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="properties" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">Your Listings</h2>
              <Dialog open={isPropertyFormOpen} onOpenChange={setIsPropertyFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setSelectedProperty(null)} data-testid="button-add-property">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedProperty ? 'Edit Property' : 'Add New Property'}
                    </DialogTitle>
                  </DialogHeader>
                  <PropertyForm
                    property={selectedProperty || undefined}
                    onSubmit={selectedProperty ? handleUpdateProperty : handleCreateProperty}
                    isLoading={createPropertyMutation.isPending || updatePropertyMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {propertiesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="w-16 h-16 rounded-lg" />
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Skeleton className="w-8 h-8" />
                          <Skeleton className="w-8 h-8" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : properties.length > 0 ? (
                properties.map((property) => (
                  <Card key={property.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                            <img 
                              src={property.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100'}
                              alt={property.title}
                              className="w-full h-full object-cover"
                              data-testid={`img-property-${property.id}`}
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground" data-testid={`text-property-title-${property.id}`}>
                              {property.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {property.city}, {property.state}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                className={`text-xs ${
                                  property.status === 'for_sale' ? 'bg-secondary text-secondary-foreground' :
                                  property.status === 'for_rent' ? 'bg-accent text-accent-foreground' :
                                  'bg-muted text-muted-foreground'
                                }`}
                              >
                                {property.status.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm text-primary font-medium">
                                ${parseFloat(property.price).toLocaleString()}
                                {property.status === 'for_rent' ? '/mo' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProperty(property);
                              setIsPropertyFormOpen(true);
                            }}
                            data-testid={`button-edit-${property.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProperty(property.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${property.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground" data-testid="text-no-properties">
                      No properties yet. Add your first property to get started.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="inquiries" className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Inquiries</h2>
            
            <div className="space-y-4">
              {inquiriesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex space-x-2">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : inquiries.length > 0 ? (
                inquiries.map((inquiry: any) => (
                  <Card key={inquiry.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-foreground" data-testid={`text-inquiry-name-${inquiry.id}`}>
                          {inquiry.firstName} {inquiry.lastName}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(inquiry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Interested in: {inquiry.propertyTitle}
                      </p>
                      <p className="text-sm text-foreground mb-3" data-testid={`text-inquiry-message-${inquiry.id}`}>
                        {inquiry.message || "No message provided"}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-3">
                        <span>📧 {inquiry.email}</span>
                        {inquiry.phone && <span>📞 {inquiry.phone}</span>}
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" data-testid={`button-reply-${inquiry.id}`}>
                          Reply
                        </Button>
                        <Button variant="outline" size="sm" data-testid={`button-schedule-${inquiry.id}`}>
                          Schedule Tour
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground" data-testid="text-no-inquiries">
                      No inquiries yet. Once visitors start inquiring about your properties, they'll appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calendar Section */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Calendário de Agendamentos</h2>
                <AppointmentCalendar
                  agentId={isAuthenticated ? "agent-id" : ""}
                  showAppointments={true}
                />
              </div>

              {/* Appointments List */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Próximos Agendamentos</h2>
                
                <div className="space-y-4">
                  {appointmentsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-full" />
                            <div className="flex space-x-2">
                              <Skeleton className="h-8 w-20" />
                              <Skeleton className="h-8 w-24" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : appointments.length > 0 ? (
                    appointments.map((appointment) => (
                      <Card key={appointment.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-foreground flex items-center">
                              <User className="w-4 h-4 mr-2 text-muted-foreground" />
                              {appointment.clientName}
                            </h4>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="w-4 h-4 mr-1" />
                              {format(parseISO(appointment.appointmentDate), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            Propriedade ID: {appointment.propertyId.slice(0, 8)}...
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                            <span>📧 {appointment.clientEmail}</span>
                            {appointment.clientPhone && <span>📞 {appointment.clientPhone}</span>}
                          </div>
                          
                          {appointment.notes && (
                            <p className="text-sm text-foreground mb-3 bg-muted/50 p-2 rounded">
                              {appointment.notes}
                            </p>
                          )}
                          
                          <div className="flex justify-between items-center">
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant={appointment.status === 'confirmed' ? 'default' : 'outline'}
                                onClick={() => handleConfirmAppointment(appointment.id)}
                                disabled={appointment.status === 'confirmed' || appointment.status === 'cancelled' || confirmAppointmentMutation.isPending}
                                data-testid={`button-confirm-${appointment.id}`}
                              >
                                {confirmAppointmentMutation.isPending ? 'Confirmando...' : 
                                 appointment.status === 'confirmed' ? 'Confirmado' : 'Confirmar'}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRescheduleAppointment(appointment)}
                                disabled={appointment.status === 'cancelled' || rescheduleAppointmentMutation.isPending}
                                data-testid={`button-reschedule-${appointment.id}`}
                              >
                                {rescheduleAppointmentMutation.isPending ? 'Reagendando...' : 'Reagendar'}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCancelAppointment(appointment.id)}
                                disabled={appointment.status === 'cancelled' || cancelAppointmentMutation.isPending}
                                data-testid={`button-cancel-${appointment.id}`}
                              >
                                {cancelAppointmentMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                              </Button>
                            </div>
                            
                            <Badge 
                              className={
                                appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
                                appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                              }
                            >
                              {appointment.status === 'scheduled' && 'Agendado'}
                              {appointment.status === 'confirmed' && 'Confirmado'}
                              {appointment.status === 'cancelled' && 'Cancelado'}
                              {appointment.status === 'completed' && 'Concluído'}
                              {appointment.status === 'no_show' && 'Faltou'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground" data-testid="text-no-appointments">
                          Nenhum agendamento ainda. Quando os visitantes agendarem visitas às suas propriedades, elas aparecerão aqui.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Reschedule Dialog */}
        <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Reagendar Agendamento
              </DialogTitle>
              <DialogDescription>
                {rescheduleAppointment && (
                  <>Reagendar visita de <strong>{rescheduleAppointment.clientName}</strong></>
                )}
              </DialogDescription>
            </DialogHeader>

            {rescheduleAppointment && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <h4 className="font-medium text-foreground mb-2">Agendamento Atual</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(rescheduleAppointment.appointmentDate), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>

                <div>
                  <AppointmentCalendar
                    agentId={rescheduleAppointment.agentId}
                    onDateSelect={(date, time) => {
                      if (date && time) {
                        const [hours, minutes] = time.split(':').map(Number);
                        const appointmentDateTime = new Date(date);
                        appointmentDateTime.setHours(hours, minutes, 0, 0);

                        rescheduleAppointmentMutation.mutate({
                          appointmentId: rescheduleAppointment.id,
                          newDateTime: appointmentDateTime.toISOString()
                        });
                      }
                    }}
                    selectedDate={undefined}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsRescheduleDialogOpen(false)}
                    disabled={rescheduleAppointmentMutation.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
