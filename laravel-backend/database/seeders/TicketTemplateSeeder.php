<?php

namespace Database\Seeders;

use App\Models\TicketTemplate;
use Illuminate\Database\Seeder;

class TicketTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $defaultTemplates = TicketTemplate::getDefaultTemplates();
        
        foreach ($defaultTemplates as $template) {
            TicketTemplate::updateOrCreate(
                ['name' => $template['name']],
                $template
            );
        }
    }
}