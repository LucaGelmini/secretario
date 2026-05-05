/**
 * Gmail Classification Rules
 *
 * Derived from docs/gmail-organization-rules.md
 * Last updated: 2026-05-05
 *
 * These are deterministic rules applied before AI classification.
 * Priority order matters - first match wins.
 */

import type { Email } from '@/integrations/gmail/types';

/**
 * Classification categories
 */
export const CATEGORIES = {
  // Keep with labels
  PERSONAL: 'whitelist_personal',
  FILOSOFIA: 'filosofia',
  PROPUESTAS_LABORALES: 'propuestas_laborales',
  EDUCACION: 'educacion_cursos',
  FACTURAS: 'facturas',
  VIAJES: 'viajes',
  BANKING: 'banking',
  SERVICIOS_TECH: 'servicios_tech',
  NEWSLETTERS_TECH: 'newsletters_tech',
  ADMIN_EDIFICIO: 'admin_edificio',
  TRABAJO: 'trabajo',

  // Delete categories
  BLACKLIST: 'blacklist',
  MFA_SEGURIDAD: 'mfa_seguridad',
  NOTIFICACIONES_SOCIALES: 'notificaciones_sociales',
  PUBLICIDAD: 'publicidad',

  // Review
  SIN_CATEGORIZAR: 'sin_categorizar',
} as const;

export type Category = (typeof CATEGORIES)[keyof typeof CATEGORIES];

/**
 * Category to Gmail label mapping
 */
export const CATEGORY_LABELS: Record<string, string> = {
  [CATEGORIES.PERSONAL]: 'Personal',
  [CATEGORIES.FILOSOFIA]: 'Filosofía',
  [CATEGORIES.PROPUESTAS_LABORALES]: 'Propuestas Laborales',
  [CATEGORIES.EDUCACION]: 'Educación/Cursos',
  [CATEGORIES.FACTURAS]: 'Facturas',
  [CATEGORIES.VIAJES]: 'Viajes',
  [CATEGORIES.BANKING]: 'Banking',
  [CATEGORIES.SERVICIOS_TECH]: 'Servicios Tech',
  [CATEGORIES.NEWSLETTERS_TECH]: 'Newsletters Tech',
  [CATEGORIES.ADMIN_EDIFICIO]: 'Admin Edificio',
  [CATEGORIES.TRABAJO]: 'Trabajo',
};

/**
 * Action to take for each category
 */
export const CATEGORY_ACTIONS: Record<Category, 'label' | 'delete' | 'review'> = {
  [CATEGORIES.PERSONAL]: 'label',
  [CATEGORIES.FILOSOFIA]: 'label',
  [CATEGORIES.PROPUESTAS_LABORALES]: 'label',
  [CATEGORIES.EDUCACION]: 'label',
  [CATEGORIES.FACTURAS]: 'label',
  [CATEGORIES.VIAJES]: 'delete',
  [CATEGORIES.BANKING]: 'label',
  [CATEGORIES.SERVICIOS_TECH]: 'label',
  [CATEGORIES.NEWSLETTERS_TECH]: 'label',
  [CATEGORIES.ADMIN_EDIFICIO]: 'label',
  [CATEGORIES.TRABAJO]: 'label',
  [CATEGORIES.BLACKLIST]: 'delete',
  [CATEGORIES.MFA_SEGURIDAD]: 'delete',
  [CATEGORIES.NOTIFICACIONES_SOCIALES]: 'delete',
  [CATEGORIES.PUBLICIDAD]: 'delete',
  [CATEGORIES.SIN_CATEGORIZAR]: 'review',
};

/**
 * Blacklist - always delete
 */
export const BLACKLIST_EMAILS = [
  'promociones@e-oncity.com',
  'no-reply-ar@info.cabify.com',
  'no-reply@info.cabify.com',
  'no-reply@appmcdonalds.com',
  'noreply@wikiloc.com',
  'email.campaign@sg.booking.com',
  'discover@airbnb.com',
  'hello@duolingo.com',
  'no-reply@duolingo.com',
  'super-support@duolingo.com',
  'calidad@factura.telecentro.com.ar',
  'recupero@grupofleetsa.com',
  'calidad@qemailserver.com',
  'noreply@qemailserver.com',
  'noreply@info.telecentro.com.ar',
];

/**
 * Whitelist (Personal) - always keep and label
 */
export const WHITELIST_EMAILS = [
  'aldereteale3@gmail.com',
  'prsantero@gmail.com',
  'julio.batkis@gmail.com',
  'amosswald@gmail.com',
  'celiacabrerasc@gmail.com',
  'fcorbaz@gmail.com',
  'bustosth@gmail.com',
  'mariaflramella@gmail.com',
  'juligarcia791@gmail.com',
  'horaciobanega@gmail.com',
  'alelaregina@gmail.com',
  'melisadriz@gmail.com',
  'veronicakretschel@gmail.com',
  'lfgelmini@gmail.com',
  'teoiovine@gmail.com',
  'guillermoeparral@gmail.com',
  'drive-shares-dm-noreply@google.com',
  'comments-noreply@docs.google.com',
];

/**
 * Filosofía senders
 */
export const FILOSOFIA_EMAILS = [
  'arielabattan@gmail.com',
  'azulkatz@gmail.com',
  'leocaviglia@gmail.com',
  'robson.reis@ufsm.br',
  'maximiliano.vial@mail.udp.cl',
  'francisca.hill@mail.udp.cl',
  'paguinez@gmail.com',
  'gonzalo.santaya@docentes.unab.edu.ar',
  'malarison@gmail.com',
  'micaelaszeftel@gmail.com',
  'savignanoalan@gmail.com',
  'yb.crescenzi@gmail.com',
  'boletines@katzeditores.com',
];

/**
 * Filosofía keywords (match in subject or snippet)
 */
export const FILOSOFIA_KEYWORDS = [
  'being we',
  'zahavi',
  'husserl',
  'fenomenología',
  'fenomenologia',
  'filosofía',
  'filosofia',
  'facultad',
  'congreso',
  'simposio',
  'cfp',
  'call for papers',
  'paper',
  'ponencia',
  'jornadas',
  'coloquio',
];

/**
 * Propuestas Laborales
 */
export const RECRUITMENT_EMAILS = [
  'ext_vavillav@mercadolibre.com',
  'noreplypeople@mercadolibre.com',
  'sabrina.jaimovitch@monks.com',
  'hello@gytai.net',
  'federico@emilabs.ai',
];

export const RECRUITMENT_DOMAINS = [
  '@thaia.co',
  '@thaia.na.teamtailor-mail.com',
  '@exxonmobil.com',
  '@leadgenios.com',
  '@platformxsolutions.com',
  '@pandape.com',
  '@email.pandadoc.net',
  '@monks.com',
  '@gytai.net',
  '@emilabs.ai',
];

/**
 * Educación/Cursos
 */
export const ELEARNING_EMAILS = ['hello@boot.dev'];

export const ELEARNING_DOMAINS = ['@centrodeelearning.com', '@marketing.centrodeelearning.com'];

/**
 * Facturas
 */
export const FACTURAS_EMAILS = [
  'no-responder@mercadolibre.com',
  'noreply@mercadolibre.com',
  'no-reply@mercadolibre.com.ar',
  'no-responder@mercadopago.com',
  'info@mercadopago.com',
  'noreply@uber.com',
  'support@rappimail.com',
  'noresponder@qloud.ar',
  'no-reply@contabilium.com',
  'info@sumoticket.com',
  'payments-noreply@google.com',
  'noreply-payments@google.com',
  'googlepay-noreply@google.com',
  'no-reply@send.payoneer.com',
  'facturadigital@factura.telecentro.com.ar',
  'no-responder@mercadopago.com.ar',
  'no-reply@mgx.cabify.com',
];

/**
 * Viajes
 */
export const VIAJES_EMAILS = [
  'automated@airbnb.com',
  'express@airbnb.com',
  'noreply@booking.com',
  'noreply-payments@booking.com',
  'noreply-iam@booking.com',
  'noreply@flixbus.com',
];

export const VIAJES_DOMAINS = ['@property.booking.com'];

/**
 * Banking
 */
export const BANKING_EMAILS = ['info@brubank.com', 'newsletter@legales.brubank.com'];

/**
 * Servicios Tech
 */
export const SERVICIOS_TECH_EMAILS = [
  'contact@offramp.xyz',
  'health@aws.com',
  'no-reply@amazonaws.com',
  'cloudplatform-noreply@google.com',
  'platformnotifications-noreply@google.com',
  'em@em1.cloudflare.com',
  'notifications@vercel.com',
  'security@vercel.com',
  'noreply@email.openai.com',
  'serverless@redpanda.com',
  'andrew.mcinvale@redpanda.com',
  'product@postman.com',
  'noreply@tradingview.com',
  'workspace-noreply@google.com',
  'drivesafety-noreply@google.com',
  'no-reply@login.awsapps.com',
  'google-cloud-compliance@google.com',
];

/**
 * Newsletters Tech
 */
export const NEWSLETTERS_TECH_EMAILS = ['encuestas@sysarmy.com', 'nerdearla@nerdear.la'];

/**
 * Admin Edificio
 */
export const ADMIN_EDIFICIO_EMAILS = [
  'noresponder@ho.i-data.com.ar',
  'estudiocingolani@live.com.ar',
];

/**
 * MFA/Seguridad
 */
export const MFA_EMAILS = [
  'no-reply@accounts.google.com',
  'account-security-noreply@accountprotection.microsoft.com',
  'security-noreply@linkedin.com',
  'verify@x.com',
  'noreply@idp.personal.com.ar',
  'noreply-iam@booking.com',
  'hello@splitwise.com',
];

export const MFA_KEYWORDS = [
  'código',
  'code',
  'verification',
  '2fa',
  'mfa',
  'autenticación',
  'password reset',
  'verificación',
  'security code',
  'one-time',
  'confirm your',
  'verify your',
];

/**
 * Notificaciones Sociales
 */
export const SOCIAL_NOTIF_EMAILS = [
  'no-reply@youtube.com',
  'do-not-reply@trello.com',
  'calendar-noreply@google.com',
  'teamcalendly@send.calendly.com',
  'messages-noreply@linkedin.com',
  'updates-noreply@linkedin.com',
  'googleplay-noreply@google.com',
];

/**
 * Publicidad keywords
 */
export const PUBLICIDAD_KEYWORDS = [
  'oferta',
  'descuento',
  'sale',
  'promo',
  'promoción',
  'suscripción',
  'unsubscribe',
  '% off',
  'gratis',
  'regalo',
  'sorteo',
  'últimos días',
  'no te lo pierdas',
];

/**
 * Classification result
 */
export interface ClassificationResult {
  category: Category;
  action: 'label' | 'delete' | 'review';
  labelName?: string;
  reason?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1]! : from).toLowerCase().trim();
}

/**
 * Check if email matches a domain pattern
 */
function matchesDomain(email: string, domains: string[]): boolean {
  return domains.some((domain) => email.endsWith(domain.toLowerCase()));
}

/**
 * Check if text contains any keyword (case-insensitive)
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
}

/**
 * Classify an email using deterministic rules
 *
 * Priority order (first match wins):
 * 1. Blacklist → delete
 * 2. Whitelist → Personal
 * 3. Admin Edificio
 * 4. Filosofía (emails OR keywords)
 * 5. Recruitment (emails OR domains)
 * 6. E-learning (emails OR domains)
 * 7. Banking
 * 8. Viajes (emails OR domains)
 * 9. Facturas
 * 10. Servicios Tech
 * 11. Newsletters Tech
 * 12. MFA (emails OR keywords + age check)
 * 13. Social notifications
 * 14. Publicidad (keywords)
 * 15. Gmail SPAM label
 * 16. Gmail PROMOTIONS label
 * 17. Sin categorizar (review)
 */
export function classifyEmail(email: Email): ClassificationResult {
  const emailAddress = extractEmail(email.from);
  const text = `${email.subject} ${email.snippet || ''}`.toLowerCase();
  const labels = email.labels || [];

  // 1. Blacklist
  if (BLACKLIST_EMAILS.includes(emailAddress)) {
    return {
      category: CATEGORIES.BLACKLIST,
      action: 'delete',
      reason: 'blacklist',
      confidence: 'high',
    };
  }

  // 2. Whitelist (Personal)
  if (WHITELIST_EMAILS.includes(emailAddress)) {
    return {
      category: CATEGORIES.PERSONAL,
      action: 'label',
      labelName: CATEGORY_LABELS[CATEGORIES.PERSONAL],
      reason: 'whitelist',
      confidence: 'high',
    };
  }

  // 3. Admin Edificio
  if (ADMIN_EDIFICIO_EMAILS.includes(emailAddress)) {
    return {
      category: CATEGORIES.ADMIN_EDIFICIO,
      action: 'label',
      labelName: CATEGORY_LABELS[CATEGORIES.ADMIN_EDIFICIO],
      reason: 'admin edificio',
      confidence: 'high',
    };
  }

  // 4. Filosofía
  if (FILOSOFIA_EMAILS.includes(emailAddress) || containsKeyword(text, FILOSOFIA_KEYWORDS)) {
    return {
      category: CATEGORIES.FILOSOFIA,
      action: 'label',
      labelName: CATEGORY_LABELS[CATEGORIES.FILOSOFIA],
      reason: FILOSOFIA_EMAILS.includes(emailAddress) ? 'filosofia sender' : 'filosofia keyword',
      confidence: 'high',
    };
  }

  // 5. Recruitment
  if (
    RECRUITMENT_EMAILS.includes(emailAddress) ||
    matchesDomain(emailAddress, RECRUITMENT_DOMAINS)
  ) {
    return {
      category: CATEGORIES.PROPUESTAS_LABORALES,
      action: 'label',
      labelName: CATEGORY_LABELS[CATEGORIES.PROPUESTAS_LABORALES],
      reason: 'recruitment',
      confidence: 'high',
    };
  }

  // 6. E-learning
  if (ELEARNING_EMAILS.includes(emailAddress) || matchesDomain(emailAddress, ELEARNING_DOMAINS)) {
    return {
      category: CATEGORIES.EDUCACION,
      action: 'label',
      labelName: CATEGORY_LABELS[CATEGORIES.EDUCACION],
      reason: 'e-learning',
      confidence: 'high',
    };
  }

  // 7. Banking
  if (BANKING_EMAILS.includes(emailAddress)) {
    return {
      category: CATEGORIES.BANKING,
      action: 'label',
      labelName: CATEGORY_LABELS[CATEGORIES.BANKING],
      reason: 'banking',
      confidence: 'high',
    };
  }

  // 8. Viajes
  if (VIAJES_EMAILS.includes(emailAddress) || matchesDomain(emailAddress, VIAJES_DOMAINS)) {
    return {
      category: CATEGORIES.VIAJES,
      action: 'delete',
      reason: 'viajes',
      confidence: 'high',
    };
  }

  // 9. Facturas
  if (FACTURAS_EMAILS.includes(emailAddress)) {
    return {
      category: CATEGORIES.FACTURAS,
      action: 'label',
      labelName: CATEGORY_LABELS[CATEGORIES.FACTURAS],
      reason: 'facturas',
      confidence: 'high',
    };
  }

  // 10. Servicios Tech
  if (SERVICIOS_TECH_EMAILS.includes(emailAddress)) {
    return {
      category: CATEGORIES.SERVICIOS_TECH,
      action: 'label',
      labelName: CATEGORY_LABELS[CATEGORIES.SERVICIOS_TECH],
      reason: 'servicios tech',
      confidence: 'high',
    };
  }

  // 11. Newsletters Tech
  if (NEWSLETTERS_TECH_EMAILS.includes(emailAddress)) {
    return {
      category: CATEGORIES.NEWSLETTERS_TECH,
      action: 'label',
      labelName: CATEGORY_LABELS[CATEGORIES.NEWSLETTERS_TECH],
      reason: 'newsletters tech',
      confidence: 'high',
    };
  }

  // 12. MFA/Seguridad
  if (MFA_EMAILS.includes(emailAddress) || containsKeyword(text, MFA_KEYWORDS)) {
    // Check age - delete if >15 days, otherwise keep temporarily
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    if (email.date < fifteenDaysAgo) {
      return {
        category: CATEGORIES.MFA_SEGURIDAD,
        action: 'delete',
        reason: 'mfa old',
        confidence: 'high',
      };
    }
    // Recent MFA - keep but don't label (temporary)
    return {
      category: CATEGORIES.MFA_SEGURIDAD,
      action: 'review',
      reason: 'mfa recent',
      confidence: 'medium',
    };
  }

  // 13. Social notifications
  if (SOCIAL_NOTIF_EMAILS.includes(emailAddress)) {
    return {
      category: CATEGORIES.NOTIFICACIONES_SOCIALES,
      action: 'delete',
      reason: 'social notifications',
      confidence: 'high',
    };
  }

  // 14. Publicidad (keywords)
  if (containsKeyword(text, PUBLICIDAD_KEYWORDS)) {
    // Check age - delete if >30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (email.date < thirtyDaysAgo) {
      return {
        category: CATEGORIES.PUBLICIDAD,
        action: 'delete',
        reason: 'publicidad old',
        confidence: 'medium',
      };
    }
  }

  // 15. Gmail SPAM label
  if (labels.includes('SPAM')) {
    return {
      category: CATEGORIES.BLACKLIST,
      action: 'delete',
      reason: 'gmail spam',
      confidence: 'high',
    };
  }

  // 16. Gmail PROMOTIONS label
  if (labels.includes('CATEGORY_PROMOTIONS')) {
    return {
      category: CATEGORIES.PUBLICIDAD,
      action: 'delete',
      reason: 'gmail promotions',
      confidence: 'medium',
    };
  }

  // 17. Sin categorizar
  return {
    category: CATEGORIES.SIN_CATEGORIZAR,
    action: 'review',
    reason: 'no match',
    confidence: 'low',
  };
}
