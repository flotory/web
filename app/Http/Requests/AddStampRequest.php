<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddStampRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'qr_token' => ['required', 'uuid', 'exists:customers,qr_token'],
            'stamps' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
