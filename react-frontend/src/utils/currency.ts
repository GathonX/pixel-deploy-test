/**
 * Utilitaire de conversion de devises
 * Taux de change EUR -> MGA (Ariary)
 */

// Taux de conversion fixes
const CONVERSION_RATES: { [key: number]: number } = {
  // Prix mensuels
  4.99: 26000,
  5.99: 32000,
  
  // Prix annuels mensualisés (prix/mois)
  4.79: 25000,  // 5.99€ annuel / 12 mois
  3.99: 20000,  // 4.99€ annuel / 12 mois
  
  // Prix annuels totaux (facturé annuellement)
  57.5: 300000,   // 5.99€ * 12 * 0.8
  47.9: 250000,   // 4.99€ * 12 * 0.8
  
  // Prix normaux (sans réduction)
  71.88: 375000,  // 5.99€ * 12
  59.88: 312500,  // 4.99€ * 12
  
  // Économies
  14.38: 75000,   // Économie sur 5.99€
  11.98: 62500,   // Économie sur 4.99€
};

// Taux moyen pour les autres montants
const AVERAGE_RATE = 5342; // Moyenne des taux

/**
 * Convertit un montant en EUR vers MGA (Ariary)
 * @param euros - Montant en euros
 * @returns Montant en Ariary
 */
export function euroToAriary(euros: number): number {
  // Arrondir à 2 décimales pour la comparaison
  const roundedEuros = Math.round(euros * 100) / 100;
  
  // Utiliser le taux fixe si disponible
  if (CONVERSION_RATES[roundedEuros]) {
    return CONVERSION_RATES[roundedEuros];
  }
  
  // Sinon utiliser le taux moyen
  return Math.round(euros * AVERAGE_RATE);
}

/**
 * Formate un montant en Ariary avec séparateur de milliers
 * @param ariary - Montant en Ariary
 * @returns Montant formaté (ex: "26 000")
 */
export function formatAriary(ariary: number): string {
  return ariary.toLocaleString('fr-FR').replace(/,/g, ' ');
}

/**
 * Formate un prix avec EUR et MGA
 * @param euros - Montant en euros
 * @returns Prix formaté (ex: "5,99€ (32 000 Ar)")
 */
export function formatPrice(euros: number): string {
  const ariary = euroToAriary(euros);
  return `${euros.toFixed(2)}€ (${formatAriary(ariary)} Ar)`;
}

/**
 * Retourne les deux devises séparément
 * @param euros - Montant en euros
 * @returns Objet avec euro et ariary
 */
export function getDualPrice(euros: number | string): { euro: string; ariary: string } {
  // Convertir en nombre si ce n'est pas déjà le cas
  const euroAmount = typeof euros === 'number' ? euros : parseFloat(String(euros || '0'));
  
  // Vérifier si c'est un nombre valide
  if (isNaN(euroAmount)) {
    return {
      euro: '0,00€',
      ariary: '0 Ar',
    };
  }
  
  const ariary = euroToAriary(euroAmount);
  return {
    euro: `${euroAmount.toFixed(2)}€`,
    ariary: `${formatAriary(ariary)} Ar`,
  };
}
