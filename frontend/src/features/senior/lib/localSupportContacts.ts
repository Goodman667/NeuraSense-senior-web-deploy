import type { SeniorSupportContact } from '../types/senior';

export const CONTACTS_STORAGE = 'neurasense-senior-support-contacts';

const storageUserKey = (prefix: string, userId: string) => `${prefix}:${userId || 'anonymous'}`;

function readLegacyContacts(): SeniorSupportContact[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONTACTS_STORAGE) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readStoredContacts(userId: string): SeniorSupportContact[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageUserKey(CONTACTS_STORAGE, userId)) || '[]');
    const scoped = Array.isArray(parsed) ? parsed : [];
    return userId && userId !== 'anonymous' && !userId.startsWith('guest_')
      ? scoped
      : mergeContacts(scoped, readLegacyContacts());
  } catch {
    return userId && userId !== 'anonymous' && !userId.startsWith('guest_') ? [] : readLegacyContacts();
  }
}

export function writeStoredContacts(userId: string, contacts: SeniorSupportContact[]) {
  localStorage.setItem(storageUserKey(CONTACTS_STORAGE, userId), JSON.stringify(contacts));
}

export function mergeContacts(primary: SeniorSupportContact[], secondary: SeniorSupportContact[]) {
  const seen = new Set<string>();
  const merged: SeniorSupportContact[] = [];

  for (const contact of [...primary, ...secondary]) {
    // Same phone number = same person, whether it came from the server (with id) or local storage (without id).
    const key = (contact.contact_phone || '').replace(/[\s-]/g, '') || contact.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(contact);
  }

  return merged;
}
