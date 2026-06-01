<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RedeemScanRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'redemption_token' => ['required', 'uuid'],
        ];
    }
}
