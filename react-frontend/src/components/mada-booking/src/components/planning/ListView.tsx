import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SiteWithProducts, DbReservation } from "@/hooks/use-sites";

const statusLabels: Record<string, string> = {
  confirmed: "Confirmée",
  pending: "En attente",
  cancelled: "Annulée",
  maintenance: "Maintenance",
  checked_in: "Check-in",
  checked_out: "Check-out",
};

const statusBadge: Record<string, string> = {
  confirmed: "bg-status-confirmed/15 text-emerald border-status-confirmed/30",
  pending: "bg-status-pending/15 text-sunset border-status-pending/30",
  cancelled: "bg-status-cancelled/15 text-coral border-status-cancelled/30",
  maintenance: "bg-status-maintenance/15 text-muted-foreground border-status-maintenance/30",
  checked_in: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  checked_out: "bg-purple-500/15 text-purple-600 border-purple-500/30",
};

interface Props {
  sites: SiteWithProducts[];
  onReservationClick: (res: DbReservation, productName: string, productType: string, productPrice: number) => void;
}

export default function ListView({ sites, onReservationClick }: Props) {
  const allRes = sites.flatMap(site =>
    site.products.flatMap(product =>
      product.reservations.map(r => ({
        ...r,
        siteName: site.name,
        productName: product.name,
        productType: product.type,
        productPrice: Number(product.price),
      }))
    )
  ).sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div className="rounded-xl border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead className="hidden sm:table-cell">Site</TableHead>
            <TableHead>Produit</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Pers.</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allRes.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucune réservation</TableCell></TableRow>
          )}
          {allRes.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onReservationClick(r, r.productName, r.productType, r.productPrice)}
            >
              <TableCell className="font-medium text-xs sm:text-sm">{r.client_name}</TableCell>
              <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">{r.siteName}</TableCell>
              <TableCell className="text-xs sm:text-sm">{r.productName}</TableCell>
              <TableCell className="capitalize text-xs hidden sm:table-cell">{r.productType}</TableCell>
              <TableCell className="text-[10px] sm:text-xs whitespace-nowrap">{r.start_date} → {r.end_date}</TableCell>
              <TableCell className="text-xs">{r.persons}</TableCell>
              <TableCell>
                <Badge className={cn("text-[10px] sm:text-xs border", statusBadge[r.status])}>{statusLabels[r.status]}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
