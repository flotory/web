<?php

namespace App\Http\Middleware;

use App\Support\RequestContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AssignRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = RequestContext::assign($request);

        /** @var Response $response */
        $response = $next($request);

        $response->headers->set(RequestContext::HEADER, $requestId);

        return $response;
    }
}
