<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemoLead extends Model
{
    protected $fillable = [
        'name',
        'email',
        'venue_name',
        'city',
        'venue_type',
        'message',
        'source',
        'utm_source',
        'utm_campaign',
    ];
}
