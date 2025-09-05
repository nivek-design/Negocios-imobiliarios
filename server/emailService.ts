import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Email templates for appointments
export function generateAppointmentConfirmationEmail(appointment: {
  clientName: string;
  propertyTitle: string;
  appointmentDate: string;
  propertyAddress?: string;
  agentName?: string;
  agentPhone?: string;
}) {
  const formattedDate = new Date(appointment.appointmentDate).toLocaleString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `Confirmação de Agendamento - ${appointment.propertyTitle}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">Agendamento Confirmado! 🏡</h2>
      
      <p>Olá <strong>${appointment.clientName}</strong>,</p>
      
      <p>Seu agendamento para visita foi confirmado com sucesso!</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e293b; margin: 0 0 15px 0;">Detalhes do Agendamento:</h3>
        <p><strong>Propriedade:</strong> ${appointment.propertyTitle}</p>
        ${appointment.propertyAddress ? `<p><strong>Endereço:</strong> ${appointment.propertyAddress}</p>` : ''}
        <p><strong>Data e Hora:</strong> ${formattedDate}</p>
        ${appointment.agentName ? `<p><strong>Corretor:</strong> ${appointment.agentName}</p>` : ''}
        ${appointment.agentPhone ? `<p><strong>Telefone do Corretor:</strong> ${appointment.agentPhone}</p>` : ''}
      </div>
      
      <p>Por favor, chegue com alguns minutos de antecedência. Em caso de imprevisto, entre em contato conosco o quanto antes.</p>
      
      <p style="margin-top: 30px;">Atenciosamente,<br>
      <strong>Premier Properties</strong></p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #64748b;">
        Este é um email automático de confirmação. Para cancelar ou reagendar, entre em contato conosco.
      </p>
    </div>
  `;

  const text = `
    Agendamento Confirmado!

    Olá ${appointment.clientName},

    Seu agendamento para visita foi confirmado com sucesso!

    Detalhes do Agendamento:
    - Propriedade: ${appointment.propertyTitle}
    ${appointment.propertyAddress ? `- Endereço: ${appointment.propertyAddress}` : ''}
    - Data e Hora: ${formattedDate}
    ${appointment.agentName ? `- Corretor: ${appointment.agentName}` : ''}
    ${appointment.agentPhone ? `- Telefone do Corretor: ${appointment.agentPhone}` : ''}

    Por favor, chegue com alguns minutos de antecedência. Em caso de imprevisto, entre em contato conosco o quanto antes.

    Atenciosamente,
    Premier Properties
  `;

  return { subject, html, text };
}

export function generateAppointmentReminderEmail(appointment: {
  clientName: string;
  propertyTitle: string;
  appointmentDate: string;
  propertyAddress?: string;
  agentName?: string;
  agentPhone?: string;
}) {
  const formattedDate = new Date(appointment.appointmentDate).toLocaleString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `Lembrete: Visita Agendada para Amanhã - ${appointment.propertyTitle}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #f59e0b; margin-bottom: 20px;">Lembrete de Visita 📅</h2>
      
      <p>Olá <strong>${appointment.clientName}</strong>,</p>
      
      <p>Este é um lembrete sobre sua visita agendada para <strong>amanhã</strong>!</p>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="color: #92400e; margin: 0 0 15px 0;">Detalhes da Visita:</h3>
        <p><strong>Propriedade:</strong> ${appointment.propertyTitle}</p>
        ${appointment.propertyAddress ? `<p><strong>Endereço:</strong> ${appointment.propertyAddress}</p>` : ''}
        <p><strong>Data e Hora:</strong> ${formattedDate}</p>
        ${appointment.agentName ? `<p><strong>Corretor:</strong> ${appointment.agentName}</p>` : ''}
        ${appointment.agentPhone ? `<p><strong>Telefone do Corretor:</strong> ${appointment.agentPhone}</p>` : ''}
      </div>
      
      <p><strong>Dicas para sua visita:</strong></p>
      <ul style="color: #374151;">
        <li>Chegue com alguns minutos de antecedência</li>
        <li>Traga documentos de identificação</li>
        <li>Prepare uma lista de perguntas sobre a propriedade</li>
        <li>Se possível, visite durante o dia para avaliar a iluminação natural</li>
      </ul>
      
      <p style="margin-top: 30px;">Atenciosamente,<br>
      <strong>Premier Properties</strong></p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #64748b;">
        Para cancelar ou reagendar, entre em contato conosco o quanto antes.
      </p>
    </div>
  `;

  const text = `
    Lembrete de Visita

    Olá ${appointment.clientName},

    Este é um lembrete sobre sua visita agendada para amanhã!

    Detalhes da Visita:
    - Propriedade: ${appointment.propertyTitle}
    ${appointment.propertyAddress ? `- Endereço: ${appointment.propertyAddress}` : ''}
    - Data e Hora: ${formattedDate}
    ${appointment.agentName ? `- Corretor: ${appointment.agentName}` : ''}
    ${appointment.agentPhone ? `- Telefone do Corretor: ${appointment.agentPhone}` : ''}

    Dicas para sua visita:
    - Chegue com alguns minutos de antecedência
    - Traga documentos de identificação
    - Prepare uma lista de perguntas sobre a propriedade
    - Se possível, visite durante o dia para avaliar a iluminação natural

    Atenciosamente,
    Premier Properties
  `;

  return { subject, html, text };
}