<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
class StoreRewardRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('active')) {
            $this->merge([
                'active' => filter_var($this->input('active'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }

        if ($this->has('remove_image')) {
            $this->merge([
                'remove_image' => filter_var($this->input('remove_image'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'required_stamps' => ['required', 'integer', 'min:1', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'remove_image' => ['sometimes', 'boolean'],
            'active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.mimes' => 'Use JPG, PNG, WEBP, or GIF. iPhone HEIC photos are not supported yet.',
            'image.max' => 'Image must be 5 MB or smaller.',
        ];
    }
}
