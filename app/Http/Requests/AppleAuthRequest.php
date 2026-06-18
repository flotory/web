<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AppleAuthRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'id_token' => ['required', 'string'],
            'name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'device_name' => ['sometimes', 'string', 'max:120'],
        ];
    }
}
