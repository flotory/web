<x-mail::message>
# Reset your password

Hi {{ $userName }},

We received a request to reset the password for your Flotory account.

<x-mail::button :url="$resetUrl">
Reset password
</x-mail::button>

This link expires in 60 minutes. If you did not request a reset, you can ignore this email.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
