<x-mail::message>
# You're invited to Flotory

@if ($isNewVenueOnboarding)
You've been invited to launch **{{ $venueName }}** on Flotory.

Use the link below to create your account, set up your venue, and upload branding for review.
@else
You've been invited to manage **{{ $venueName }}** on Flotory.
@endif

This link expires on **{{ $expiresAt }}**.

<x-mail::button :url="$registerUrl">
Accept invitation
</x-mail::button>

If you didn't expect this email, you can ignore it.

</x-mail::message>
