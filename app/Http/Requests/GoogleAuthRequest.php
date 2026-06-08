<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GoogleAuthRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'id_token' => ['required', 'string'],
            'device_name' => ['sometimes', 'string', 'max:120'],
        ];
    }
}
