import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Bot,
  Sparkles,
  Zap,
  Bell,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EnhancedAgentButtonProps {
  onClick: () => void;
  isActive?: boolean;
  hasUnreadSuggestions?: boolean;
  agentStatus?: 'active' | 'thinking' | 'idle';
  className?: string;
}

export const EnhancedAgentButton: React.FC<EnhancedAgentButtonProps> = ({
  onClick,
  isActive = false,
  hasUnreadSuggestions = false,
  agentStatus = 'active',
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  // Simulation de notifications périodiques
  useEffect(() => {
    if (!isActive) {
      const interval = setInterval(() => {
        setNotificationCount(prev => prev + 1);
        setShowPulse(true);

        // Auto-reset pulse après 3 secondes
        setTimeout(() => setShowPulse(false), 3000);
      }, 45000); // Nouvelle suggestion toutes les 45 secondes

      return () => clearInterval(interval);
    }
  }, [isActive]);

  // Reset notifications quand chat ouvert
  useEffect(() => {
    if (isActive) {
      setNotificationCount(0);
      setShowPulse(false);
    }
  }, [isActive]);

  const getStatusIcon = () => {
    switch (agentStatus) {
      case 'thinking':
        return <Zap className="w-5 h-5" />;
      case 'idle':
        return <Bot className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'thinking':
        return 'from-orange-500 to-red-500';
      case 'idle':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-blue-600 to-purple-600';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Pulse rings for attention */}
      <AnimatePresence>
        {(showPulse || hasUnreadSuggestions) && !isActive && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeOut"
              }}
              className={`absolute inset-0 rounded-full bg-gradient-to-r ${getStatusColor()} -z-10`}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeOut",
                delay: 0.5
              }}
              className={`absolute inset-0 rounded-full bg-gradient-to-r ${getStatusColor()} -z-10`}
            />
          </>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Button
          onClick={onClick}
          size="lg"
          className={`relative h-14 w-14 rounded-full bg-gradient-to-r ${getStatusColor()} hover:shadow-2xl transition-all duration-300 border-2 border-white/20 overflow-hidden`}
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />

          {/* Thinking animation */}
          {agentStatus === 'thinking' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-t-transparent border-white/30 rounded-full"
            />
          )}

          {/* Icon */}
          <motion.div
            animate={agentStatus === 'thinking' ? {
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            } : {}}
            transition={{
              duration: 1,
              repeat: agentStatus === 'thinking' ? Infinity : 0,
              repeatType: "reverse"
            }}
            className="relative z-10 text-white"
          >
            {getStatusIcon()}
          </motion.div>

          {/* Sparkles effect on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{
                      scale: [0, 1, 0],
                      rotate: [0, 180, 360],
                      x: [0, Math.cos(i * 120 * Math.PI / 180) * 20, 0],
                      y: [0, Math.sin(i * 120 * Math.PI / 180) * 20, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="absolute text-white/60"
                  >
                    <Sparkles className="w-3 h-3" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Notification badge */}
      <AnimatePresence>
        {notificationCount > 0 && !isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -right-2"
          >
            <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-lg border-2 border-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status indicator */}
      <motion.div
        animate={{
          scale: agentStatus === 'active' ? [1, 1.2, 1] : 1,
          opacity: agentStatus === 'idle' ? 0.5 : 1
        }}
        transition={{
          duration: 2,
          repeat: agentStatus === 'active' ? Infinity : 0,
          repeatType: "reverse"
        }}
        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-lg ${
          agentStatus === 'active' ? 'bg-green-500' :
          agentStatus === 'thinking' ? 'bg-orange-500' :
          'bg-gray-400'
        }`}
      />

      {/* Hover tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <div className="bg-black/80 text-white text-sm px-3 py-1 rounded-lg backdrop-blur-sm">
              {agentStatus === 'thinking' ? 'Agent en réflexion...' :
               agentStatus === 'idle' ? 'Agent en veille' :
               notificationCount > 0 ? `${notificationCount} nouvelle${notificationCount > 1 ? 's' : ''} suggestion${notificationCount > 1 ? 's' : ''}` :
               'Assistant IA PixelRise'}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};