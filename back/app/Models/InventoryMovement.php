<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    protected $fillable = [
        'inventory_item_id',
        'type',
        'quantity_before',
        'quantity_change',
        'quantity_after',
        'reason',
        'notes',
        'user_name',
        'user_id',
        'movement_date'
    ];

    protected $casts = [
        'movement_date' => 'date',
        'quantity_before' => 'integer',
        'quantity_change' => 'integer',
        'quantity_after' => 'integer',
        'user_id' => 'integer'
    ];

    // Constantes pour les types de mouvements
    const TYPE_IN = 'in';
    const TYPE_OUT = 'out';
    const TYPE_ADJUSTMENT = 'adjustment';

    const TYPES = [
        self::TYPE_IN => 'Entrée',
        self::TYPE_OUT => 'Sortie',
        self::TYPE_ADJUSTMENT => 'Ajustement'
    ];

    // Relations
    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    // Accesseurs
    public function getTypeDisplayAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    public function getFormattedMovementDateAttribute(): string
    {
        return $this->movement_date ? $this->movement_date->format('d/m/Y') : '';
    }

    public function getFormattedCreatedAtAttribute(): string
    {
        return $this->created_at ? $this->created_at->format('d/m/Y H:i') : '';
    }

    // Scopes
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeForItem($query, $itemId)
    {
        return $query->where('inventory_item_id', $itemId);
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('movement_date', '>=', now()->subDays($days));
    }

    // Méthodes statiques
    public static function recordMovement(
        int $inventoryItemId,
        string $type,
        int $quantityBefore,
        int $quantityChange,
        int $quantityAfter,
        string $reason,
        ?string $notes = null,
        ?string $userName = null,
        ?int $userId = null
    ): self {
        return self::create([
            'inventory_item_id' => $inventoryItemId,
            'type' => $type,
            'quantity_before' => $quantityBefore,
            'quantity_change' => $quantityChange,
            'quantity_after' => $quantityAfter,
            'reason' => $reason,
            'notes' => $notes,
            'user_name' => $userName,
            'user_id' => $userId,
            'movement_date' => now()->toDateString()
        ]);
    }
}
