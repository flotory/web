<x-mail::message>
# New contact inquiry

**From:** {{ $inquiryName }} ({{ $inquiryEmail }})

@if ($inquiryVenueName)
**Venue / business:** {{ $inquiryVenueName }}
@endif

**Message:**

{{ $inquiryMessage }}

</x-mail::message>
