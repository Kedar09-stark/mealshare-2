import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken, API_BASE, getCurrentUser } from './auth';
import type { Donation, DonationRequest, Message } from '../App';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function fetchDonations(): Promise<Donation[]> {
  const res = await fetch(`${API_BASE}/api/donations/`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch donations');
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data) ? data : data.results ?? []).map((d: any) => ({
    id: String(d.id),
    hotelName: d.hotel_name ?? '',
    foodItems: d.food_items ?? '',
    quantity: d.quantity ?? '',
    category: d.category ?? '',
    expiryDate: d.expiry_date ?? '',
    location: d.location ?? { address: '', coordinates: { lat: 0, lng: 0 } },
    qualityScore: d.quality_score ?? 0,
    status: d.status ?? 'available',
    reservedBy: d.reserved_by_username ?? d.reserved_by ?? undefined,
    createdAt: d.created_at ?? '',
    imageUrl: d.image_url ?? '',
    rating: d.rating ?? undefined,
    ownerId: d.owner ?? undefined,
  }));
}

async function fetchDonationRequests(): Promise<DonationRequest[]> {
  const res = await fetch(`${API_BASE}/api/donations/requests/`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch donation requests');
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data) ? data : data.results ?? []).map((r: any) => ({
    id: String(r.id),
    ngoName: r.ngo_name ?? '',
    requestedItems: r.requested_items ?? '',
    quantity: r.quantity ?? '',
    urgency: r.urgency ?? 'medium',
    beneficiaries: r.beneficiaries ?? 0,
    purpose: r.purpose ?? '',
    location: r.location ?? '',
    createdAt: r.created_at ?? '',
    status: r.status ?? 'open',
    ngoId: r.ngo ?? undefined,
  }));
}

export function markMessagesAsRead(messageIds: string[]) {
  if (!messageIds.length) return;
  const readMessagesStr = localStorage.getItem('mealshare_read_messages') || '[]';
  const readMessages = new Set<string>();
  try { JSON.parse(readMessagesStr).forEach((id: string) => readMessages.add(id)); } catch {}
  
  let changed = false;
  messageIds.forEach(id => {
    if (!readMessages.has(id)) {
      readMessages.add(id);
      changed = true;
    }
  });
  
  if (changed) {
    localStorage.setItem('mealshare_read_messages', JSON.stringify(Array.from(readMessages)));
    window.dispatchEvent(new Event('messages_read_updated'));
  }
}

async function fetchMessages(): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/api/messages/`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch messages');
  const data = await res.json();
  
  const readMessagesStr = localStorage.getItem('mealshare_read_messages') || '[]';
  const readMessages = new Set<string>();
  try { JSON.parse(readMessagesStr).forEach((id: string) => readMessages.add(id)); } catch {}

  const currentUser = getCurrentUser();
  const myUsername = currentUser?.username ?? '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data) ? data : data.results ?? []).map((m: any) => {
    const id = String(m.id);
    const from = m.sender_name ?? m.sender ?? m.from ?? '';
    const isMine = from === myUsername;
    return {
      id,
      from,
      to: m.receiver_name ?? m.recipient ?? m.to ?? '',
      message: m.content ?? m.message ?? '',
      timestamp: m.timestamp ?? '',
      read: isMine || m.read || readMessages.has(id),
    };
  });
}

export interface NotificationData {
  donations: Donation[];
  donationRequests: DonationRequest[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useNotifications(enabled: boolean): NotificationData {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationRequests, setDonationRequests] = useState<DonationRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchAll = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const [d, r, m] = await Promise.allSettled([
        fetchDonations(),
        fetchDonationRequests(),
        fetchMessages(),
      ]);

      if (!isMounted.current) return;

      if (d.status === 'fulfilled') setDonations(d.value);
      if (r.status === 'fulfilled') setDonationRequests(r.value);
      if (m.status === 'fulfilled') setMessages(m.value);

      const firstError = [d, r, m].find(p => p.status === 'rejected') as PromiseRejectedResult | undefined;
      if (firstError) setError(String(firstError.reason));
    } catch (err) {
      if (isMounted.current) setError(String(err));
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    isMounted.current = true;
    if (!enabled) return;

    fetchAll();
    const timer = setInterval(fetchAll, POLL_INTERVAL_MS);
    
    const handleReadUpdated = () => fetchAll();
    window.addEventListener('messages_read_updated', handleReadUpdated);

    return () => {
      isMounted.current = false;
      clearInterval(timer);
      window.removeEventListener('messages_read_updated', handleReadUpdated);
    };
  }, [enabled, fetchAll]);

  return { donations, donationRequests, messages, isLoading, error, refresh: fetchAll };
}
