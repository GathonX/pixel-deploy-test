import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

interface ConversationMemory {
  sessionId: string;
  messages: ChatMessage[];
  userPreferences: Record<string, any>;
  conversationContext: Record<string, any>;
  lastInteraction: Date | null;
  topicsDiscussed: string[];
  userIntents: string[];
  personalizations: Record<string, any>;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  domain?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

interface AgentMemoryState {
  currentSession: ConversationMemory | null;
  sessionHistory: ConversationMemory[];
  globalContext: Record<string, any>;
  isLoading: boolean;
}

type AgentMemoryAction =
  | { type: 'INITIALIZE_SESSION'; payload: ConversationMemory }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_CONTEXT'; payload: Record<string, any> }
  | { type: 'UPDATE_PREFERENCES'; payload: Record<string, any> }
  | { type: 'ADD_TOPIC'; payload: string }
  | { type: 'ADD_INTENT'; payload: string }
  | { type: 'SAVE_SESSION'; payload: ConversationMemory }
  | { type: 'RESTORE_SESSION'; payload: ConversationMemory }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_GLOBAL_CONTEXT'; payload: Record<string, any> };

const AgentMemoryContext = createContext<{
  state: AgentMemoryState;
  dispatch: React.Dispatch<AgentMemoryAction>;
  addMessage: (message: ChatMessage) => void;
  updateContext: (context: Record<string, any>) => void;
  updatePreferences: (preferences: Record<string, any>) => void;
  addTopic: (topic: string) => void;
  addIntent: (intent: string) => void;
  saveCurrentSession: () => void;
  restoreSession: (sessionId: string) => void;
  clearSession: () => void;
  getRelevantHistory: (topic: string, limit?: number) => ChatMessage[];
  getUserPattern: (key: string) => any;
  getPersonalization: (key: string) => any;
} | null>(null);

const initialState: AgentMemoryState = {
  currentSession: null,
  sessionHistory: [],
  globalContext: {},
  isLoading: false,
};

function agentMemoryReducer(state: AgentMemoryState, action: AgentMemoryAction): AgentMemoryState {
  switch (action.type) {
    case 'INITIALIZE_SESSION':
      return {
        ...state,
        currentSession: action.payload,
      };

    case 'ADD_MESSAGE':
      if (!state.currentSession) return state;

      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          messages: [...state.currentSession.messages, action.payload],
          lastInteraction: new Date(),
        },
      };

    case 'UPDATE_CONTEXT':
      if (!state.currentSession) return state;

      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          conversationContext: {
            ...state.currentSession.conversationContext,
            ...action.payload,
          },
        },
      };

    case 'UPDATE_PREFERENCES':
      if (!state.currentSession) return state;

      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          userPreferences: {
            ...state.currentSession.userPreferences,
            ...action.payload,
          },
        },
      };

    case 'ADD_TOPIC':
      if (!state.currentSession) return state;

      const topics = state.currentSession.topicsDiscussed;
      if (!topics.includes(action.payload)) {
        return {
          ...state,
          currentSession: {
            ...state.currentSession,
            topicsDiscussed: [...topics, action.payload],
          },
        };
      }
      return state;

    case 'ADD_INTENT':
      if (!state.currentSession) return state;

      const intents = state.currentSession.userIntents;
      if (!intents.includes(action.payload)) {
        return {
          ...state,
          currentSession: {
            ...state.currentSession,
            userIntents: [...intents, action.payload],
          },
        };
      }
      return state;

    case 'SAVE_SESSION':
      if (!state.currentSession) return state;

      const existingIndex = state.sessionHistory.findIndex(
        session => session.sessionId === action.payload.sessionId
      );

      let newHistory;
      if (existingIndex >= 0) {
        newHistory = [...state.sessionHistory];
        newHistory[existingIndex] = action.payload;
      } else {
        newHistory = [...state.sessionHistory, action.payload].slice(-10); // Garde les 10 dernières sessions
      }

      return {
        ...state,
        sessionHistory: newHistory,
      };

    case 'RESTORE_SESSION':
      return {
        ...state,
        currentSession: action.payload,
      };

    case 'CLEAR_SESSION':
      return {
        ...state,
        currentSession: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_GLOBAL_CONTEXT':
      return {
        ...state,
        globalContext: {
          ...state.globalContext,
          ...action.payload,
        },
      };

    default:
      return state;
  }
}

interface AgentMemoryProviderProps {
  children: ReactNode;
  userId: string;
}

export const AgentMemoryProvider: React.FC<AgentMemoryProviderProps> = ({
  children,
  userId,
}) => {
  const [state, dispatch] = useReducer(agentMemoryReducer, initialState);

  // Clé de stockage pour ce utilisateur
  const storageKey = `agent_memory_${userId}`;

  // Charger la mémoire depuis le localStorage au montage
  useEffect(() => {
    const loadMemory = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // Charger depuis localStorage
        const savedMemory = localStorage.getItem(storageKey);
        if (savedMemory) {
          const parsedMemory = JSON.parse(savedMemory);

          // Restaurer l'historique des sessions
          if (parsedMemory.sessionHistory) {
            parsedMemory.sessionHistory.forEach((session: any) => {
              // Reconvertir les dates
              session.lastInteraction = session.lastInteraction ? new Date(session.lastInteraction) : null;
              session.messages = session.messages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }));
            });
          }

          // Créer ou restaurer la session courante
          const lastSession = parsedMemory.sessionHistory?.[parsedMemory.sessionHistory.length - 1];
          const sessionAge = lastSession?.lastInteraction
            ? Date.now() - new Date(lastSession.lastInteraction).getTime()
            : Infinity;

          // Si la dernière session a moins de 4 heures, la restaurer
          if (sessionAge < 4 * 60 * 60 * 1000 && lastSession) {
            dispatch({ type: 'RESTORE_SESSION', payload: lastSession });
          } else {
            // Créer une nouvelle session
            const newSession = createNewSession(userId);
            dispatch({ type: 'INITIALIZE_SESSION', payload: newSession });
          }

          // Restaurer le contexte global et l'historique
          if (parsedMemory.globalContext) {
            dispatch({ type: 'SET_GLOBAL_CONTEXT', payload: parsedMemory.globalContext });
          }

          if (parsedMemory.sessionHistory) {
            parsedMemory.sessionHistory.forEach((session: ConversationMemory) => {
              dispatch({ type: 'SAVE_SESSION', payload: session });
            });
          }
        } else {
          // Première fois - créer une nouvelle session
          const newSession = createNewSession(userId);
          dispatch({ type: 'INITIALIZE_SESSION', payload: newSession });
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la mémoire agent:', error);
        // En cas d'erreur, créer une nouvelle session
        const newSession = createNewSession(userId);
        dispatch({ type: 'INITIALIZE_SESSION', payload: newSession });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadMemory();
  }, [userId, storageKey]);

  // Sauvegarder automatiquement la mémoire
  useEffect(() => {
    if (!state.isLoading && (state.currentSession || state.sessionHistory.length > 0)) {
      const memoryToSave = {
        sessionHistory: state.sessionHistory,
        globalContext: state.globalContext,
        lastUpdated: new Date().toISOString(),
      };

      // Sauvegarder avec debounce
      const timeoutId = setTimeout(() => {
        localStorage.setItem(storageKey, JSON.stringify(memoryToSave));
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [state.currentSession, state.sessionHistory, state.globalContext, state.isLoading, storageKey]);

  // Fonctions utilitaires
  const createNewSession = (userId: string): ConversationMemory => ({
    sessionId: `session_${userId}_${Date.now()}`,
    messages: [],
    userPreferences: {},
    conversationContext: {},
    lastInteraction: null,
    topicsDiscussed: [],
    userIntents: [],
    personalizations: {},
  });

  const addMessage = (message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });

    // Analyser le message pour extraire des informations
    if (message.domain) {
      addTopic(message.domain);
    }

    if (message.metadata?.intent) {
      addIntent(message.metadata.intent);
    }
  };

  const updateContext = (context: Record<string, any>) => {
    dispatch({ type: 'UPDATE_CONTEXT', payload: context });
  };

  const updatePreferences = (preferences: Record<string, any>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
  };

  const addTopic = (topic: string) => {
    dispatch({ type: 'ADD_TOPIC', payload: topic });
  };

  const addIntent = (intent: string) => {
    dispatch({ type: 'ADD_INTENT', payload: intent });
  };

  const saveCurrentSession = () => {
    if (state.currentSession) {
      dispatch({ type: 'SAVE_SESSION', payload: state.currentSession });
    }
  };

  const restoreSession = (sessionId: string) => {
    const session = state.sessionHistory.find(s => s.sessionId === sessionId);
    if (session) {
      dispatch({ type: 'RESTORE_SESSION', payload: session });
    }
  };

  const clearSession = () => {
    dispatch({ type: 'CLEAR_SESSION' });
    const newSession = createNewSession(userId);
    dispatch({ type: 'INITIALIZE_SESSION', payload: newSession });
  };

  const getRelevantHistory = (topic: string, limit: number = 5): ChatMessage[] => {
    const relevantMessages: ChatMessage[] = [];

    // Chercher dans toutes les sessions
    state.sessionHistory.forEach(session => {
      if (session.topicsDiscussed.includes(topic)) {
        const topicMessages = session.messages.filter(
          msg => msg.domain === topic ||
                 msg.content.toLowerCase().includes(topic.toLowerCase())
        );
        relevantMessages.push(...topicMessages);
      }
    });

    // Trier par timestamp et limiter
    return relevantMessages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  };

  const getUserPattern = (key: string): any => {
    if (!state.currentSession) return null;

    // Analyser les patterns depuis l'historique
    const patterns = {
      preferredCommunicationStyle: analyzeCommuncationStyle(),
      frequentTopics: analyzeFequentTopics(),
      typicalQuestions: analyzeTypicalQuestions(),
      responsePreferences: analyzeResponsePreferences(),
    };

    return patterns[key as keyof typeof patterns];
  };

  const getPersonalization = (key: string): any => {
    return state.currentSession?.personalizations[key] ||
           state.globalContext[key];
  };

  // Fonctions d'analyse
  const analyzeCommuncationStyle = (): string => {
    if (!state.currentSession) return 'neutral';

    const messages = state.currentSession.messages.filter(m => m.type === 'user');
    const totalWords = messages.reduce((acc, msg) => acc + msg.content.split(' ').length, 0);
    const avgWordsPerMessage = totalWords / (messages.length || 1);

    if (avgWordsPerMessage > 20) return 'detailed';
    if (avgWordsPerMessage < 10) return 'concise';
    return 'balanced';
  };

  const analyzeFequentTopics = (): string[] => {
    const allTopics = state.sessionHistory.reduce(
      (acc, session) => [...acc, ...session.topicsDiscussed],
      [] as string[]
    );

    const topicCounts: Record<string, number> = {};
    allTopics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  };

  const analyzeTypicalQuestions = (): string[] => {
    const questions = state.sessionHistory.reduce(
      (acc, session) => [
        ...acc,
        ...session.messages
          .filter(m => m.type === 'user' && m.content.includes('?'))
          .map(m => m.content)
      ],
      [] as string[]
    );

    // Retourner les 5 questions les plus récentes
    return questions.slice(-5);
  };

  const analyzeResponsePreferences = (): Record<string, any> => {
    // Analyser les préférences basées sur les interactions passées
    return {
      prefersDetailedExplanations: getUserPattern('preferredCommunicationStyle') === 'detailed',
      prefersQuickAnswers: getUserPattern('preferredCommunicationStyle') === 'concise',
      frequentlyAsksForExamples: false, // À analyser depuis les messages
      prefersVisualAids: false, // À analyser depuis les préférences
    };
  };

  const contextValue = {
    state,
    dispatch,
    addMessage,
    updateContext,
    updatePreferences,
    addTopic,
    addIntent,
    saveCurrentSession,
    restoreSession,
    clearSession,
    getRelevantHistory,
    getUserPattern,
    getPersonalization,
  };

  return (
    <AgentMemoryContext.Provider value={contextValue}>
      {children}
    </AgentMemoryContext.Provider>
  );
};

export const useAgentMemory = () => {
  const context = useContext(AgentMemoryContext);
  if (!context) {
    throw new Error('useAgentMemory must be used within an AgentMemoryProvider');
  }
  return context;
};

export default AgentMemoryProvider;