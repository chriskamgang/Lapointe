<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Carbon\Carbon;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'categorie', 
        'quantite',
        'quantite_min',
        'etat',
        'localisation',
        'responsable',
        'date_achat',
        'prix',
        'numero_serie',
        'description'
    ];

    protected $casts = [
        'date_achat' => 'date',
        'prix' => 'decimal:2',
        'quantite' => 'integer',
        'quantite_min' => 'integer'
    ];

    // Constantes pour les énumérations
    const ETATS = ['Excellent', 'Bon', 'Moyen', 'Mauvais', 'Hors service'];
    
    const CATEGORIES = [
        'Informatique',
        'Audio-Visuel', 
        'Sciences',
        'Mobilier',
        'Sport',
        'Papeterie',
        'Sécurité',
        'Entretien',
        'Cuisine'
    ];

    // Scopes pour filtrer les données
    public function scopeByCategory($query, $category)
    {
        if (!empty($category)) {
            return $query->where('categorie', $category);
        }
        return $query;
    }

    public function scopeByEtat($query, $etat)
    {
        if (!empty($etat)) {
            return $query->where('etat', $etat);
        }
        return $query;
    }

    public function scopeSearch($query, $searchTerm)
    {
        if (!empty($searchTerm)) {
            return $query->where(function($q) use ($searchTerm) {
                $q->where('nom', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('localisation', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('responsable', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('numero_serie', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('description', 'LIKE', "%{$searchTerm}%");
            });
        }
        return $query;
    }

    public function scopeLowStock($query)
    {
        return $query->whereRaw('quantite <= quantite_min');
    }

    public function scopeWithTags($query, $tagIds)
    {
        if (!empty($tagIds)) {
            if (is_string($tagIds)) {
                $tagIds = explode(',', $tagIds);
            }
            return $query->whereHas('tags', function($q) use ($tagIds) {
                $q->whereIn('inventory_tags.id', $tagIds);
            });
        }
        return $query;
    }

    public function scopeWithoutTags($query)
    {
        return $query->doesntHave('tags');
    }

    // Accesseurs et mutateurs
    public function getValeurTotaleAttribute()
    {
        return $this->prix * $this->quantite;
    }

    public function getIsLowStockAttribute()
    {
        return $this->quantite <= $this->quantite_min;
    }

    public function getFormattedDateAchatAttribute()
    {
        return $this->date_achat ? $this->date_achat->format('d/m/Y') : null;
    }

    public function getFormattedPrixAttribute()
    {
        return number_format($this->prix, 0, ',', ' ') . ' FCFA';
    }

    // Méthodes statiques pour les statistiques
    public static function getStats()
    {
        $totalArticles = self::count();
        $totalQuantity = self::sum('quantite');
        $totalValue = self::sum(\DB::raw('prix * quantite'));
        $lowStockCount = self::lowStock()->count();
        $categoriesCount = self::distinct('categorie')->count();

        $categoryDistribution = self::selectRaw('categorie, COUNT(*) as count')
            ->groupBy('categorie')
            ->get()
            ->pluck('count', 'categorie')
            ->toArray();

        $stateDistribution = self::selectRaw('etat, COUNT(*) as count')
            ->groupBy('etat')
            ->get()
            ->pluck('count', 'etat')
            ->toArray();

        $locationDistribution = self::selectRaw('localisation, COUNT(*) as count')
            ->whereNotNull('localisation')
            ->where('localisation', '!=', '')
            ->groupBy('localisation')
            ->get()
            ->pluck('count', 'localisation')
            ->toArray();

        return [
            'total_articles' => $totalArticles,
            'total_quantity' => $totalQuantity,
            'total_value' => $totalValue,
            'low_stock_count' => $lowStockCount,
            'categories_count' => $categoriesCount,
            'category_distribution' => $categoryDistribution,
            'state_distribution' => $stateDistribution,
            'location_distribution' => $locationDistribution,
            'average_value' => $totalArticles > 0 ? $totalValue / $totalArticles : 0
        ];
    }

    public static function getLowStockAlerts()
    {
        return self::lowStock()->get();
    }

    // Relations
    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(
            InventoryTag::class,
            'inventory_item_tags',
            'inventory_item_id',
            'inventory_tag_id'
        )->withTimestamps();
    }

    // Méthodes de gestion des mouvements
    public function recordMovement(string $type, int $newQuantity, string $reason, ?string $notes = null, ?string $userName = null, ?int $userId = null): void
    {
        $quantityChange = $newQuantity - $this->quantite;
        
        InventoryMovement::recordMovement(
            $this->id,
            $type,
            $this->quantite,
            $quantityChange,
            $newQuantity,
            $reason,
            $notes,
            $userName,
            $userId
        );
    }

    public function updateQuantityWithMovement(int $newQuantity, string $reason, string $type = InventoryMovement::TYPE_ADJUSTMENT, ?string $notes = null, ?string $userName = null, ?int $userId = null): void
    {
        $this->recordMovement($type, $newQuantity, $reason, $notes, $userName, $userId);
        $this->update(['quantite' => $newQuantity]);
    }
}