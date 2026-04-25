import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, Bell, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import { Message } from '../../App';
import { API_BASE, getCurrentUser, authHeader } from '../../lib/auth';
import { getSocket } from '../../lib/socket';
import { getRoomName } from '../../lib/chat';
import { markMessagesAsRead } from '../../lib/useNotifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFingerprint(m: Message): string {
  const ts = Math.floor(new Date(m.timestamp).getTime() / 1000) * 1000;
  const [u1, u2] = [m.from, m.to].sort();
  return `${u1}|${u2}|${m.message}|${ts}`;
}

function sortByTime(msgs: Message[]): Message[] {
  return [...msgs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function mergeMessage(prev: Message[], incoming: Message, seen: Set<string>): Message[] {
  const isServerId = incoming.id && !incoming.id.startsWith('temp-');
  if (isServerId) {
    const existingIdx = prev.findIndex(x => x.id === incoming.id);
    if (existingIdx !== -1) {
      const existing = prev[existingIdx];
      // Replace if the incoming message has better name data (repaired)
      if ((existing.to === '' || existing.to === 'Unknown') && incoming.to && incoming.to !== 'Unknown') {
        const next = [...prev];
        next[existingIdx] = incoming;
        seen.add(getFingerprint(incoming));
        return sortByTime(next);
      }
      return prev;
    }
  }
  if (!incoming.id?.startsWith('temp-')) {
    const fp = getFingerprint(incoming);
    if (seen.has(fp)) return prev;
    seen.add(fp);
  }
  return sortByTime([...prev, incoming]);
}

function mergeMany(prev: Message[], incoming: Message[], seen: Set<string>): Message[] {
  let result = prev;
  for (const m of incoming) {
    result = mergeMessage(result, m, seen);
  }
  return result;
}

function mapServerMessage(d: any, myUsername: string): Message {
  let fromName = (d.sender_name ?? '').trim();
  let toName   = (d.receiver_name ?? '').trim();

  // ── Repair corrupted names using the room field ────────────────────────
  // Room is always chat_{u1}_{u2} (alphabetically sorted). Since the inbox
  // only returns rooms the current user participates in, we can reliably
  // reconstruct from/to even when old messages stored 'Unknown'.
  const BAD = (s: string) => !s || s === 'Unknown';
  if ((BAD(fromName) || BAD(toName)) && d.room) {
    const afterPrefix = (d.room as string).replace(/^chat_/, '');
    // Determine the "other" participant by stripping myUsername from the room string
    let other: string | null = null;
    if (afterPrefix.startsWith(myUsername + '_')) {
      other = afterPrefix.slice(myUsername.length + 1);
    } else if (afterPrefix.endsWith('_' + myUsername)) {
      other = afterPrefix.slice(0, afterPrefix.length - myUsername.length - 1);
    }
    if (other) {
      if (BAD(fromName) && BAD(toName)) {
        // Both unknown — can't tell direction; treat as inbound to current user
        fromName = other;
        toName   = myUsername;
      } else if (BAD(toName)) {
        // We know sender; receiver = the other participant
        toName = fromName === myUsername ? other : myUsername;
      } else if (BAD(fromName)) {
        // We know receiver; sender = the other participant
        fromName = toName === myUsername ? other : myUsername;
      }
    }
  }

  return {
    id: d.id?.toString() ?? `srv-${Date.now()}`,
    from: fromName,
    to:   toName,
    message: d.content ?? '',
    timestamp: d.timestamp ?? new Date().toISOString(),
    read: false,
  };
}

// ─── Module-level receiver-id cache so we don't re-fetch on every send ────────
const _receiverIdCache = new Map<string, number>();

async function resolveReceiverId(username: string): Promise<number | undefined> {
  if (_receiverIdCache.has(username)) return _receiverIdCache.get(username);
  try {
    const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}/`, {
      headers: authHeader() as Record<string, string>,
    });
    if (res.ok) {
      const d = await res.json();
      const id: number | undefined = d.user?.id;
      if (id) _receiverIdCache.set(username, id);
      return id;
    }
  } catch {
    // non-blocking — continue without receiver_id
  }
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface MessagesViewProps {
  messages: Message[];
  addMessage: (message: Message) => void;
  viewerType?: 'ngo' | 'hotel';
}

const STORAGE_KEY = 'messages:selectedConversation';
const ACTIVE_POLL_MS  = 30_000;  // Fallback poll every 30s (sockets handle real-time)
const INBOX_POLL_MS   = 60_000;  // Fallback inbox poll every 60s

export function MessagesView({ messages, addMessage, viewerType = 'ngo' }: MessagesViewProps) {
  const user = getCurrentUser();
  const myUsername = user?.username ?? '';

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedConversation, setSelectedConversation] = useState<string | null>(() => {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>(() => messages ?? []);
  const [newMessagePartners, setNewMessagePartners] = useState<Set<string>>(new Set());

  // ── Refs ───────────────────────────────────────────────────────────────────
  const socketRef       = useRef<Socket | null>(null);
  const selectedRef     = useRef<string | null>(selectedConversation);
  const seenFPRef       = useRef<Set<string>>(new Set());
  const joinedRoomsRef  = useRef<Set<string>>(new Set());
  const sendLockRef     = useRef<number>(0);
  const threadEndRef    = useRef<HTMLDivElement | null>(null);
  const notifTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const inboxPollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { selectedRef.current = selectedConversation; }, [selectedConversation]);

  // ── Mark messages as read when viewing a conversation ──────────────────────
  useEffect(() => {
    if (selectedConversation) {
      const messagesToMark = localMessages
        .filter(m => m.from === selectedConversation && m.to === myUsername && !m.read)
        .map(m => String(m.id));
      
      if (messagesToMark.length > 0) {
        markMessagesAsRead(messagesToMark);
        setLocalMessages(prev => prev.map(m => 
          messagesToMark.includes(String(m.id)) ? { ...m, read: true } : m
        ));
      }
    }
  }, [selectedConversation, localMessages, myUsername]);

  // ── Stable conversation selector ──────────────────────────────────────────
  const selectConversation = useCallback((partner: string | null) => {
    selectedRef.current = partner;
    setSelectedConversation(partner);
    if (partner) {
      try { sessionStorage.setItem(STORAGE_KEY, partner); } catch {}
      setNewMessagePartners(prev => { const s = new Set(prev); s.delete(partner); return s; });
    } else {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, []);

  // ── Fetch a room's full history and merge ─────────────────────────────────
  const fetchRoomHistory = useCallback(async (partner: string) => {
    if (!myUsername) return;
    const room = getRoomName(myUsername, partner);
    try {
      const res = await fetch(
        `${API_BASE}/api/messages/?room=${encodeURIComponent(room)}`,
        { headers: { 'Content-Type': 'application/json', ...(authHeader() as any) } },
      );
      if (!res.ok) return;
      const data: any[] = await res.json();
      const mapped = data.map(d => mapServerMessage(d, myUsername));
      setLocalMessages(prev => mergeMany(prev, mapped, seenFPRef.current));
    } catch (e) {
      console.warn('[history] fetch error', e);
    }
  }, [myUsername]);

  // ── Fetch inbox (all latest messages) ─────────────────────────────────────
  const fetchInbox = useCallback(async () => {
    if (!myUsername) return;
    try {
      const res = await fetch(`${API_BASE}/api/messages/`, {
        headers: { 'Content-Type': 'application/json', ...(authHeader() as any) },
      });
      if (!res.ok) return;
      const data: any[] = await res.json();
      const mapped = data.map(d => mapServerMessage(d, myUsername));
      setLocalMessages(prev => mergeMany(prev, mapped, seenFPRef.current));
    } catch (e) {
      console.warn('[inbox] fetch error', e);
    }
  }, [myUsername]);

  // ── Seed from props on first render + start inbox polling ─────────────────
  useEffect(() => {
    (messages ?? []).forEach(m => seenFPRef.current.add(getFingerprint(m)));
    setLocalMessages(messages ?? []);
    fetchInbox();

    inboxPollRef.current = setInterval(fetchInbox, INBOX_POLL_MS);
    return () => {
      if (inboxPollRef.current) clearInterval(inboxPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket: attach once ───────────────────────────────────────────────────
  useEffect(() => {
    if (!myUsername) return;
    const socket = getSocket();
    socketRef.current = socket;

    const rejoinAll = () => {
      joinedRoomsRef.current.forEach(room => {
        console.debug('[socket] re-joining', room);
        socket.emit('join', { room });
      });
    };

    const onMessage = (payload: any) => {
      const senderName   = payload.sender_name   ?? '';
      const receiverName = payload.receiver_name ?? '';

      // Accept the message if this user is either the sender or receiver
      if (senderName !== myUsername && receiverName !== myUsername) return;
      // Skip completely anonymous messages (shouldn't happen with fixed backend)
      if (!senderName && !receiverName) return;

      const serverId = payload.id?.toString();
      const partner  = senderName === myUsername ? receiverName : senderName;

      const serverMsg: Message = {
        id:        serverId ?? `sock-${Date.now()}`,
        from:      senderName,
        to:        receiverName,
        message:   payload.content ?? '',
        timestamp: payload.timestamp ?? new Date().toISOString(),
        read:      senderName === myUsername,
      };

      setLocalMessages(prev => {
        // Replace matching optimistic temp message
        const tempIndex = prev.findIndex(x =>
          x.id?.startsWith('temp-') &&
          x.message === payload.content &&
          x.from === senderName &&
          x.to === receiverName
        );

        if (serverId && prev.some(x => x.id === serverId)) {
          if (tempIndex !== -1) {
            const next = [...prev];
            next.splice(tempIndex, 1);
            return sortByTime(next);
          }
          return prev;
        }

        if (tempIndex !== -1) {
          const next = [...prev];
          const oldTemp = next[tempIndex];
          seenFPRef.current.delete(getFingerprint(oldTemp));
          next[tempIndex] = serverMsg;
          seenFPRef.current.add(getFingerprint(serverMsg));
          return sortByTime(next);
        }

        return mergeMessage(prev, serverMsg, seenFPRef.current);
      });

      // Notify if this is an incoming message from someone else
      if (receiverName === myUsername && partner && partner !== selectedRef.current) {
        setNewMessagePartners(prev => new Set([...prev, partner]));
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        notifTimerRef.current = setTimeout(() => {
          setNewMessagePartners(prev => { const s = new Set(prev); s.delete(partner); return s; });
        }, 4000);
      }

      // Auto-open if no conversation is selected and message is incoming
      if (!selectedRef.current && receiverName === myUsername && partner) {
        selectConversation(partner);
      }
    };

    socket.on('connect', rejoinAll);
    socket.on('message', onMessage);

    return () => {
      socket.off('connect', rejoinAll);
      socket.off('message', onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername]);

  // ── Join room + start active poll when conversation changes ───────────────
  useEffect(() => {
    // Clear previous active poll
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }

    const socket = socketRef.current;
    if (!selectedConversation || !myUsername) return;

    const room = getRoomName(myUsername, selectedConversation);

    // Join this room if not already joined
    if (socket && !joinedRoomsRef.current.has(room)) {
      socket.emit('join', { room });
      joinedRoomsRef.current.add(room);
    }

    // Fetch history immediately then poll every ACTIVE_POLL_MS
    fetchRoomHistory(selectedConversation);
    pollTimerRef.current = setInterval(() => fetchRoomHistory(selectedConversation), ACTIVE_POLL_MS);

    return () => {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    };
  }, [selectedConversation, myUsername, fetchRoomHistory]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, selectedConversation]);

  // ── Derived: conversation map ─────────────────────────────────────────────
  const conversations = localMessages.reduce<Record<string, Message[]>>((acc, msg) => {
    if (!msg.from || !msg.to) return acc;
    let partner: string;
    if (msg.from === myUsername)      partner = msg.to;
    else if (msg.to === myUsername)   partner = msg.from;
    else                               return acc;

    const p = String(partner ?? '').trim();
    // Skip empty or still-corrupted partner names
    if (!p || p === 'Unknown') return acc;
    (acc[p] ??= []).push(msg);
    return acc;
  }, {});

  Object.values(conversations).forEach(msgs =>
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  );

  const filteredPartners = Object.keys(conversations)
    .filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aLast = conversations[a].at(-1)!;
      const bLast = conversations[b].at(-1)!;
      return new Date(bLast.timestamp).getTime() - new Date(aLast.timestamp).getTime();
    });

  const unreadCount = (partner: string) =>
    conversations[partner]?.filter(m => !m.read && m.to === myUsername).length ?? 0;

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    const now = Date.now();
    if (now - sendLockRef.current < 700) return;
    sendLockRef.current = now;

    const socket = socketRef.current ?? getSocket();
    if (!socket?.connected) {
      toast.error('Not connected — please wait a moment and try again.');
      return;
    }

    const receiverName = selectedConversation;
    const room = getRoomName(myUsername, receiverName);
    const content = newMessage.trim();

    // Optimistic update immediately (non-blocking)
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const ts = new Date().toISOString();
    const optimistic: Message = {
      id: tempId, from: myUsername, to: receiverName,
      message: content, timestamp: ts, read: true,
    };
    seenFPRef.current.add(getFingerprint(optimistic));
    setLocalMessages(prev => mergeMessage(prev, optimistic, seenFPRef.current));
    try { addMessage(optimistic); } catch {}
    setNewMessage('');

    // Join the room if not already in it (ensures we receive the echo)
    if (!joinedRoomsRef.current.has(room)) {
      socket.emit('join', { room });
      joinedRoomsRef.current.add(room);
    }

    // Resolve receiver ID in background (non-blocking) — improves DB FK linkage
    const receiverId = await resolveReceiverId(receiverName).catch(() => undefined);

    socket.emit(
      'send_message',
      {
        room,
        sender_id:     user?.id,
        sender_name:   myUsername,
        receiver_id:   receiverId,
        receiver_name: receiverName,   // always set — never left undefined
        content,
      },
      (ack: any) => {
        if (!ack?.ok) {
          toast.error('Message delivery failed — retrying via HTTP...');
          // Remove the failed optimistic message
          setLocalMessages(prev => prev.filter(x => x.id !== tempId));
          return;
        }

        toast.success('Sent!');
        const serverId = ack.id?.toString() ?? null;
        const serverTs = ack.timestamp ?? null;

        if (!serverId) return;

        setLocalMessages(prev => {
          if (prev.some(x => x.id === serverId)) {
            return prev.filter(x => x.id !== tempId);
          }
          return sortByTime(prev.map(x => {
            if (x.id !== tempId) return x;
            const updated = { ...x, id: serverId, timestamp: serverTs ?? x.timestamp };
            seenFPRef.current.delete(getFingerprint(x));
            seenFPRef.current.add(getFingerprint(updated));
            return updated;
          }));
        });
      }
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const conversationList = (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Conversations</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <ScrollArea className="flex-1 min-h-0">
        <CardContent className="space-y-2 pt-0">
          {filteredPartners.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No conversations yet</p>
          ) : (
            filteredPartners.map((partner, index) => {
              const unread      = unreadCount(partner);
              const lastMessage = conversations[partner].at(-1)!;
              return (
                <button
                  key={`${partner}-${index}`}
                  onClick={() => selectConversation(partner)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedConversation === partner
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-teal-600 text-white">
                        {partner.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <p className="font-medium truncate">{partner}</p>
                          {newMessagePartners.has(partner) && (
                            <Bell className="h-4 w-4 text-red-500 flex-shrink-0 animate-bounce" />
                          )}
                        </div>
                        {unread > 0 && (
                          <Badge className="bg-orange-600 text-white ml-2">{unread}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{lastMessage.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(lastMessage.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );

  const chatPanel = selectedConversation ? (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden -ml-2 flex-shrink-0"
            onClick={() => selectConversation(null)}
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar>
            <AvatarFallback className="bg-teal-600 text-white">
              {selectedConversation.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{selectedConversation}</CardTitle>
            <CardDescription>
              {viewerType === 'hotel' ? 'NGO Partner' : 'Hotel Partner'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-4">
          {(conversations[selectedConversation] ?? []).map((msg, index) => {
            const isMe        = msg.from === myUsername;
            const senderLabel = viewerType === 'hotel'
              ? (isMe ? 'You (Hotel)' : `${msg.from} (NGO)`)
              : (isMe ? 'You (NGO)'   : `${msg.from} (Hotel)`);
            return (
              <div
                key={msg.id ?? `${msg.timestamp}-${index}`}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                  <p className={`text-xs font-semibold mb-1 ${isMe ? 'text-right text-teal-600' : 'text-left text-orange-600'}`}>
                    {senderLabel}
                  </p>
                  <div className={`p-3 rounded-lg ${
                    isMe
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : 'bg-orange-100 text-gray-900 rounded-bl-none'
                  }`}>
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  <p className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={el => { threadEndRef.current = el; }} />
        </div>
      </ScrollArea>

      <CardContent className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={2}
            className="resize-none"
          />
          <Button onClick={handleSendMessage} className="bg-teal-600 hover:bg-teal-700">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card className="flex flex-col h-full">
      <CardContent className="flex items-center justify-center h-full text-center text-gray-500">
        <div>
          <p className="mb-2">Select a conversation to view messages</p>
          <p className="text-sm">Or start a new conversation from a donation listing</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="absolute inset-0 p-4 sm:p-6 lg:p-8 flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <h1>Messages</h1>
        <p className="text-muted-foreground">
          {viewerType === 'hotel'
            ? 'Communicate with NGOs about donations'
            : 'Communicate with hotels about donations'}
        </p>
      </div>

      {/* ── Desktop: side-by-side ── */}
      <div className="hidden md:grid md:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="md:col-span-1 min-h-0 flex flex-col">{conversationList}</div>
        <div className="md:col-span-2 min-h-0 flex flex-col">{chatPanel}</div>
      </div>

      {/* ── Mobile: Instagram-style full-screen panels ── */}
      <div className="md:hidden flex-1 min-h-0 flex flex-col">
        <div className={`flex-1 min-h-0 flex-col ${selectedConversation ? 'hidden' : 'flex'}`}>
          {conversationList}
        </div>
        <div className={`flex-1 min-h-0 flex-col ${selectedConversation ? 'flex' : 'hidden'}`}>
          {chatPanel}
        </div>
      </div>
    </div>
  );
}