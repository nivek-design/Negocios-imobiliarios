import twilio from 'twilio';
import { sendEmail } from './emailService';
import type { Appointment } from '@shared/schema';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Initialize Twilio client only if credentials are properly configured
let twilioClient: twilio.Twilio | null = null;
let whatsappFromNumber: string | null = null;

try {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  whatsappFromNumber = process.env.TWILIO_WHATSAPP_FROM || null;
  
  if (accountSid && authToken && whatsappFromNumber && accountSid.startsWith('AC')) {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio WhatsApp configurado com sucesso!');
  } else {
    console.warn('Twilio credentials not properly configured. WhatsApp notifications will be disabled.');
  }
} catch (error) {
  console.warn('Failed to initialize Twilio client:', error);
}

interface NotificationData {
  appointment: Appointment;
  clientEmail?: string;
  clientPhone?: string | null;
  agentName: string;
  propertyAddress: string;
}

export class NotificationService {
  private formatAppointmentDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR
    });
  }

  private formatPhoneNumber(phone: string): string {
    // Remove non-numeric characters and ensure proper WhatsApp format
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If it doesn't start with country code, assume Brazil (+55)
    if (cleanPhone.length === 11 && cleanPhone.startsWith('11')) {
      return `+55${cleanPhone}`;
    } else if (cleanPhone.length === 10) {
      return `+5511${cleanPhone}`;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      return `+${cleanPhone}`;
    } else if (cleanPhone.startsWith('55')) {
      return `+${cleanPhone}`;
    }
    
    return cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  }

  async sendConfirmationNotifications(data: NotificationData): Promise<void> {
    const { appointment, clientEmail, clientPhone, agentName, propertyAddress } = data;
    const formattedDate = this.formatAppointmentDate(appointment.appointmentDate);

    // Email notification
    if (clientEmail) {
      const emailContent = {
        subject: '✅ Visita Confirmada - Premier Properties',
        text: `Olá ${appointment.clientName}!

Sua visita foi confirmada com sucesso!

📍 Propriedade: ${propertyAddress}
👤 Corretor: ${agentName}
📅 Data e Horário: ${formattedDate}
📧 Email: ${appointment.clientEmail}
📱 Telefone: ${appointment.clientPhone}

Estaremos aguardando você no horário marcado.

Atenciosamente,
Equipe Premier Properties`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">✅ Visita Confirmada</h2>
            <p>Olá <strong>${appointment.clientName}</strong>!</p>
            <p>Sua visita foi confirmada com sucesso!</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">Detalhes da Visita</h3>
              <p><strong>📍 Propriedade:</strong> ${propertyAddress}</p>
              <p><strong>👤 Corretor:</strong> ${agentName}</p>
              <p><strong>📅 Data e Horário:</strong> ${formattedDate}</p>
              <p><strong>📧 Email:</strong> ${appointment.clientEmail}</p>
              <p><strong>📱 Telefone:</strong> ${appointment.clientPhone}</p>
            </div>
            
            <p>Estaremos aguardando você no horário marcado.</p>
            <p style="color: #64748b;">Atenciosamente,<br>Equipe Premier Properties</p>
          </div>
        `
      };

      await sendEmail({
        to: clientEmail,
        from: 'noreply@premierproperties.com',
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });
    }

    // WhatsApp notification
    if (clientPhone && twilioClient) {
      const whatsappMessage = `🏠 *Premier Properties*

✅ *Visita Confirmada*

Olá *${appointment.clientName}*!

Sua visita foi confirmada com sucesso!

📍 *Propriedade:* ${propertyAddress}
👤 *Corretor:* ${agentName}  
📅 *Data e Horário:* ${formattedDate}

Estaremos aguardando você no horário marcado.

_Mensagem automática - Premier Properties_`;

      try {
        const formattedPhone = this.formatPhoneNumber(clientPhone);
        await twilioClient.messages.create({
          body: whatsappMessage,
          from: whatsappFromNumber!,
          to: `whatsapp:${formattedPhone}`
        });
      } catch (error) {
        console.error('Erro ao enviar WhatsApp:', error);
        // Continue execution even if WhatsApp fails
      }
    }
  }

  async sendRescheduleNotifications(data: NotificationData, oldDate: string): Promise<void> {
    const { appointment, clientEmail, clientPhone, agentName, propertyAddress } = data;
    const newFormattedDate = this.formatAppointmentDate(appointment.appointmentDate);
    const oldFormattedDate = this.formatAppointmentDate(oldDate);

    // Email notification
    if (clientEmail) {
      const emailContent = {
        subject: '📅 Visita Reagendada - Premier Properties',
        text: `Olá ${appointment.clientName}!

Sua visita foi reagendada.

📍 Propriedade: ${propertyAddress}
👤 Corretor: ${agentName}

❌ Data Anterior: ${oldFormattedDate}
✅ Nova Data: ${newFormattedDate}

📧 Email: ${appointment.clientEmail}
📱 Telefone: ${appointment.clientPhone}

Estaremos aguardando você no novo horário marcado.

Atenciosamente,
Equipe Premier Properties`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">📅 Visita Reagendada</h2>
            <p>Olá <strong>${appointment.clientName}</strong>!</p>
            <p>Sua visita foi reagendada.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">Detalhes da Visita</h3>
              <p><strong>📍 Propriedade:</strong> ${propertyAddress}</p>
              <p><strong>👤 Corretor:</strong> ${agentName}</p>
              <div style="margin: 15px 0;">
                <p style="color: #dc2626;"><strong>❌ Data Anterior:</strong> ${oldFormattedDate}</p>
                <p style="color: #16a34a;"><strong>✅ Nova Data:</strong> ${newFormattedDate}</p>
              </div>
              <p><strong>📧 Email:</strong> ${appointment.clientEmail}</p>
              <p><strong>📱 Telefone:</strong> ${appointment.clientPhone}</p>
            </div>
            
            <p>Estaremos aguardando você no novo horário marcado.</p>
            <p style="color: #64748b;">Atenciosamente,<br>Equipe Premier Properties</p>
          </div>
        `
      };

      await sendEmail({
        to: clientEmail,
        from: 'noreply@premierproperties.com',
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });
    }

    // WhatsApp notification
    if (clientPhone && twilioClient) {
      const whatsappMessage = `🏠 *Premier Properties*

📅 *Visita Reagendada*

Olá *${appointment.clientName}*!

Sua visita foi reagendada.

📍 *Propriedade:* ${propertyAddress}
👤 *Corretor:* ${agentName}

❌ *Data Anterior:* ${oldFormattedDate}
✅ *Nova Data:* ${newFormattedDate}

Estaremos aguardando você no novo horário marcado.

_Mensagem automática - Premier Properties_`;

      try {
        const formattedPhone = this.formatPhoneNumber(clientPhone);
        await twilioClient.messages.create({
          body: whatsappMessage,
          from: whatsappFromNumber!,
          to: `whatsapp:${formattedPhone}`
        });
      } catch (error) {
        console.error('Erro ao enviar WhatsApp:', error);
        // Continue execution even if WhatsApp fails
      }
    }
  }

  async sendCancellationNotifications(data: NotificationData): Promise<void> {
    const { appointment, clientEmail, clientPhone, agentName, propertyAddress } = data;
    const formattedDate = this.formatAppointmentDate(appointment.appointmentDate);

    // Email notification
    if (clientEmail) {
      const emailContent = {
        subject: '❌ Visita Cancelada - Premier Properties',
        text: `Olá ${appointment.clientName}!

Infelizmente, sua visita foi cancelada.

📍 Propriedade: ${propertyAddress}
👤 Corretor: ${agentName}
📅 Data e Horário: ${formattedDate}

Se desejar reagendar, entre em contato conosco através:
📧 Email: ${appointment.clientEmail}
📱 Telefone: ${appointment.clientPhone}

Pedimos desculpas pelo inconveniente.

Atenciosamente,
Equipe Premier Properties`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">❌ Visita Cancelada</h2>
            <p>Olá <strong>${appointment.clientName}</strong>!</p>
            <p>Infelizmente, sua visita foi cancelada.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">Detalhes da Visita Cancelada</h3>
              <p><strong>📍 Propriedade:</strong> ${propertyAddress}</p>
              <p><strong>👤 Corretor:</strong> ${agentName}</p>
              <p><strong>📅 Data e Horário:</strong> ${formattedDate}</p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Se desejar reagendar:</strong></p>
              <p style="margin: 5px 0 0 0;">📧 ${appointment.clientEmail}<br>📱 ${appointment.clientPhone}</p>
            </div>
            
            <p>Pedimos desculpas pelo inconveniente.</p>
            <p style="color: #64748b;">Atenciosamente,<br>Equipe Premier Properties</p>
          </div>
        `
      };

      await sendEmail({
        to: clientEmail,
        from: 'noreply@premierproperties.com',
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });
    }

    // WhatsApp notification
    if (clientPhone && twilioClient) {
      const whatsappMessage = `🏠 *Premier Properties*

❌ *Visita Cancelada*

Olá *${appointment.clientName}*!

Infelizmente, sua visita foi cancelada.

📍 *Propriedade:* ${propertyAddress}
👤 *Corretor:* ${agentName}
📅 *Data e Horário:* ${formattedDate}

Se desejar reagendar, entre em contato conosco:
📧 ${appointment.clientEmail}
📱 ${appointment.clientPhone}

Pedimos desculpas pelo inconveniente.

_Mensagem automática - Premier Properties_`;

      try {
        const formattedPhone = this.formatPhoneNumber(clientPhone);
        await twilioClient.messages.create({
          body: whatsappMessage,
          from: whatsappFromNumber!,
          to: `whatsapp:${formattedPhone}`
        });
      } catch (error) {
        console.error('Erro ao enviar WhatsApp:', error);
        // Continue execution even if WhatsApp fails
      }
    }
  }
}

export const notificationService = new NotificationService();