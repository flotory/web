<!doctype html>
<html lang="<?php echo e(str_replace('_', '-', app()->getLocale())); ?>">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    <meta name="theme-color" content="#0f172a">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Loyalty">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title><?php echo e(config('app.name', 'Loyalty App')); ?></title>
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="apple-touch-icon" href="/icons/icon-180.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
    <?php echo app('Illuminate\Foundation\Vite')(['resources/css/app.css', 'resources/js/app.ts']); ?>
  </head>
  <body class="bg-slate-950 text-slate-950 antialiased">
    <div id="app"></div>
  </body>
</html>
<?php /**PATH /var/www/html/resources/views/app.blade.php ENDPATH**/ ?>