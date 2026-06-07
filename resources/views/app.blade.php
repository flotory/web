<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#081233">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Flotory">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>{{ config('app.name', 'Flotory') }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
    @php($iconV = config('flotory.icon_version', '1'))
    <link rel="manifest" href="/manifest.webmanifest?v={{ $iconV }}">
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png?v={{ $iconV }}">
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png?v={{ $iconV }}">
    <link rel="apple-touch-icon" href="/icons/icon-180.png?v={{ $iconV }}">
    @vite(['resources/css/app.css', 'resources/js/app.ts'])
  </head>
  <body class="bg-slate-950 font-sans text-slate-950 antialiased">
    <div id="app"></div>
  </body>
</html>
