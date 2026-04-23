import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useCurrency } from "@/hooks/use-devis-config";

interface ExportData {
  client: string;
  produit: string;
  debut: string;
  fin: string;
  statut: string;
  personnes: number;
  prix: number;
}

interface ExportMenuProps {
  data: ExportData[];
  title?: string;
}

export default function ExportMenu({ data, title = "Export Réservations" }: ExportMenuProps) {
  const currency = useCurrency();

  const exportCSV = () => {
    if (data.length === 0) { toast.info("Aucune donnée à exporter"); return; }
    const headers = ["Client", "Produit", "Début", "Fin", "Statut", "Personnes", `Prix (${currency})`];
    const rows = data.map(d => [d.client, d.produit, d.debut, d.fin, d.statut, String(d.personnes), String(d.prix)]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `madagasbooking-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV téléchargé");
  };

  const exportPDF = () => {
    if (data.length === 0) { toast.info("Aucune donnée à exporter"); return; }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("MadagasBooking", 14, 15);
    doc.setFontSize(10);
    doc.text(`${title} — ${new Date().toLocaleDateString("fr-FR")}`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [["Client", "Produit", "Début", "Fin", "Statut", "Pers.", "Prix"]],
      body: data.map(d => [d.client, d.produit, d.debut, d.fin, d.statut, String(d.personnes), `${d.prix}${currency}`]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 128, 128] },
    });

    doc.save(`madagasbooking-export-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF téléchargé");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportCSV} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF} className="gap-2">
          <FileText className="h-4 w-4" /> Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
