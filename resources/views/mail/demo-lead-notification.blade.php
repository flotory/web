<x-mail::message>
# New demo lead

**{{ $lead->name }}** ({{ $lead->email }}) shared details before booking a demo.

@if ($lead->venue_name)
**Venue:** {{ $lead->venue_name }}
@endif

@if ($lead->city)
**City:** {{ $lead->city }}
@endif

@if ($lead->venue_type)
**Type:** {{ ucfirst($lead->venue_type) }}
@endif

@if ($lead->message)
**Note:** {{ $lead->message }}
@endif

**Source:** {{ $lead->source }}

@if ($lead->utm_source || $lead->utm_campaign)
**Campaign:** {{ $lead->utm_source ?? '—' }} / {{ $lead->utm_campaign ?? '—' }}
@endif

Reply to {{ $lead->email }} to confirm their demo time if they have not picked a slot yet.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
