import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Phone, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppointmentCalendar from './appointment-calendar';

// Form validation schema
const appointmentFormSchema = z.object({
  clientName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  clientEmail: z.string().email('Email inválido'),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  propertyId: string;
  agentId: string;
  propertyTitle: string;
  trigger: React.ReactNode;
}

export default function AppointmentForm({
  propertyId,
  agentId,
  propertyTitle,
  trigger
}: AppointmentFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [step, setStep] = useState<'date' | 'form'>('date');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      notes: '',
    },
  });

  const appointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues & {
      propertyId: string;
      agentId: string;
      appointmentDate: string;
    }) => {
      return await apiRequest('POST', '/api/appointments', data);
    },
    onSuccess: () => {
      toast({
        title: 'Agendamento Realizado!',
        description: 'Sua visita foi agendada com sucesso. Você receberá uma confirmação por email.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/appointments'] });
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro no Agendamento',
        description: error.message || 'Não foi possível realizar o agendamento. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    form.reset();
    setSelectedDate(undefined);
    setSelectedTime('');
    setAvailableSlots([]);
    setStep('date');
  };

  const handleDateSelect = (date: Date, slots: string[]) => {
    setSelectedDate(date);
    setAvailableSlots(slots);
    if (slots.length > 0) {
      setStep('form');
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const onSubmit = (data: AppointmentFormValues) => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Dados Incompletos',
        description: 'Por favor, selecione uma data e horário.',
        variant: 'destructive',
      });
      return;
    }

    // Create the appointment datetime
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    appointmentMutation.mutate({
      ...data,
      propertyId,
      agentId,
      appointmentDate: appointmentDateTime.toISOString(),
    });
  };

  const formatSelectedDateTime = () => {
    if (!selectedDate || !selectedTime) return '';
    const [hours] = selectedTime.split(':');
    return `${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })} às ${hours}:00`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary" />
            Agendar Visita
          </DialogTitle>
          <DialogDescription>
            Agendar uma visita para: <strong>{propertyTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        {step === 'date' && (
          <div className="space-y-4">
            <AppointmentCalendar
              agentId={agentId}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
            
            {selectedDate && availableSlots.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                Não há horários disponíveis para a data selecionada.
                Por favor, escolha outra data.
              </div>
            )}
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-6">
            {/* Selected Date/Time Summary */}
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">Data e Horário Selecionados</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatSelectedDateTime()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('date')}
                  data-testid="button-change-date"
                >
                  Alterar
                </Button>
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <label className="text-sm font-medium">Selecionar Horário *</label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={selectedTime === slot ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTimeSelect(slot)}
                    className="text-xs"
                    data-testid={`select-time-${slot}`}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {slot}
                  </Button>
                ))}
              </div>
              {!selectedTime && (
                <p className="text-sm text-destructive mt-1">
                  Por favor, selecione um horário.
                </p>
              )}
            </div>

            {/* Contact Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          Nome Completo *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Seu nome completo" 
                            {...field}
                            data-testid="input-client-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          Email *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="seu@email.com" 
                            {...field}
                            data-testid="input-client-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        Telefone (opcional)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="(11) 99999-9999" 
                          {...field}
                          data-testid="input-client-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Observações (opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Alguma observação especial sobre a visita..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('date')}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={appointmentMutation.isPending || !selectedTime}
                    className="flex-1"
                    data-testid="button-submit-appointment"
                  >
                    {appointmentMutation.isPending ? (
                      'Agendando...'
                    ) : (
                      'Confirmar Agendamento'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}