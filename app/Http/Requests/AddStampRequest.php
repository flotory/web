<?php

namespace App\Http\Requests;

use App\Models\Venue;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddStampRequest extends FormRequest
{
    public function rules(): array
    {
        $venue = $this->route('venue');
        $venueId = $venue instanceof Venue ? $venue->id : (int) $venue;

        return [
            'qr_token' => ['required_without:customer_id', 'nullable', 'string', 'max:2048'],
            'customer_id' => [
                'required_without:qr_token',
                'nullable',
                'integer',
                Rule::exists('customers', 'id')->where(fn ($query) => $query->where('venue_id', $venueId)),
            ],
            'stamps' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
