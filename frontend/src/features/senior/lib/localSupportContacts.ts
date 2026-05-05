import type { SeniorSupportContact } from '../types/senior';

export const CONTACTS_STORAGE = 'neurasense-senior-support-contacts';

const storageUserKey = (prefix: string, userId: string) => `${prefix}:${userId || 'anonymous'}`;

export function readStoredContacts(userId: string): SeniorSupportContact[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageUserKey(CONTACTS_STORAGE, userId)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredContacts(userId: string, contacts: SeniorSupportContact[]) {
  localStorage.setItem(storageUserKey(CONTACTS_STORAGE, userId), JSON.stringify(contacts));
}

export function mergeContacts(primary: SeniorSupportContact[], secondary: SeniorSupportContact[]) {
  const seen = new Set<string>();
  const merged: SeniorSupportContact[] = [];

  for (const contact of [...primary, ...secondary]) {
    const key = contact.id || contact.contact_phone;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(contact);
  }

  return merged;
}
