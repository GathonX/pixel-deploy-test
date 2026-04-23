<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ClearOldLogsCommand extends Command
{
    /**
     * Nom et signature de la commande
     *
     * @var string
     */
    protected $signature = 'logs:clear
                            {--days=30 : Nombre de jours à conserver}
                            {--dry-run : Simuler sans supprimer}';

    /**
     * Description de la commande
     *
     * @var string
     */
    protected $description = 'Nettoyer automatiquement les anciens fichiers de logs pour éviter de saturer le disque';

    /**
     * Exécuter la commande
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $dryRun = $this->option('dry-run');

        $logPath = storage_path('logs');
        $cutoffDate = now()->subDays($days);

        $this->info("🧹 Nettoyage des logs plus anciens que {$days} jours");
        $this->info("📁 Dossier : {$logPath}");
        $this->info("📅 Date limite : {$cutoffDate->toDateString()}");

        if ($dryRun) {
            $this->warn("⚠️ MODE SIMULATION - Aucune suppression réelle");
        }

        $this->line("");

        // Récupérer tous les fichiers .log
        $logFiles = File::glob($logPath . '/*.log');

        $totalSize = 0;
        $deletedSize = 0;
        $deletedCount = 0;
        $keptCount = 0;

        $this->line("📊 ANALYSE DES FICHIERS LOGS :");
        $this->line("═══════════════════════════════════════════════════════════");

        foreach ($logFiles as $file) {
            $filename = basename($file);
            $fileSize = File::size($file);
            $fileTime = File::lastModified($file);
            $fileDate = date('Y-m-d H:i:s', $fileTime);

            $totalSize += $fileSize;

            // Vérifier si le fichier est trop ancien
            if ($fileTime < $cutoffDate->timestamp) {
                $deletedSize += $fileSize;
                $deletedCount++;

                $this->line("🗑️  {$filename}");
                $this->line("    Taille: " . $this->formatBytes($fileSize));
                $this->line("    Date: {$fileDate}");
                $this->line("    ❌ À SUPPRIMER (> {$days} jours)");

                if (!$dryRun) {
                    try {
                        File::delete($file);
                        $this->line("    ✅ SUPPRIMÉ");
                    } catch (\Exception $e) {
                        $this->error("    ❌ ERREUR: " . $e->getMessage());
                    }
                }

                $this->line("");

            } else {
                $keptCount++;

                $this->line("📄 {$filename}");
                $this->line("    Taille: " . $this->formatBytes($fileSize));
                $this->line("    Date: {$fileDate}");
                $this->line("    ✅ CONSERVÉ (< {$days} jours)");
                $this->line("");
            }
        }

        // ROTATION DU FICHIER LARAVEL.LOG PRINCIPAL
        $mainLog = $logPath . '/laravel.log';
        if (File::exists($mainLog)) {
            $mainLogSize = File::size($mainLog);
            $maxSize = 10 * 1024 * 1024; // 10 MB

            if ($mainLogSize > $maxSize) {
                $this->warn("⚠️  laravel.log dépasse " . $this->formatBytes($maxSize));
                $this->warn("    Taille actuelle: " . $this->formatBytes($mainLogSize));

                if (!$dryRun) {
                    // Archiver le fichier
                    $archiveName = $logPath . '/laravel-' . now()->format('Y-m-d_His') . '.log';
                    File::move($mainLog, $archiveName);
                    File::put($mainLog, ""); // Créer nouveau fichier vide

                    $this->info("✅ laravel.log archivé vers " . basename($archiveName));
                }
            }
        }

        // Résumé final
        $this->line("═══════════════════════════════════════════════════════════");
        $this->info("📊 RÉSUMÉ DU NETTOYAGE :");
        $this->line("");
        $this->line("📁 Total fichiers analysés : " . ($deletedCount + $keptCount));
        $this->line("🗑️  Fichiers à supprimer    : {$deletedCount}");
        $this->line("✅ Fichiers conservés      : {$keptCount}");
        $this->line("");
        $this->line("💾 Espace total logs       : " . $this->formatBytes($totalSize));
        $this->line("🧹 Espace libéré           : " . $this->formatBytes($deletedSize));
        $this->line("📦 Espace restant          : " . $this->formatBytes($totalSize - $deletedSize));

        if ($deletedSize > 0) {
            $percentage = round(($deletedSize / $totalSize) * 100, 1);
            $this->line("📉 Réduction               : {$percentage}%");
        }

        $this->line("═══════════════════════════════════════════════════════════");

        if ($dryRun) {
            $this->warn("⚠️  MODE SIMULATION - Utilisez sans --dry-run pour supprimer réellement");
        } else {
            $this->info("✅ Nettoyage terminé avec succès !");

            // Log dans laravel.log
            Log::info("🧹 Nettoyage automatique des logs effectué", [
                'deleted_count' => $deletedCount,
                'deleted_size' => $deletedSize,
                'kept_count' => $keptCount,
                'total_size' => $totalSize,
                'days' => $days
            ]);
        }

        return 0;
    }

    /**
     * Formater les bytes en format lisible
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, $precision) . ' ' . $units[$i];
    }
}
