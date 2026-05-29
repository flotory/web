<x-mail::message>
# You're invited to join {{ $venueName }}

**{{ $inviterName }}** invited you to join the team at **{{ $venueName }}** on Flotory.

As a staff member you can:

- Open the scanner
- Add customer stamps
- Help customers redeem rewards

<x-mail::button :url="$acceptUrl">
Accept invitation
</x-mail::button>

This link expires in 7 days. If you did not expect this email, you can ignore it.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
