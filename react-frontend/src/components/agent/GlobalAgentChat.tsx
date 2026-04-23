import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  X,
  Minus,
  Bot,
  Loader2,
  AlertTriangle,
  CalendarCheck,
  BarChart3,
  Globe,
  HelpCircle,
  DoorOpen,
  ClipboardList,
  Sparkles,
  History,
  Plus,
  Trash2,
  ArrowLeft,
  MessageSquare,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useIntelligentAgent, useProactiveAlerts } from '@/hooks/useIntelligentAgent';
import { useAuth } from '@/hooks/useAuth';
import { AgentIntroductionPopup } from './AgentIntroductionPopup';
import { AgentProactiveToast } from './AgentProactiveToast';
import { EnhancedAgentButton } from './EnhancedAgentButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: string; // ISO string pour sérialisation JSON
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface SuggestionCard {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  prompt: string;
}

type View = 'chat' | 'history';

interface GlobalAgentChatProps {
  currentPage?: string;
  pageContext?: Record<string, any>;
  className?: string;
}

// ─── Action parsing ───────────────────────────────────────────────────────────

const ACTION_REGEX = /\[ACTION:\s*([^\]]+)\]/g;

interface ParsedAction {
  type: 'text' | 'action';
  content?: string;
  action?: string;
  id?: string;
  label?: string;
}

function parseMessageWithActions(content: string): ParsedAction[] {
  const parts: ParsedAction[] = [];
  const regex = /\[ACTION:\s*([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    const raw = match[1].trim(); // e.g. "confirm:123" or "confirm:123|Confirmer"
    const pipeIdx = raw.indexOf('|');
    const actionPart = pipeIdx >= 0 ? raw.slice(0, pipeIdx).trim() : raw;
    const customLabel = pipeIdx >= 0 ? raw.slice(pipeIdx + 1).trim() : undefined;
    const colonIdx = actionPart.indexOf(':');
    const action = colonIdx >= 0 ? actionPart.slice(0, colonIdx) : actionPart;
    const id = colonIdx >= 0 ? actionPart.slice(colonIdx + 1) : '';
    parts.push({ type: 'action', action, id, label: customLabel });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  confirm:  { label: 'Confirmer',  color: 'bg-emerald-600 hover:bg-emerald-700 text-white', icon: <CheckCircle className="w-3 h-3" /> },
  cancel:   { label: 'Annuler',    color: 'bg-red-500 hover:bg-red-600 text-white',          icon: <XCircle className="w-3 h-3" /> },
  checkin:  { label: 'Check-in',   color: 'bg-blue-600 hover:bg-blue-700 text-white',        icon: <LogIn className="w-3 h-3" /> },
  checkout: { label: 'Check-out',  color: 'bg-amber-500 hover:bg-amber-600 text-white',      icon: <LogOut className="w-3 h-3" /> },
  navigate: { label: 'Ouvrir',     color: 'bg-violet-600 hover:bg-violet-700 text-white',    icon: <ExternalLink className="w-3 h-3" /> },
};

// ─── Suggestions ─────────────────────────────────────────────────────────────

const SUGGESTION_CARDS: Record<string, SuggestionCard[]> = {
  booking: [
    { icon: <CalendarCheck className="w-4 h-4" />, title: 'Check-ins du jour',       subtitle: 'Voir les arrivées prévues',      prompt: "Quels sont mes check-ins prévus aujourd'hui ?" },
    { icon: <DoorOpen     className="w-4 h-4" />, title: 'Check-outs du jour',       subtitle: 'Voir les départs prévus',        prompt: "Quels sont mes check-outs prévus aujourd'hui ?" },
    { icon: <ClipboardList className="w-4 h-4"/>, title: 'Réservations en attente',  subtitle: 'Confirmer ou annuler',           prompt: "Montre-moi les réservations en attente de confirmation." },
    { icon: <BarChart3    className="w-4 h-4" />, title: 'Revenus ce mois',          subtitle: 'Synthèse financière',            prompt: "Quel est le résumé de mes revenus ce mois-ci ?" },
  ],
  dashboard: [
    { icon: <BarChart3    className="w-4 h-4" />, title: 'Résumé du jour',           subtitle: 'Activité & performances',        prompt: "Donne-moi un résumé de mon activité aujourd'hui." },
    { icon: <CalendarCheck className="w-4 h-4"/>, title: 'Réservations',             subtitle: 'État des arrivées',              prompt: "Quelles réservations dois-je traiter aujourd'hui ?" },
    { icon: <Globe        className="w-4 h-4" />, title: 'Mon site web',             subtitle: 'Statut & optimisations',         prompt: "Quel est l'état de mon site web ?" },
    { icon: <HelpCircle   className="w-4 h-4" />, title: 'Comment démarrer',        subtitle: 'Guide rapide',                   prompt: "Explique-moi comment bien démarrer sur Pixel Rise." },
  ],
  'site-builder': [
    { icon: <Globe        className="w-4 h-4" />, title: 'Optimiser mon site',       subtitle: 'Conseils personnalisés',         prompt: "Comment puis-je améliorer mon site web ?" },
    { icon: <Sparkles     className="w-4 h-4" />, title: 'Générer du contenu',       subtitle: 'Textes & sections',              prompt: "Aide-moi à rédiger du contenu pour mon site." },
    { icon: <BarChart3    className="w-4 h-4" />, title: 'SEO & visibilité',         subtitle: 'Référencement naturel',          prompt: "Que faire pour améliorer le référencement de mon site ?" },
    { icon: <HelpCircle   className="w-4 h-4" />, title: 'Aide éditeur',            subtitle: 'Tutoriel sections',              prompt: "Comment fonctionne l'éditeur de sections ?" },
  ],
};

const DEFAULT_CARDS: SuggestionCard[] = [
  { icon: <CalendarCheck className="w-4 h-4" />, title: 'Réservations',    subtitle: 'État et actions du jour', prompt: "Quelles réservations dois-je traiter aujourd'hui ?" },
  { icon: <BarChart3    className="w-4 h-4"  />, title: 'Performances',    subtitle: 'Revenus & occupation',    prompt: "Donne-moi un résumé de mes performances récentes." },
  { icon: <Globe        className="w-4 h-4"  />, title: 'Mon site web',    subtitle: 'Statut & publication',    prompt: "Quel est l'état de mon site web ?" },
  { icon: <HelpCircle   className="w-4 h-4"  />, title: 'Aide',           subtitle: 'Comment ça fonctionne ?', prompt: "Explique-moi les fonctionnalités disponibles." },
];

// ─── Helpers storage ──────────────────────────────────────────────────────────

const MAX_CONVERSATIONS = 50;

function genId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeTitle(firstUserMessage: string): string {
  return firstUserMessage.length > 45
    ? firstUserMessage.slice(0, 42) + '…'
    : firstUserMessage;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui · " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Composant ────────────────────────────────────────────────────────────────

export const GlobalAgentChat: React.FC<GlobalAgentChatProps> = ({
  currentPage = 'dashboard',
  pageContext = {},
  className = '',
}) => {
  const { user } = useAuth();

  // ── Clé de stockage par utilisateur ──────────────────────────────────────
  const convKey = `pixelrise-conversations-${user?.id ?? 'guest'}`;

  // ── Fonctions localStorage ────────────────────────────────────────────────

  const loadConversations = useCallback((): Conversation[] => {
    try {
      const raw = localStorage.getItem(convKey);
      if (!raw) return [];
      return JSON.parse(raw) as Conversation[];
    } catch { return []; }
  }, [convKey]);

  const persistConversations = useCallback((convs: Conversation[]) => {
    try {
      localStorage.setItem(convKey, JSON.stringify(convs.slice(-MAX_CONVERSATIONS)));
    } catch {}
  }, [convKey]);

  // ── État principal ────────────────────────────────────────────────────────

  const [isOpen, setIsOpen]         = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [view, setView]             = useState<View>('chat');
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [currentId, setCurrentId]   = useState<string | null>(() => {
    const convs = loadConversations();
    return convs.length > 0 ? convs[convs.length - 1].id : null;
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping]     = useState(false);

  // Intro popup
  const [showIntroPopup, setShowIntroPopup] = useState(false);
  const [isFirstVisit, setIsFirstVisit]     = useState(true);

  // Drag
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition]     = useState(() => {
    const saved = localStorage.getItem('pixelrise-agent-position');
    if (saved) return JSON.parse(saved);
    return { x: Math.max(50, window.innerWidth - 440), y: Math.max(50, window.innerHeight - 660) };
  });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const navigate = useNavigate();

  // Agent hooks
  const { sendMessage, canSendMessage } = useIntelligentAgent();
  const { alerts: proactiveAlerts, executeAction: doProactiveAction, dismiss: dismissAlert } = useProactiveAlerts();
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // ── Conversation courante ─────────────────────────────────────────────────

  const currentConversation = useMemo(
    () => conversations.find(c => c.id === currentId) ?? null,
    [conversations, currentId]
  );

  const messages = currentConversation?.messages ?? [];
  const hasConversation = messages.length > 0;
  const cards = SUGGESTION_CARDS[currentPage] ?? DEFAULT_CARDS;
  const userName = (user?.name ?? 'vous').split(' ')[0];

  // ── Persistance automatique ───────────────────────────────────────────────

  useEffect(() => {
    persistConversations(conversations);
  }, [conversations, persistConversations]);

  // ── Scroll ───────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !isMinimized && view === 'chat') {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, view]);

  // ── Intro popup ───────────────────────────────────────────────────────────

  useEffect(() => {
    const seen = localStorage.getItem('pixelrise-agent-intro-seen');
    if (!seen) {
      const t = setTimeout(() => setShowIntroPopup(true), 3000);
      return () => clearTimeout(t);
    } else {
      setIsFirstVisit(false);
    }
  }, []);

  // ── Drag ─────────────────────────────────────────────────────────────────

  const savePosition = (p: { x: number; y: number }) =>
    localStorage.setItem('pixelrise-agent-position', JSON.stringify(p));

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent) => setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x)),
      y: Math.max(0, Math.min(window.innerHeight - 600, e.clientY - dragOffset.y)),
    });
    const up = () => { setIsDragging(false); savePosition(position); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragOffset, position]);

  // ── Gestion des conversations ─────────────────────────────────────────────

  const startNewConversation = useCallback(() => {
    const newId = genId();
    const newConv: Conversation = {
      id: newId,
      title: 'Nouvelle conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations(prev => [...prev, newConv]);
    setCurrentId(newId);
    setView('chat');
  }, []);

  const loadConversation = useCallback((id: string) => {
    setCurrentId(id);
    setView('chat');
  }, []);

  const deleteConversation = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (id === currentId) {
        setCurrentId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  }, [currentId]);

  const addMessageToConversation = useCallback((
    convId: string,
    msg: ChatMessage,
    firstUserMsg?: string
  ) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      const isFirstMsg = c.messages.length === 0 && firstUserMsg;
      return {
        ...c,
        title: isFirstMsg ? makeTitle(firstUserMsg!) : c.title,
        messages: [...c.messages, msg],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  // ── Envoi de message ──────────────────────────────────────────────────────

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? inputMessage).trim();
    if (!msg || !canSendMessage || isTyping) return;

    // Créer une conv si aucune n'existe
    let convId = currentId;
    if (!convId) {
      const newId = genId();
      const newConv: Conversation = {
        id: newId, title: makeTitle(msg),
        messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      setConversations(prev => [...prev, newConv]);
      setCurrentId(newId);
      convId = newId;
    }

    const isFirstInConv = messages.length === 0;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`, type: 'user', content: msg,
      timestamp: new Date().toISOString(),
    };
    addMessageToConversation(convId, userMsg, isFirstInConv ? msg : undefined);
    setInputMessage('');
    setIsTyping(true);

    try {
      const res = await sendMessage(msg, { page: currentPage, ...pageContext, timestamp: new Date().toISOString() });
      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`, type: 'agent',
        content: res.success ? (res.response || 'Je vous ai bien compris.') : (res.error || 'Une erreur est survenue.'),
        timestamp: new Date().toISOString(),
      };
      addMessageToConversation(convId, agentMsg);
    } catch {
      addMessageToConversation(convId, {
        id: `e-${Date.now()}`, type: 'agent',
        content: 'Erreur de connexion. Réessayez.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  }, [inputMessage, canSendMessage, isTyping, currentId, messages.length, addMessageToConversation, sendMessage, currentPage, pageContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Proactive actions ─────────────────────────────────────────────────────

  const handleProactiveAction = useCallback(async (action: string, reservationId: number) => {
    const key = `${action}_${reservationId}`;
    setExecutingAction(key);
    await doProactiveAction(action, reservationId);
    setExecutingAction(null);
  }, [doProactiveAction]);

  // ── Chat inline actions ───────────────────────────────────────────────────

  const handleChatAction = useCallback(async (action: string, id: string) => {
    const key = `${action}_${id}`;
    setExecutingAction(key);
    try {
      if (action === 'navigate') {
        navigate(id);
        setExecutingAction(null);
        return;
      }
      // Reservation actions: confirm / cancel / checkin / checkout
      await doProactiveAction(action, Number(id));
    } finally {
      setExecutingAction(null);
    }
  }, [doProactiveAction, navigate]);

  // ── Intro handlers ────────────────────────────────────────────────────────

  const handleIntroClose = () => {
    setShowIntroPopup(false);
    localStorage.setItem('pixelrise-agent-intro-seen', 'true');
    setIsFirstVisit(false);
  };
  const handleIntroStartChat = () => { handleIntroClose(); setIsOpen(true); };

  // ─────────────────────────────────────────────────────────────────────────
  // CLOSED STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (!isOpen) {
    return (
      <>
        <AgentIntroductionPopup isVisible={showIntroPopup} onClose={handleIntroClose}
          onStartChat={handleIntroStartChat} currentPage={currentPage} userName={user?.name ?? 'Utilisateur'} />
        <AgentProactiveToast currentPage={currentPage} pageContext={pageContext} onOpenChat={() => setIsOpen(true)} />

        {proactiveAlerts.filter(a => a.level === 'urgent' || a.level === 'warning').slice(0, 1).map(alert => (
          <div key={alert.id} className={`fixed z-40 bottom-24 right-6 max-w-xs rounded-xl shadow-lg border text-xs p-3 ${alert.level === 'urgent' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.level === 'urgent' ? 'text-red-500' : 'text-amber-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{alert.title}</p>
                <p className="text-gray-600 mt-0.5 leading-snug">{alert.message}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {alert.actions.map(a => (
                    <Button key={a.action} size="sm" variant="outline" className="h-6 text-[10px] px-2"
                      disabled={executingAction === `${a.action}_${a.id}`}
                      onClick={() => handleProactiveAction(a.action, a.id)}>
                      {executingAction === `${a.action}_${a.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : a.label}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1 text-gray-400" onClick={() => dismissAlert(alert.id)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className={`fixed z-50 ${className}`} style={{ left: `${position.x + 340}px`, top: `${position.y + 580}px` }}>
          <EnhancedAgentButton onClick={() => setIsOpen(true)} isActive={false}
            hasUnreadSuggestions={!isFirstVisit || proactiveAlerts.length > 0}
            agentStatus={isTyping ? 'thinking' : 'active'} />
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OPEN STATE
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className={`fixed z-50 ${className} ${isDragging ? 'scale-[1.01]' : ''} transition-transform duration-100`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className={`flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-200 ${isMinimized ? 'w-80 h-[60px]' : 'w-[400px] h-[600px]'}`}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 shrink-0 select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2.5">
            {view === 'history' ? (
              <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/20 transition-colors"
                onClick={() => setView('chat')} onMouseDown={e => e.stopPropagation()}>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white leading-none">
                {view === 'history' ? 'Historique' : 'PIXEL'}
              </p>
              <p className="text-[10px] text-white/70 mt-0.5">
                {view === 'history'
                  ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
                  : 'Assistant IA · En ligne'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
            {/* Bouton historique */}
            <button
              className={`relative flex items-center gap-1 px-2 h-7 rounded-lg transition-colors text-xs font-medium ${view === 'history' ? 'bg-white/30 text-white' : 'text-white/80 hover:bg-white/20'}`}
              onClick={() => setView(v => v === 'history' ? 'chat' : 'history')}
              title="Historique des conversations"
            >
              <History className="w-3.5 h-3.5" />
              {conversations.length > 0 && (
                <span className="bg-white/30 text-white text-[9px] font-bold px-1 rounded-full">{conversations.length}</span>
              )}
            </button>
            {/* Nouvelle conversation */}
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/20 transition-colors"
              onClick={startNewConversation}
              title="Nouvelle conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
            {/* Minimiser */}
            <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/20 transition-colors"
              onClick={() => setIsMinimized(v => !v)}>
              <Minus className="w-4 h-4" />
            </button>
            {/* Fermer */}
            <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/20 transition-colors"
              onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* ── Alertes proactives (uniquement en vue chat) ───────────── */}
            {view === 'chat' && proactiveAlerts.length > 0 && (
              <div className="shrink-0 border-b overflow-y-auto max-h-28">
                {proactiveAlerts.map(alert => (
                  <div key={alert.id} className={`px-3 py-2 flex items-start gap-2 text-xs border-l-2 ${alert.level === 'urgent' ? 'bg-red-50 border-l-red-500' : alert.level === 'warning' ? 'bg-amber-50 border-l-amber-500' : 'bg-blue-50 border-l-blue-400'}`}>
                    <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${alert.level === 'urgent' ? 'text-red-500' : alert.level === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 leading-tight">{alert.title}</p>
                      <p className="text-gray-500 mt-0.5">{alert.message}</p>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {alert.actions.map(a => (
                          <Button key={a.action} size="sm" variant="outline" className="h-5 text-[10px] px-1.5 py-0"
                            disabled={executingAction === `${a.action}_${a.id}`}
                            onClick={() => handleProactiveAction(a.action, a.id)}>
                            {executingAction === `${a.action}_${a.id}` ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : a.label}
                          </Button>
                        ))}
                        <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1 py-0 text-gray-400" onClick={() => dismissAlert(alert.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                VUE HISTORIQUE
            ══════════════════════════════════════════════════════════════ */}
            {view === 'history' && (
              <div className="flex-1 overflow-y-auto min-h-0">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                    <MessageSquare className="w-10 h-10 opacity-30" />
                    <p className="text-sm">Aucune conversation</p>
                    <button
                      onClick={startNewConversation}
                      className="text-xs text-violet-600 hover:underline"
                    >
                      Démarrer une nouvelle conversation
                    </button>
                  </div>
                ) : (
                  <div className="p-3 space-y-1.5">
                    {/* Tri par date décroissante */}
                    {[...conversations].reverse().map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                          conv.id === currentId
                            ? 'bg-violet-50 border border-violet-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        {/* Icône */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${conv.id === currentId ? 'bg-violet-100' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                          <MessageSquare className={`w-4 h-4 ${conv.id === currentId ? 'text-violet-600' : 'text-gray-500'}`} />
                        </div>

                        {/* Titre + date + preview */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs font-semibold truncate ${conv.id === currentId ? 'text-violet-700' : 'text-gray-800'}`}>
                              {conv.title}
                            </p>
                            {conv.id === currentId && (
                              <span className="text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full shrink-0">En cours</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(conv.updatedAt)}</p>
                          {conv.messages.length > 0 && (
                            <p className="text-[10px] text-gray-500 truncate mt-0.5">
                              {conv.messages[conv.messages.length - 1].content}
                            </p>
                          )}
                        </div>

                        {/* Bouton supprimer */}
                        <button
                          onClick={e => deleteConversation(conv.id, e)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 text-gray-400 transition-all shrink-0 mt-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                VUE CHAT
            ══════════════════════════════════════════════════════════════ */}
            {view === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto min-h-0">
                  {!hasConversation ? (
                    /* Welcome screen */
                    <div className="flex flex-col h-full px-5 pt-7 pb-4">
                      <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg mb-3">
                          <Bot className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Bonjour {userName} 👋</h2>
                        <p className="text-sm text-gray-500 mt-1 leading-snug">
                          Je suis PIXEL, votre assistant IA.<br />Comment puis-je vous aider ?
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {cards.map((card, i) => (
                          <button key={i} onClick={() => handleSend(card.prompt)}
                            className="text-left p-3 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all duration-150 group">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-violet-100 flex items-center justify-center mb-2 text-gray-500 group-hover:text-violet-600 transition-colors">
                              {card.icon}
                            </div>
                            <p className="text-xs font-semibold text-gray-800 leading-tight">{card.title}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{card.subtitle}</p>
                          </button>
                        ))}
                      </div>

                      {/* Conversations récentes */}
                      {conversations.length > 0 && (
                        <div className="mt-5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Conversations récentes</p>
                            <button
                              onClick={() => setView('history')}
                              className="text-[10px] text-violet-600 hover:text-violet-800 font-medium"
                            >
                              Voir tout →
                            </button>
                          </div>
                          <div className="flex flex-col gap-1">
                            {conversations.slice(-3).reverse().map(conv => (
                              <button key={conv.id}
                                onClick={() => { setCurrentId(conv.id); }}
                                className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                              >
                                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                                  <MessageSquare className="w-3 h-3 text-violet-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-700 truncate">{conv.title}</p>
                                  <p className="text-[10px] text-gray-400">{conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Messages */
                    <div className="flex flex-col gap-4 p-4">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          {msg.type === 'agent' && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mb-0.5">
                              <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            msg.type === 'user'
                              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          }`}>
                            {msg.type === 'agent' ? (
                              <div className="prose prose-sm max-w-none prose-p:mb-1.5 prose-p:last:mb-0 prose-ul:my-1 prose-li:my-0">
                                {parseMessageWithActions(msg.content).map((part, pi) =>
                                  part.type === 'text' ? (
                                    <ReactMarkdown key={pi} remarkPlugins={[remarkGfm]} components={{
                                      p: ({node, ...props}) => <p {...props} />,
                                      ul: ({node, ...props}) => <ul className="list-disc ml-4 space-y-0.5" {...props} />,
                                      ol: ({node, ...props}) => <ol className="list-decimal ml-4 space-y-0.5" {...props} />,
                                      li: ({node, ...props}) => <li {...props} />,
                                      strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                                      code: ({node, ...props}) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs" {...props} />,
                                      pre: ({node, ...props}) => <pre className="bg-gray-200 p-2 rounded my-1 overflow-x-auto text-xs" {...props} />,
                                      a: ({node, href, children, ...props}) => {
                                        const isInternal = href && (href.startsWith('/') || href.startsWith('#'));
                                        if (isInternal) {
                                          return (
                                            <button
                                              onClick={() => navigate(href!)}
                                              className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-800 font-medium underline underline-offset-2"
                                            >
                                              {children}
                                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                            </button>
                                          );
                                        }
                                        return (
                                          <a href={href} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-800 font-medium underline underline-offset-2"
                                            {...props}>
                                            {children}
                                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                          </a>
                                        );
                                      },
                                    }}>
                                      {part.content!}
                                    </ReactMarkdown>
                                  ) : (() => {
                                    const cfg = ACTION_CONFIG[part.action!] ?? ACTION_CONFIG['navigate'];
                                    const key = `${part.action}_${part.id}`;
                                    const isRunning = executingAction === key;
                                    return (
                                      <button key={pi}
                                        disabled={isRunning}
                                        onClick={() => handleChatAction(part.action!, part.id!)}
                                        className={`inline-flex items-center gap-1.5 mt-1.5 mr-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${cfg.color} disabled:opacity-60`}
                                      >
                                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : cfg.icon}
                                        {part.label ?? cfg.label}
                                      </button>
                                    );
                                  })()
                                )}
                              </div>
                            ) : (
                              <span>{msg.content}</span>
                            )}
                            <p className={`text-[10px] mt-1 ${msg.type === 'user' ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Typing indicator */}
                      {isTyping && (
                        <div className="flex items-end gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                            <Bot className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                            <div className="flex gap-1 items-center">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="shrink-0 px-4 pb-4 pt-3 border-t border-gray-100 bg-white">
                  {!canSendMessage && (
                    <p className="text-[10px] text-orange-500 mb-2 text-center">Quota quotidien atteint — passez à un plan supérieur</p>
                  )}
                  <div className="flex items-end gap-2 bg-gray-100 rounded-xl px-3 py-2">
                    <Textarea ref={textareaRef} value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={canSendMessage ? "Posez votre question…" : "Quota atteint"}
                      disabled={!canSendMessage || isTyping}
                      rows={1}
                      className="flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 resize-none text-sm placeholder:text-gray-400 p-0 min-h-0 max-h-24 leading-5"
                    />
                    <button onClick={() => handleSend()}
                      disabled={!canSendMessage || !inputMessage.trim() || isTyping}
                      className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0">
                      {isTyping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center mt-2">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GlobalAgentChat;
