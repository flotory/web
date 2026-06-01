<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RequestContext
{
    public const HEADER = 'X-Request-Id';

    public const ATTRIBUTE = 'request_id';

    public static function id(?Request $request = null): ?string
    {
        $request ??= request();

        if ($request === null) {
            return null;
        }

        $id = $request->attributes->get(self::ATTRIBUTE);

        return is_string($id) && $id !== '' ? $id : null;
    }

    public static function assign(Request $request): string
    {
        $incoming = $request->header(self::HEADER);
        $id = is_string($incoming) && $incoming !== '' && strlen($incoming) <= 64
            ? $incoming
            : (string) Str::uuid();

        $request->attributes->set(self::ATTRIBUTE, $id);
        Log::shareContext(['request_id' => $id]);

        return $id;
    }
}
