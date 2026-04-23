export interface Ticket {
    id: string;
    title: string;
    client: string;
    email: string;
    date: string;
    category: string;
    status: "open" | "pending" | "resolved";
    priority: "high" | "medium" | "low";
    lastUpdate: string;
    messages: {
      sender: "client" | "admin";
      text: string;
      time: string;
    }[];
  }
  
  export const initialTicketData: Ticket[] = [
    {
      id: "TICKET-1001",
      title: "Problème de paiement",
      client: "Jean Dupont",
      email: "jean.dupont@example.com",
      date: "2025-04-05T10:30:00",
      category: "Facturation",
      status: "open",
      priority: "high",
      lastUpdate: "2025-04-05T14:30:00",
      messages: [
        {
          sender: "client",
          text: "Je n'arrive pas à effectuer mon paiement mensuel, l'erreur 'transaction refusée' s'affiche.",
          time: "2025-04-05T10:30:00",
        },
        {
          sender: "admin",
          text: "Bonjour, pouvez-vous nous indiquer quelle méthode de paiement vous utilisez?",
          time: "2025-04-05T14:30:00",
        },
      ],
    },
    {
      id: "TICKET-1002",
      title: "Question sur l'abonnement Premium",
      client: "Marie Laurent",
      email: "marie.laurent@example.com",
      date: "2025-04-04T09:15:00",
      category: "Abonnement",
      status: "pending",
      priority: "medium",
      lastUpdate: "2025-04-06T11:20:00",
      messages: [
        {
          sender: "client",
          text: "J'aimerais connaître les différences entre l'abonnement standard et premium.",
          time: "2025-04-04T09:15:00",
        },
        {
          sender: "admin",
          text: "Bonjour Marie, l'abonnement Premium inclut les fonctionnalités suivantes que le standard n'a pas:",
          time: "2025-04-04T11:30:00",
        },
        {
          sender: "admin",
          text: "- Exports illimités\n- Support prioritaire\n- Fonctionnalités avancées d'analyse",
          time: "2025-04-04T11:32:00",
        },
        {
          sender: "client",
          text: "Merci pour ces informations. Y a-t-il une différence de quota de tokens entre les deux offres?",
          time: "2025-04-06T10:45:00",
        },
      ],
    },
    {
      id: "TICKET-1003",
      title: "Bug dans l'éditeur de blog",
      client: "Thomas Mercier",
      email: "thomas.mercier@example.com",
      date: "2025-04-03T16:45:00",
      category: "Bug",
      status: "resolved",
      priority: "high",
      lastUpdate: "2025-04-07T09:10:00",
      messages: [
        {
          sender: "client",
          text: "L'éditeur de blog plante quand j'essaie d'insérer une image.",
          time: "2025-04-03T16:45:00",
        },
        {
          sender: "admin",
          text: "Pouvez-vous nous préciser quel navigateur et système d'exploitation vous utilisez?",
          time: "2025-04-04T09:20:00",
        },
        {
          sender: "client",
          text: "J'utilise Chrome version 120 sur Windows 11.",
          time: "2025-04-04T10:15:00",
        },
        {
          sender: "admin",
          text: "Merci, nous avons identifié le problème et déployé un correctif. Pouvez-vous vérifier si cela fonctionne maintenant?",
          time: "2025-04-05T15:30:00",
        },
        {
          sender: "client",
          text: "Oui, ça marche parfaitement maintenant. Merci beaucoup!",
          time: "2025-04-07T09:10:00",
        },
      ],
    },
    {
      id: "TICKET-1004",
      title: "Demande de fonctionnalité",
      client: "Sophie Petit",
      email: "sophie.petit@example.com",
      date: "2025-04-02T13:20:00",
      category: "Suggestion",
      status: "pending",
      priority: "low",
      lastUpdate: "2025-04-05T14:45:00",
      messages: [
        {
          sender: "client",
          text: "Serait-il possible d'ajouter une fonction pour programmer la publication des articles?",
          time: "2025-04-02T13:20:00",
        },
        {
          sender: "admin",
          text: "Merci pour votre suggestion! Nous l'avons ajoutée à notre backlog de fonctionnalités.",
          time: "2025-04-03T10:15:00",
        },
        {
          sender: "admin",
          text: "Bonne nouvelle, cette fonctionnalité est prévue pour notre prochaine mise à jour majeure le mois prochain.",
          time: "2025-04-05T14:45:00",
        },
      ],
    },
    {
      id: "TICKET-1005",
      title: "Problème d'accès au compte",
      client: "Alexandre Martin",
      email: "alexandre.martin@example.com",
      date: "2025-04-07T08:30:00",
      category: "Authentification",
      status: "open",
      priority: "high",
      lastUpdate: "2025-04-07T08:30:00",
      messages: [
        {
          sender: "client",
          text: "Je ne parviens pas à me connecter à mon compte depuis hier soir.",
          time: "2025-04-07T08:30:00",
        },
      ],
    },
  ];