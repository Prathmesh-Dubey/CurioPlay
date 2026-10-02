/** The person behind CurioPlay — one place for every contact link in the app. */
export const CONTACT = {
  name: 'Prathmesh Dubey',
  role: 'Creator',
  email: 'prathmdubey217@gmail.com',
  /** Display form; the links below use the international number. */
  phone: '+91 93026 22997',
  phoneIntl: '+919302622997',
  whatsappIntl: '919302622997',
  github: 'https://github.com/Prathmesh-Dubey',
  linkedin: 'https://www.linkedin.com/in/prathmesh-dubey-19418b361/',
  instagram: 'https://www.instagram.com/prathm_dubey_/',
} as const;

export type ContactTopic =
  | 'admin-key'
  | 'bug'
  | 'login'
  | 'password'
  | 'signup'
  | 'profile'
  | 'scores'
  | 'experience'
  | 'other';

/** A pre-filled email to the creator. */
export function mailtoFor(subject: string, body = '') {
  const q = new URLSearchParams({ subject: `[CurioPlay] ${subject}` });
  if (body) q.set('body', body);
  // URLSearchParams encodes spaces as "+", which mail clients show literally.
  return `mailto:${CONTACT.email}?${q.toString().replace(/\+/g, '%20')}`;
}

/** A pre-filled WhatsApp chat with the creator. */
export function whatsappFor(text: string) {
  return `https://wa.me/${CONTACT.whatsappIntl}?text=${encodeURIComponent(`CurioPlay: ${text}`)}`;
}

/** In-app path to the contact page, optionally opened on one issue. */
export const contactPath = (topic?: ContactTopic) => (topic ? `/contact?topic=${topic}` : '/contact');
