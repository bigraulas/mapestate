import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendOfferEmailParams {
  to: string[];
  subject: string;
  dealName: string;
  companyName?: string;
  buildings: Array<{
    name: string;
    address?: string;
    availableSqm?: number;
    serviceCharge?: number;
    location?: string;
  }>;
  message?: string;
  pdfBuffer?: Buffer;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get('RESEND_API_KEY'));
  }

  async sendOfferEmail(params: SendOfferEmailParams) {
    const { to, subject, dealName, companyName, buildings, message, pdfBuffer } = params;

    const buildingRows = buildings
      .map(
        (b) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${b.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">${b.location || '-'}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">${b.availableSqm ? b.availableSqm + ' mp' : '-'}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">${b.serviceCharge ? b.serviceCharge + ' EUR/mp' : '-'}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1e293b">Oferta: ${dealName}</h2>
        ${companyName ? '<p style="color:#64748b">Pentru: ' + companyName + '</p>' : ''}
        ${message ? '<p style="color:#334155">' + message + '</p>' : ''}
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0">Proprietate</th>
              <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0">Locatie</th>
              <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0">Suprafata</th>
              <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0">Pret</th>
            </tr>
          </thead>
          <tbody>${buildingRows}</tbody>
        </table>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">Trimis prin Dunwell CRM</p>
      </div>
    `;

    const attachments = pdfBuffer
      ? [{ filename: 'oferta-' + dealName + '.pdf', content: pdfBuffer }]
      : [];

    try {
      const result = await this.resend.emails.send({
        from: this.config.get('RESEND_FROM_EMAIL', 'noreply@dunwell.ro'),
        to,
        subject,
        html,
        attachments,
      });

      this.logger.log('Email sent: ' + result.data?.id);
      return { emailId: result.data?.id, status: 'SENT' as const };
    } catch (error) {
      this.logger.error('Failed to send email', error);
      return { emailId: null, status: 'FAILED' as const };
    }
  }
}
