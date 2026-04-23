import {
  Wifi, Wind, Fan, Flame, Tv, Wine, Lock, Shirt, Sparkles,
  DoorOpen, TreePalm, Flower2, Waves, Mountain, Eye, Umbrella,
  Bath, ShowerHead, Droplets, Scissors,
  Coffee, ConciergeBell, Car, Plane, WashingMachine, BedDouble,
  Dumbbell, UtensilsCrossed, GlassWater,
  // Excursion icons
  Map, Bus, Sandwich, Backpack, Gauge, Clock,
  Footprints, Binoculars, Fish, Sailboat, Landmark, Sunset, Apple,
  // New icons
  Bug, Crown, Armchair, Laptop, CupSoda, Microwave, Refrigerator,
  Volume2, Accessibility, CookingPot,
  Anchor, Bike, MountainSnow, Tent, Camera, ShoppingBag, TreeDeciduous,
  Flame as FireIcon, CalendarRange,
  CarFront, Baby, Hand, Smartphone, CreditCard, Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Amenity {
  key: string;
  label: string;
  icon: LucideIcon;
  category: string;
}

export const AMENITY_CATEGORIES = [
  "Confort",
  "Extérieur",
  "Salle de bain",
  "Services",
  "Loisirs",
  "Excursion",
  "Service",
] as const;

/** Categories relevant per product type */
export const CATEGORIES_FOR_TYPE: Record<string, string[]> = {
  chambre: ["Confort", "Extérieur", "Salle de bain", "Services", "Loisirs"],
  excursion: ["Excursion", "Services"],
  service: ["Service", "Services"],
};

export const AMENITIES: Amenity[] = [
  // ─── Confort ───
  { key: "wifi", label: "WiFi", icon: Wifi, category: "Confort" },
  { key: "climatisation", label: "Climatisation", icon: Wind, category: "Confort" },
  { key: "ventilateur", label: "Ventilateur", icon: Fan, category: "Confort" },
  { key: "chauffage", label: "Chauffage", icon: Flame, category: "Confort" },
  { key: "tv", label: "TV", icon: Tv, category: "Confort" },
  { key: "minibar", label: "Minibar", icon: Wine, category: "Confort" },
  { key: "coffre_fort", label: "Coffre-fort", icon: Lock, category: "Confort" },
  { key: "fer_a_repasser", label: "Fer à repasser", icon: Shirt, category: "Confort" },
  { key: "seche_cheveux", label: "Sèche-cheveux", icon: Sparkles, category: "Confort" },
  { key: "moustiquaire", label: "Moustiquaire", icon: Bug, category: "Confort" },
  { key: "lit_king", label: "Lit king-size", icon: Crown, category: "Confort" },
  { key: "lit_twin", label: "Lit twin", icon: BedDouble, category: "Confort" },
  { key: "dressing", label: "Dressing", icon: Armchair, category: "Confort" },
  { key: "bureau", label: "Bureau", icon: Laptop, category: "Confort" },
  { key: "machine_cafe", label: "Machine à café", icon: Coffee, category: "Confort" },
  { key: "bouilloire", label: "Bouilloire", icon: CupSoda, category: "Confort" },
  { key: "micro_ondes", label: "Micro-ondes", icon: Microwave, category: "Confort" },
  { key: "refrigerateur", label: "Réfrigérateur", icon: Refrigerator, category: "Confort" },
  { key: "insonorisation", label: "Insonorisation", icon: Volume2, category: "Confort" },
  { key: "kitchenette", label: "Kitchenette", icon: CookingPot, category: "Confort" },
  { key: "linge_premium", label: "Linge de lit premium", icon: Sparkles, category: "Confort" },

  // ─── Extérieur ───
  { key: "balcon", label: "Balcon", icon: DoorOpen, category: "Extérieur" },
  { key: "terrasse", label: "Terrasse", icon: TreePalm, category: "Extérieur" },
  { key: "jardin", label: "Jardin", icon: Flower2, category: "Extérieur" },
  { key: "vue_mer", label: "Vue Mer", icon: Waves, category: "Extérieur" },
  { key: "vue_montagne", label: "Vue Montagne", icon: Mountain, category: "Extérieur" },
  { key: "vue_piscine", label: "Vue Piscine", icon: Eye, category: "Extérieur" },
  { key: "vue_jardin", label: "Vue Jardin", icon: Flower2, category: "Extérieur" },
  { key: "acces_plage", label: "Accès plage", icon: Umbrella, category: "Extérieur" },
  { key: "acces_handicape", label: "Accès handicapé", icon: Accessibility, category: "Extérieur" },

  // ─── Salle de bain ───
  { key: "salle_de_bain_privee", label: "Salle de bain privée", icon: Bath, category: "Salle de bain" },
  { key: "douche", label: "Douche", icon: ShowerHead, category: "Salle de bain" },
  { key: "baignoire", label: "Baignoire", icon: Bath, category: "Salle de bain" },
  { key: "serviettes", label: "Serviettes", icon: Droplets, category: "Salle de bain" },
  { key: "articles_toilette", label: "Articles toilette", icon: Scissors, category: "Salle de bain" },

  // ─── Services (hôtel) ───
  { key: "petit_dejeuner", label: "Petit-déjeuner", icon: Coffee, category: "Services" },
  { key: "room_service", label: "Room service", icon: ConciergeBell, category: "Services" },
  { key: "parking", label: "Parking", icon: Car, category: "Services" },
  { key: "navette_aeroport", label: "Navette aéroport", icon: Plane, category: "Services" },
  { key: "blanchisserie", label: "Blanchisserie", icon: WashingMachine, category: "Services" },
  { key: "service_en_chambre", label: "Service en chambre", icon: BedDouble, category: "Services" },

  // ─── Loisirs ───
  { key: "piscine", label: "Piscine", icon: Waves, category: "Loisirs" },
  { key: "spa", label: "Spa", icon: Sparkles, category: "Loisirs" },
  { key: "salle_de_sport", label: "Salle de sport", icon: Dumbbell, category: "Loisirs" },
  { key: "restaurant", label: "Restaurant", icon: UtensilsCrossed, category: "Loisirs" },
  { key: "bar", label: "Bar", icon: GlassWater, category: "Loisirs" },

  // ─── Excursion ───
  { key: "guide_local", label: "Guide local", icon: Map, category: "Excursion" },
  { key: "transport_inclus", label: "Transport inclus", icon: Bus, category: "Excursion" },
  { key: "dejeuner_inclus", label: "Déjeuner inclus", icon: Sandwich, category: "Excursion" },
  { key: "materiel_fourni", label: "Matériel fourni", icon: Backpack, category: "Excursion" },
  { key: "difficulte_facile", label: "Difficulté facile", icon: Gauge, category: "Excursion" },
  { key: "difficulte_moyenne", label: "Difficulté moyenne", icon: Gauge, category: "Excursion" },
  { key: "difficulte_difficile", label: "Difficulté difficile", icon: Gauge, category: "Excursion" },
  { key: "duree_demi_journee", label: "Demi-journée", icon: Clock, category: "Excursion" },
  { key: "duree_journee", label: "Journée complète", icon: Clock, category: "Excursion" },
  { key: "baignade", label: "Baignade", icon: Waves, category: "Excursion" },
  { key: "randonnee", label: "Randonnée", icon: Footprints, category: "Excursion" },
  { key: "observation_animaux", label: "Observation animaux", icon: Binoculars, category: "Excursion" },
  { key: "snorkeling", label: "Snorkeling", icon: Fish, category: "Excursion" },
  { key: "kayak", label: "Kayak", icon: Sailboat, category: "Excursion" },
  { key: "visite_culturelle", label: "Visite culturelle", icon: Landmark, category: "Excursion" },
  { key: "coucher_soleil", label: "Coucher de soleil", icon: Sunset, category: "Excursion" },
  { key: "pique_nique", label: "Pique-nique", icon: Apple, category: "Excursion" },
  { key: "plongee", label: "Plongée", icon: Anchor, category: "Excursion" },
  { key: "surf", label: "Surf", icon: Waves, category: "Excursion" },
  { key: "vtt", label: "VTT", icon: Bike, category: "Excursion" },
  { key: "escalade", label: "Escalade", icon: MountainSnow, category: "Excursion" },
  { key: "pirogue", label: "Pirogue", icon: Sailboat, category: "Excursion" },
  { key: "quad", label: "Quad", icon: CarFront, category: "Excursion" },
  { key: "tyrolienne", label: "Tyrolienne", icon: Wind, category: "Excursion" },
  { key: "camping", label: "Camping", icon: Tent, category: "Excursion" },
  { key: "peche", label: "Pêche", icon: Fish, category: "Excursion" },
  { key: "photographie", label: "Photographie", icon: Camera, category: "Excursion" },
  { key: "marche_local", label: "Marché local", icon: ShoppingBag, category: "Excursion" },
  { key: "cascade", label: "Cascade", icon: Droplets, category: "Excursion" },
  { key: "foret_tropicale", label: "Forêt tropicale", icon: TreeDeciduous, category: "Excursion" },
  { key: "observation_baleines", label: "Observation baleines", icon: Binoculars, category: "Excursion" },
  { key: "nuit_habitant", label: "Nuit chez l'habitant", icon: BedDouble, category: "Excursion" },
  { key: "feu_de_camp", label: "Feu de camp", icon: FireIcon, category: "Excursion" },
  { key: "multi_jours", label: "Multi-jours", icon: CalendarRange, category: "Excursion" },

  // ─── Service (catégorie dédiée) ───
  { key: "transfert_prive", label: "Transfert privé", icon: Car, category: "Service" },
  { key: "location_voiture", label: "Location voiture", icon: CarFront, category: "Service" },
  { key: "location_scooter", label: "Location scooter", icon: Bike, category: "Service" },
  { key: "garde_enfants", label: "Garde enfants", icon: Baby, category: "Service" },
  { key: "massage", label: "Massage", icon: Hand, category: "Service" },
  { key: "cours_cuisine", label: "Cours de cuisine", icon: CookingPot, category: "Service" },
  { key: "guide_prive", label: "Guide privé", icon: Map, category: "Service" },
  { key: "wifi_portable", label: "WiFi portable", icon: Smartphone, category: "Service" },
  { key: "sim_locale", label: "SIM locale", icon: Smartphone, category: "Service" },
  { key: "change_devises", label: "Change devises", icon: CreditCard, category: "Service" },
  { key: "assurance_voyage", label: "Assurance voyage", icon: Shield, category: "Service" },
  { key: "location_velo", label: "Location vélo", icon: Bike, category: "Service" },
];

export const AMENITIES_MAP: Record<string, Amenity> = Object.fromEntries(
  AMENITIES.map(a => [a.key, a])
);
