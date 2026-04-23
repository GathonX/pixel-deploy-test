// This file delegates to the main app's hook (src/hooks/use-reservations.ts)
// which is resolved via the @/ alias at build time.
export {
  createReservation,
  updateReservationStatus,
  updateReservation,
  setMaintenance,
  checkAvailability,
} from "@/hooks/use-reservations";
