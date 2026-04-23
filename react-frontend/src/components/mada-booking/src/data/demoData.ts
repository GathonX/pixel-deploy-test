// Centralized demo data for MadagasBooking

export type ProductType = "chambre" | "excursion" | "service";
export type ReservationStatus = "confirmed" | "pending" | "cancelled" | "maintenance";

export interface Reservation {
  id: string;
  client: string;
  clientEmail: string;
  clientPhone: string;
  start: number; // offset from today
  duration: number;
  status: ReservationStatus;
  persons: number;
  notes: string;
  linkedProductId?: string;
  createdAt: string;
  history: { action: string; date: string; by: string }[];
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  capacity: number;
  description: string;
  image: string;
  reservations: Reservation[];
  stock?: number; // for services
  maxCapacity?: number; // for excursions
}

export interface Site {
  id: string;
  name: string;
  type: ProductType;
  location: string;
  products: Product[];
}

const today = new Date();
const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtTime = (d: Date) => `${fmt(d)} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} EAT`;

export const demoSites: Site[] = [
  {
    id: "s1",
    name: "Hôtel Toamasina",
    type: "chambre",
    location: "Toamasina, Madagascar",
    products: [
      {
        id: "p1", name: "Chambre Océan", type: "chambre", price: 85, capacity: 2,
        description: "Vue mer panoramique, climatisée, lit king-size, mini-bar. Idéale pour couples.",
        image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop",
        reservations: [
          { id: "r1", client: "Marie Dupont", clientEmail: "marie@example.com", clientPhone: "+261 34 12 345 67", start: 0, duration: 4, status: "confirmed", persons: 2, notes: "Demande vue mer côté est", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 3)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000 * 3)), by: "Client (web)" }, { action: "Confirmée par admin", date: fmtTime(new Date(today.getTime() - 86400000 * 2)), by: "Jean Rakoto" }] },
          { id: "r2", client: "Pierre Martin", clientEmail: "pierre@example.com", clientPhone: "+33 6 12 34 56 78", start: 5, duration: 3, status: "pending", persons: 1, notes: "Arrivée tardive prévue 22h", createdAt: fmtTime(new Date(today.getTime() - 86400000)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000)), by: "Client (web)" }] },
        ],
      },
      {
        id: "p2", name: "Suite Baobab", type: "chambre", price: 150, capacity: 4,
        description: "Suite familiale luxueuse avec terrasse privée, jacuzzi et vue jardin tropical.",
        image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop",
        reservations: [
          { id: "r3", client: "Sophie Rabe", clientEmail: "sophie@example.com", clientPhone: "+261 33 98 765 43", start: 1, duration: 5, status: "confirmed", persons: 3, notes: "Famille avec enfant 5 ans", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 5)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000 * 5)), by: "Téléphone" }, { action: "Confirmée", date: fmtTime(new Date(today.getTime() - 86400000 * 4)), by: "Jean Rakoto" }] },
        ],
      },
      {
        id: "p3", name: "Chambre Jardin", type: "chambre", price: 65, capacity: 2,
        description: "Chambre cosy donnant sur le jardin, ventilateur, douche italienne.",
        image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=300&fit=crop",
        reservations: [
          { id: "r4", client: "Lucas Andria", clientEmail: "lucas@example.com", clientPhone: "+261 32 11 222 33", start: 3, duration: 2, status: "cancelled", persons: 2, notes: "", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 2)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000 * 2)), by: "Client (web)" }, { action: "Annulée par client", date: fmtTime(new Date(today.getTime() - 86400000)), by: "Lucas Andria" }] },
          { id: "r5", client: "Emma Raza", clientEmail: "emma@example.com", clientPhone: "+261 34 55 666 77", start: 6, duration: 4, status: "confirmed", persons: 1, notes: "Régime végétarien petit-déj", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 1)), history: [{ action: "Réservation créée et confirmée", date: fmtTime(new Date(today.getTime() - 86400000 * 1)), by: "Jean Rakoto" }] },
        ],
      },
      {
        id: "p10", name: "Chambre Vanille", type: "chambre", price: 75, capacity: 2,
        description: "Décor épuré inspiré des plantations de vanille, balcon avec hamac.",
        image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop",
        reservations: [
          { id: "r15", client: "Claire Moreau", clientEmail: "claire@example.com", clientPhone: "+33 7 88 99 00 11", start: 2, duration: 3, status: "confirmed", persons: 2, notes: "Anniversaire de mariage", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 4)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000 * 4)), by: "Client (web)" }] },
        ],
      },
      {
        id: "p11", name: "Chambre Letchis", type: "chambre", price: 70, capacity: 2,
        description: "Chambre double avec décoration locale, proche piscine.",
        image: "https://images.unsplash.com/photo-1590490360182-c33d955bc3ed?w=400&h=300&fit=crop",
        reservations: [
          { id: "r16", client: "Maintenance", clientEmail: "", clientPhone: "", start: 0, duration: 2, status: "maintenance", persons: 0, notes: "Réparation climatisation", createdAt: fmtTime(today), history: [{ action: "Mise en maintenance", date: fmtTime(today), by: "Jean Rakoto" }] },
        ],
      },
    ],
  },
  {
    id: "s2",
    name: "Excursions Nosy Be",
    type: "excursion",
    location: "Nosy Be, Madagascar",
    products: [
      {
        id: "p4", name: "Snorkeling Nosy Tanikely", type: "excursion", price: 45, capacity: 15, maxCapacity: 15,
        description: "Demi-journée snorkeling dans les eaux cristallines de Nosy Tanikely. Masque et palmes inclus.",
        image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop",
        reservations: [
          { id: "r6", client: "Groupe Aventure", clientEmail: "aventure@example.com", clientPhone: "+261 34 00 111 22", start: 2, duration: 1, status: "confirmed", persons: 8, notes: "Guide francophone demandé", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 7)), history: [{ action: "Réservation groupe créée", date: fmtTime(new Date(today.getTime() - 86400000 * 7)), by: "Email" }] },
          { id: "r12", client: "Famille Leclerc", clientEmail: "leclerc@example.com", clientPhone: "+33 6 77 88 99 00", start: 2, duration: 1, status: "confirmed", persons: 4, notes: "", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 3)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000 * 3)), by: "Client (web)" }] },
        ],
      },
      {
        id: "p5", name: "Trekking Lokobe", type: "excursion", price: 35, capacity: 8, maxCapacity: 8,
        description: "Randonnée guidée dans la réserve de Lokobe. Observation lémuriens et caméléons.",
        image: "https://images.unsplash.com/photo-1504173010664-32509aeebb62?w=400&h=300&fit=crop",
        reservations: [
          { id: "r7", client: "Famille Durand", clientEmail: "durand@example.com", clientPhone: "+33 6 12 34 56 78", start: 4, duration: 1, status: "pending", persons: 4, notes: "Enfants 8 et 12 ans", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 2)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000 * 2)), by: "Client (web)" }] },
        ],
      },
      {
        id: "p12", name: "Observation Baleines", type: "excursion", price: 65, capacity: 12, maxCapacity: 12,
        description: "Sortie en mer pour observer les baleines à bosse (saison juin-octobre).",
        image: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=400&h=300&fit=crop",
        reservations: [
          { id: "r13", client: "Groupe Nature+", clientEmail: "nature@example.com", clientPhone: "+261 34 22 333 44", start: 1, duration: 1, status: "confirmed", persons: 10, notes: "Photographe professionnel dans le groupe", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 6)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000 * 6)), by: "Email" }] },
        ],
      },
    ],
  },
  {
    id: "s3",
    name: "Services Transferts",
    type: "service",
    location: "Toamasina & Nosy Be",
    products: [
      {
        id: "p6", name: "Transfert Aéroport", type: "service", price: 25, capacity: 4, stock: 5,
        description: "Navette privée aéroport-hôtel, aller simple. Climatisée, wifi à bord.",
        image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=300&fit=crop",
        reservations: [
          { id: "r8", client: "J. Bernard", clientEmail: "jbernard@example.com", clientPhone: "+33 6 55 44 33 22", start: 0, duration: 1, status: "confirmed", persons: 2, notes: "Vol AF 7702 arrivée 14h30", linkedProductId: "p1", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 4)), history: [{ action: "Réservation créée (liée Chambre Océan)", date: fmtTime(new Date(today.getTime() - 86400000 * 4)), by: "Auto" }] },
          { id: "r9", client: "A. Razafi", clientEmail: "arazafi@example.com", clientPhone: "+261 33 12 345 67", start: 3, duration: 1, status: "confirmed", persons: 1, notes: "", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 1)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000 * 1)), by: "Téléphone" }] },
        ],
      },
      {
        id: "p13", name: "Location Scooter", type: "service", price: 15, capacity: 1, stock: 10,
        description: "Location journalière de scooter 125cc. Casque et assurance inclus.",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
        reservations: [
          { id: "r14", client: "Tom Wilson", clientEmail: "tom@example.com", clientPhone: "+44 7 911 123 456", start: 1, duration: 3, status: "confirmed", persons: 1, notes: "Permis international vérifié", createdAt: fmtTime(new Date(today.getTime() - 86400000 * 2)), history: [{ action: "Réservation créée", date: fmtTime(new Date(today.getTime() - 86400000 * 2)), by: "Client (web)" }] },
        ],
      },
    ],
  },
];

export const allProducts = demoSites.flatMap(s => s.products);
export const allReservations = allProducts.flatMap(p => p.reservations.map(r => ({ ...r, productName: p.name, productType: p.type, siteName: demoSites.find(s => s.products.includes(p))?.name || "" })));

export const statusColors: Record<ReservationStatus, string> = {
  confirmed: "bg-status-confirmed",
  pending: "bg-status-pending",
  cancelled: "bg-status-cancelled",
  maintenance: "bg-status-maintenance",
};

export const statusLabels: Record<ReservationStatus, string> = {
  confirmed: "Confirmée",
  pending: "En attente",
  cancelled: "Annulée",
  maintenance: "Maintenance",
};

export const statusDotColors: Record<ReservationStatus, string> = {
  confirmed: "bg-status-confirmed",
  pending: "bg-status-pending",
  cancelled: "bg-status-cancelled",
  maintenance: "bg-status-maintenance",
};

export function getDays(count = 14): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function getOccupancyRate(products: Product[], dayOffset: number): number {
  const rooms = products.filter(p => p.type === "chambre");
  if (rooms.length === 0) return 0;
  const occupied = rooms.filter(p =>
    p.reservations.some(r => r.status !== "cancelled" && dayOffset >= r.start && dayOffset < r.start + r.duration)
  ).length;
  return Math.round((occupied / rooms.length) * 100);
}

export function getRevenueEstimate(products: Product[]): number {
  return products.reduce((sum, p) =>
    sum + p.reservations.filter(r => r.status === "confirmed").reduce((s, r) => s + p.price * r.persons * r.duration, 0), 0
  );
}
