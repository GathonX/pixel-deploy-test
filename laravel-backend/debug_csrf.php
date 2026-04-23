<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

try {
    $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = '/sanctum/csrf-cookie';
    $_SERVER['HTTP_ACCEPT'] = 'application/json';
    $_SERVER['REMOTE_ADDR'] = '127.0.0.1';

    $request = Illuminate\Http\Request::capture();

    echo "=== Tentative d'accès à /sanctum/csrf-cookie ===\n\n";

    $response = $kernel->handle($request);

    echo "Status: " . $response->getStatusCode() . "\n";
    echo "Headers: \n";
    foreach ($response->headers->all() as $key => $values) {
        echo "  $key: " . implode(', ', $values) . "\n";
    }
    echo "\nContent: " . $response->getContent() . "\n";

    $kernel->terminate($request, $response);

} catch (\Throwable $e) {
    echo "\n\n=== ERREUR DÉTECTÉE ===\n";
    echo "Type: " . get_class($e) . "\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "Fichier: " . $e->getFile() . ":" . $e->getLine() . "\n\n";
    echo "Stack trace:\n";
    echo $e->getTraceAsString() . "\n";

    if ($e->getPrevious()) {
        echo "\n\n=== ERREUR PRÉCÉDENTE ===\n";
        $prev = $e->getPrevious();
        echo "Type: " . get_class($prev) . "\n";
        echo "Message: " . $prev->getMessage() . "\n";
        echo "Fichier: " . $prev->getFile() . ":" . $prev->getLine() . "\n";
    }
}
