import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient();

// メール送信設定をDBから取得
const getEmailConfig = async () => {
    const config = await prisma.emailConfig.findFirst({
        where: { isActive: true, isDefault: true },
    });
    
    if (!config) {
        // フォールバック: 環境変数を使用
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        if (isDevelopment) {
            return {
                host: process.env.MAIL_HOST || 'localhost',
                port: parseInt(process.env.MAIL_PORT || '1025'),
                secure: false,
                auth: {
                    user: process.env.MAIL_USER || '',
                    pass: process.env.MAIL_PASS || ''
                },
                fromEmail: process.env.MAIL_FROM || 'noreply@oneshot.example',
                fromName: 'OneShot Platform',
            };
        } else {
            return {
                host: process.env.MAIL_HOST,
                port: parseInt(process.env.MAIL_PORT || '587'),
                secure: process.env.MAIL_SECURE === 'true',
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                },
                fromEmail: process.env.MAIL_FROM || 'noreply@oneshot.example',
                fromName: 'OneShot Platform',
            };
        }
    }
    
    return {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.username,
            pass: config.password
        },
        fromEmail: config.fromEmail,
        fromName: config.fromName || 'OneShot Platform',
    };
};

// メールテンプレートをDBから取得
const getEmailTemplate = async (category: string) => {
    const template = await prisma.emailTemplate.findFirst({
        where: { category, isActive: true },
    });
    
    if (!template) {
        throw new Error(`メールテンプレートが見つかりません: ${category}`);
    }
    
    return template;
};

// テンプレート変数を置換
const replaceTemplateVariables = (template: string, variables: Record<string, string>) => {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
};

// メール送信関数（DB設定対応）
export const sendEmail = async (options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
}) => {
    try {
        const config = await getEmailConfig();
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth,
        });
        
        const mailOptions = {
            from: `"${config.fromName}" <${config.fromEmail}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, '')
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info('Email sent successfully', { 
            messageId: info.messageId,
            to: options.to,
            subject: options.subject
        });
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('Email sending failed', { error, to: options.to });
        throw new Error('メール送信に失敗しました');
    }
};

// テンプレートベースのメール送信
export const sendTemplatedEmail = async (options: {
    to: string;
    templateCategory: string;
    variables: Record<string, string>;
}) => {
    try {
        const template = await getEmailTemplate(options.templateCategory);
        const config = await getEmailConfig();
        
        // テンプレート変数を置換
        const subject = replaceTemplateVariables(template.subject, options.variables);
        const htmlBody = replaceTemplateVariables(template.htmlBody, options.variables);
        const textBody = template.textBody 
            ? replaceTemplateVariables(template.textBody, options.variables)
            : htmlBody.replace(/<[^>]*>/g, '');
        
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth,
        });
        
        const mailOptions = {
            from: `"${config.fromName}" <${config.fromEmail}>`,
            to: options.to,
            subject,
            html: htmlBody,
            text: textBody,
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info('Templated email sent successfully', { 
            messageId: info.messageId,
            to: options.to,
            templateCategory: options.templateCategory,
            subject
        });
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('Templated email sending failed', { 
            error, 
            to: options.to,
            templateCategory: options.templateCategory 
        });
        throw new Error('メール送信に失敗しました');
    }
};

// パスワードリセットメール送信（テンプレート対応）
export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    return sendTemplatedEmail({
        to: email,
        templateCategory: 'password_reset',
        variables: {
            resetUrl,
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        }
    });
};

// 決済完了メール送信（テンプレート対応）
export const sendPaymentCompletedEmail = async (email: string, postTitle: string, amount: number) => {
    return sendTemplatedEmail({
        to: email,
        templateCategory: 'payment_completed',
        variables: {
            postTitle,
            amount: amount.toLocaleString(),
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        }
    });
};

// 新規登録完了メール送信（テンプレート対応）
export const sendWelcomeEmail = async (email: string, nickname: string) => {
    return sendTemplatedEmail({
        to: email,
        templateCategory: 'welcome',
        variables: {
            nickname,
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        }
    });
}; 