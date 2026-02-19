import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configuration du transporteur SMTP
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"CampusMaster" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe - CampusMaster',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">CampusMaster</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Plateforme de Gestion Académique</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Réinitialisation de mot de passe</h2>
            <p style="color: #666; line-height: 1.6;">
              Bonjour,<br><br>
              Vous avez demandé la réinitialisation de votre mot de passe pour votre compte CampusMaster.
              Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 15px 30px; text-decoration: none; 
                        border-radius: 5px; font-weight: bold; display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
              <a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a>
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              ⚠️ Ce lien expirera dans 1 heure pour des raisons de sécurité.
            </p>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            <p style="margin-top: 20px;">© 2026 CampusMaster. Tous droits réservés.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email de réinitialisation envoyé à ${email}`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw new Error('Impossible d\'envoyer l\'email de réinitialisation');
    }
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Connexion SMTP vérifiée avec succès');
    } catch (error) {
      console.error('Erreur de connexion SMTP:', error);
      throw new Error('La configuration SMTP est invalide');
    }
  }
}
