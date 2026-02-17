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

  async sendInvitationEmail(params: {
    to: string;
    agencyName: string;
    firstName: string;
    inviteUrl: string;
  }) {
    const { to, agencyName, firstName, inviteUrl } = params;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:#0d9488;line-height:48px;text-align:center">
            <span style="color:#fff;font-weight:bold;font-size:20px">M</span>
          </div>
          <h2 style="color:#1e293b;margin:16px 0 0">Invitatie MapEstate</h2>
        </div>
        <p style="color:#334155;font-size:16px">Buna ${firstName},</p>
        <p style="color:#334155;font-size:16px">Ai fost invitat sa te alturi agentiei <strong>${agencyName}</strong> pe platforma MapEstate.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 32px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">Creeaza-ti contul</a>
        </div>
        <p style="color:#64748b;font-size:14px">Sau copiaza linkul: <a href="${inviteUrl}" style="color:#0d9488">${inviteUrl}</a></p>
        <p style="color:#94a3b8;font-size:13px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">Linkul expira in 7 zile. Daca nu ai solicitat aceasta invitatie, ignora acest email.</p>
      </div>
    `;

    try {
      const result = await this.resend.emails.send({
        from: this.config.get('RESEND_FROM_EMAIL', 'noreply@mapestate.eu'),
        to: [to],
        subject: `Invitatie - ${agencyName} pe MapEstate`,
        html,
      });

      if (result.error) {
        this.logger.error('Resend invitation error: ' + JSON.stringify(result.error));
        return { emailId: null, status: 'FAILED' as const };
      }
      this.logger.log('Invitation email sent: ' + result.data?.id);
      return { emailId: result.data?.id, status: 'SENT' as const };
    } catch (error) {
      this.logger.error('Failed to send invitation email', error);
      return { emailId: null, status: 'FAILED' as const };
    }
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
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">Trimis prin MapEstate</p>
      </div>
    `;

    const attachments = pdfBuffer
      ? [{ filename: 'oferta-' + dealName + '.pdf', content: pdfBuffer }]
      : [];

    try {
      const result = await this.resend.emails.send({
        from: this.config.get('RESEND_FROM_EMAIL', 'noreply@mapestate.eu'),
        to,
        subject,
        html,
        attachments,
      });

      if (result.error) {
        this.logger.error('Resend error: ' + JSON.stringify(result.error));
        return { emailId: null, status: 'FAILED' as const };
      }
      this.logger.log('Email sent: ' + result.data?.id);
      return { emailId: result.data?.id, status: 'SENT' as const };
    } catch (error) {
      this.logger.error('Failed to send email', error);
      return { emailId: null, status: 'FAILED' as const };
    }
  }
}
