<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class InventoryTag extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'color',
        'description',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    // Automatically generate slug when creating/updating
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($tag) {
            if (!$tag->slug) {
                $tag->slug = Str::slug($tag->name);
            }
        });

        static::updating(function ($tag) {
            if ($tag->isDirty('name') && !$tag->isDirty('slug')) {
                $tag->slug = Str::slug($tag->name);
            }
        });
    }

    // Relations
    public function inventoryItems(): BelongsToMany
    {
        return $this->belongsToMany(
            InventoryItem::class,
            'inventory_item_tags',
            'inventory_tag_id',
            'inventory_item_id'
        )->withTimestamps();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByColor($query, $color)
    {
        if (!empty($color)) {
            return $query->where('color', $color);
        }
        return $query;
    }

    // Accessors
    public function getItemCountAttribute()
    {
        return $this->inventoryItems()->count();
    }

    public function getFormattedColorAttribute()
    {
        return $this->color ?: '#6c757d';
    }

    // Static methods
    public static function getPopularTags($limit = 10)
    {
        return self::withCount('inventoryItems')
            ->active()
            ->orderBy('inventory_items_count', 'desc')
            ->limit($limit)
            ->get();
    }

    public static function getTagsStats()
    {
        $totalTags = self::active()->count();
        $usedTags = self::has('inventoryItems')->count();
        $unusedTags = $totalTags - $usedTags;
        
        $colorDistribution = self::active()
            ->selectRaw('color, COUNT(*) as count')
            ->groupBy('color')
            ->get()
            ->pluck('count', 'color')
            ->toArray();

        return [
            'total_tags' => $totalTags,
            'used_tags' => $usedTags,
            'unused_tags' => $unusedTags,
            'color_distribution' => $colorDistribution
        ];
    }

    // Available colors for tags
    const AVAILABLE_COLORS = [
        '#dc3545' => 'Rouge',
        '#fd7e14' => 'Orange', 
        '#ffc107' => 'Jaune',
        '#28a745' => 'Vert',
        '#20c997' => 'Teal',
        '#17a2b8' => 'Cyan',
        '#007bff' => 'Bleu',
        '#6610f2' => 'Indigo',
        '#6f42c1' => 'Violet',
        '#e83e8c' => 'Rose',
        '#6c757d' => 'Gris',
        '#343a40' => 'Noir'
    ];
}