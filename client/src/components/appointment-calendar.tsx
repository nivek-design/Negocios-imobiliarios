import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Home, Calendar as CalendarIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isAfter, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Appointment } from '@shared/schema';

interface AppointmentCalendarProps {
  agentId: string;
  onDateSelect?: (date: Date, availableSlots: string[]) => void;
  selectedDate?: Date;
  showAppointments?: boolean;
}

export default function AppointmentCalendar({
  agentId,
  onDateSelect,
  selectedDate,
  showAppointments = false
}: AppointmentCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Query available slots for selected date
  const { data: slots, isLoading: slotsLoading } = useQuery<string[]>({
    queryKey: ['/api/agents', agentId, 'available-slots', date?.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!date) return [];
      const dateString = date.toISOString().split('T')[0];
      const response = await fetch(`/api/agents/${agentId}/available-slots?date=${dateString}`);
      if (!response.ok) throw new Error('Failed to fetch available slots');
      return response.json();
    },
    enabled: !!date && !!agentId,
  });

  // Query agent appointments if showing appointments
  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ['/api/agent/appointments'],
    enabled: showAppointments,
  });

  useEffect(() => {
    if (slots) {
      setAvailableSlots(slots);
      if (onDateSelect && date) {
        onDateSelect(date, slots);
      }
    }
  }, [slots, date, onDateSelect]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    // Don't allow selecting past dates
    if (!isAfter(selectedDate, startOfDay(new Date()))) {
      return;
    }
    
    setDate(selectedDate);
  };

  const getAppointmentsForDate = (checkDate: Date) => {
    if (!appointments) return [];
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate.toDateString() === checkDate.toDateString();
    });
  };

  const isDayDisabled = (day: Date) => {
    // Disable past dates and weekends
    if (!isAfter(day, startOfDay(new Date()))) return true;
    
    const dayOfWeek = day.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  const formatTime = (timeString: string) => {
    const [hour] = timeString.split(':');
    const hourNum = parseInt(hour);
    return `${hourNum}:00`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <CalendarIcon className="w-5 h-5 mr-2 text-primary" />
          Selecionar Data
        </h3>
        
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          locale={ptBR}
          disabled={isDayDisabled}
          className="rounded-md border border-border"
          data-testid="appointment-calendar"
        />
      </div>

      {/* Available Time Slots */}
      {date && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary" />
            Horários Disponíveis - {format(date, 'dd/MM/yyyy', { locale: ptBR })}
          </h3>
          
          {slotsLoading ? (
            <div className="text-muted-foreground">Carregando horários...</div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  data-testid={`time-slot-${slot}`}
                >
                  {formatTime(slot)}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-4">
              Não há horários disponíveis para esta data.
            </div>
          )}
        </div>
      )}

      {/* Daily Appointments (for agents) */}
      {showAppointments && date && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-primary" />
            Agendamentos - {format(date, 'dd/MM/yyyy', { locale: ptBR })}
          </h3>
          
          {(() => {
            const dayAppointments = getAppointmentsForDate(date);
            
            if (dayAppointments.length === 0) {
              return (
                <div className="text-muted-foreground py-4">
                  Nenhum agendamento para esta data.
                </div>
              );
            }
            
            return (
              <div className="space-y-3">
                {dayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(parseISO(appointment.appointmentDate), 'HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{appointment.clientName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Home className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Propriedade ID: {appointment.propertyId.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                    <Badge 
                      className={getStatusColor(appointment.status)}
                      data-testid={`appointment-status-${appointment.status}`}
                    >
                      {appointment.status === 'scheduled' && 'Agendado'}
                      {appointment.status === 'confirmed' && 'Confirmado'}
                      {appointment.status === 'cancelled' && 'Cancelado'}
                      {appointment.status === 'completed' && 'Concluído'}
                      {appointment.status === 'no_show' && 'Faltou'}
                    </Badge>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}