<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserSite;
use App\Models\SiteSection;
use App\Models\SiteGlobalSection;
use Illuminate\Support\Facades\DB;

class MigrateToGlobalSections extends Command
{
    protected $signature = 'site-builder:migrate-global-sections {--dry-run : Show what would be done without making changes}';
    protected $description = 'Migrate existing sites to use global navbar/footer sections';

    public function handle()
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('🔍 Mode dry-run activé - aucune modification ne sera effectuée');
        }

        $sites = UserSite::with(['pages.sections', 'globalSections'])->get();

        $this->info("📊 {$sites->count()} sites trouvés");

        foreach ($sites as $site) {
            $this->line("\n=== Site: {$site->name} (ID: {$site->id}) ===");

            // Skip si le site a déjà des sections globales
            if ($site->globalSections->count() > 0) {
                $this->comment("  ⏭️  Site a déjà des sections globales, ignoré");
                continue;
            }

            // Trouver la première page pour extraire navbar/footer
            $firstPage = $site->pages->sortBy('order')->first();

            if (!$firstPage) {
                $this->warn("  ⚠️  Aucune page trouvée");
                continue;
            }

            $navbarSection = $firstPage->sections->where('section_type_id', 'navbar')->first();
            $footerSection = $firstPage->sections->where('section_type_id', 'footer')->first();

            if (!$dryRun) {
                DB::beginTransaction();
                try {
                    // Créer les sections globales
                    if ($navbarSection) {
                        SiteGlobalSection::create([
                            'site_id' => $site->id,
                            'section_type_id' => 'navbar',
                            'position' => 'navbar',
                            'content' => $navbarSection->content,
                            'styles' => $navbarSection->styles,
                        ]);
                        $this->info("  ✅ Navbar global créé");
                    }

                    if ($footerSection) {
                        SiteGlobalSection::create([
                            'site_id' => $site->id,
                            'section_type_id' => 'footer',
                            'position' => 'footer',
                            'content' => $footerSection->content,
                            'styles' => $footerSection->styles,
                        ]);
                        $this->info("  ✅ Footer global créé");
                    }

                    // Supprimer navbar/footer de TOUTES les pages
                    $deletedCount = SiteSection::whereIn('page_id', $site->pages->pluck('id'))
                        ->whereIn('section_type_id', ['navbar', 'footer'])
                        ->delete();

                    $this->info("  🗑️  {$deletedCount} sections navbar/footer supprimées des pages");

                    // Réordonner les sections restantes
                    foreach ($site->pages as $page) {
                        $sections = SiteSection::where('page_id', $page->id)
                            ->orderBy('order')
                            ->get();

                        $order = 0;
                        foreach ($sections as $section) {
                            $section->update(['order' => $order++]);
                        }
                    }

                    DB::commit();
                    $this->info("  ✅ Migration terminée pour ce site");

                } catch (\Exception $e) {
                    DB::rollBack();
                    $this->error("  ❌ Erreur: " . $e->getMessage());
                }
            } else {
                // Mode dry-run - afficher ce qui serait fait
                if ($navbarSection) {
                    $this->line("  📋 Créerait navbar global depuis page '{$firstPage->name}'");
                }
                if ($footerSection) {
                    $this->line("  📋 Créerait footer global depuis page '{$firstPage->name}'");
                }

                $navbarFooterCount = 0;
                foreach ($site->pages as $page) {
                    $count = $page->sections->whereIn('section_type_id', ['navbar', 'footer'])->count();
                    $navbarFooterCount += $count;
                }
                $this->line("  📋 Supprimerait {$navbarFooterCount} sections navbar/footer des pages");
            }
        }

        $this->newLine();
        $this->info('✅ Migration terminée!');

        return Command::SUCCESS;
    }
}
