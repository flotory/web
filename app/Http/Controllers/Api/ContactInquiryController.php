<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ContactInquiryRequest;
use App\Mail\ContactInquiryMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class ContactInquiryController extends Controller
{
    public function store(ContactInquiryRequest $request): JsonResponse
    {
        $inquiry = [
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'venue_name' => $request->filled('venue_name')
                ? $request->string('venue_name')->toString()
                : null,
            'message' => $request->string('message')->toString(),
        ];

        Mail::to(config('flotory.support_email'))->send(new ContactInquiryMail($inquiry));

        return response()->json([
            'message' => 'Thanks — we received your message.',
        ]);
    }
}
