<?php

use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Models\Venue;
use App\Support\AuditLog;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        channels: __DIR__.'/../routes/channels.php',
        attributes: ['middleware' => ['auth:sanctum']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API uses Bearer tokens (see resources/js/lib/api.ts), not cookie SPA auth.
        // statefulApi() would require CSRF on /api/* from the production host.
        $middleware->api(prepend: [
            AssignRequestId::class,
        ]);

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->renderable(function (ValidationException $exception, Request $request) {
            if ($request->is('api/*')) {
                AuditLog::validationFailure($request, $exception);
            }

            return null;
        });

        $exceptions->renderable(function (NotFoundHttpException $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $previous = $exception->getPrevious();

            if (! $previous instanceof ModelNotFoundException) {
                return null;
            }

            $model = (string) $previous->getModel();

            if ($model !== Venue::class && ! str_ends_with($model, '\\Venue')) {
                return null;
            }

            return response()->json([
                'message' => 'This venue is not in your workspace.',
            ], 404);
        });
    })->create();
