<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StaffScanRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'scan' => ['required', 'string', 'max:2048'],
            'stamps' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
