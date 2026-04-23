
import jsPDF from 'jspdf';

export const generateInvoicePDF = (
  invoiceId: string,
  date: string,
  amount: number,
  plan: string,
  method: string
): void => {
  // Créer un nouveau document PDF
  const doc = new jsPDF();
  
  // Définir le titre et les styles
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("FACTURE", 105, 20, { align: "center" });
  
  // Logo et informations de l'entreprise (placeholder)
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("BlogAI", 20, 40);
  doc.text("123 Rue du Web", 20, 46);
  doc.text("75000 Paris, France", 20, 52);
  doc.text("contact@blogai.com", 20, 58);
  
  // Informations de facturation
  doc.setFont("helvetica", "bold");
  doc.text("Facture à:", 130, 40);
  doc.setFont("helvetica", "normal");
  doc.text("Client", 130, 46);
  doc.text("Référence client", 130, 52);
  
  // Détails de la facture
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Numéro de facture:", 20, 80);
  doc.text("Date:", 20, 87);
  doc.text("Méthode de paiement:", 20, 94);
  
  doc.setFont("helvetica", "normal");
  doc.text(invoiceId, 70, 80);
  doc.text(new Date(date).toLocaleDateString('fr-FR'), 70, 87);
  doc.text(method, 70, 94);
  
  // Tableau des articles
  doc.line(20, 110, 190, 110);
  
  doc.setFont("helvetica", "bold");
  doc.text("Description", 25, 118);
  doc.text("Prix", 160, 118);
  
  doc.line(20, 122, 190, 122);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Abonnement ${plan}`, 25, 130);
  doc.text(`${amount.toFixed(2)} €`, 160, 130);
  
  doc.line(20, 150, 190, 150);
  
  // Total
  doc.setFont("helvetica", "bold");
  doc.text("Total:", 130, 158);
  doc.text(`${amount.toFixed(2)} €`, 160, 158);
  
  // Pied de page
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Merci pour votre confiance!", 105, 240, { align: "center" });
  doc.text("BlogAI - Simplifiez votre contenu web", 105, 246, { align: "center" });
  
  // Enregistrer le PDF
  doc.save(`facture-${invoiceId}.pdf`);
};
