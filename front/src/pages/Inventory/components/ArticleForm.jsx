import { useState, useEffect } from 'react';
import { Save, X, Package, User, MapPin, Calendar, Hash } from 'lucide-react';

const ArticleForm = ({ article, categories, states, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nom: '',
    categorie: '',
    quantite: 1,
    quantite_min: 1,
    etat: 'Excellent',
    localisation: '',
    responsable: '',
    prix: 0,
    date_achat: new Date().toISOString().split('T')[0],
    numero_serie: '',
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (article) {
      setFormData({
        nom: article.nom || '',
        categorie: article.categorie || '',
        quantite: article.quantite || 1,
        quantite_min: article.quantite_min || 1,
        etat: article.etat || 'Excellent',
        localisation: article.localisation || '',
        responsable: article.responsable || '',
        prix: article.prix || 0,
        date_achat: article.date_achat ? new Date(article.date_achat).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        numero_serie: article.numero_serie || '',
        description: article.description || ''
      });
    }
  }, [article]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!formData.categorie) {
      newErrors.categorie = 'La catégorie est requise';
    }

    if (formData.quantite <= 0) {
      newErrors.quantite = 'La quantité doit être supérieure à 0';
    }

    if (formData.quantite_min <= 0) {
      newErrors.quantite_min = 'La quantité minimale doit être supérieure à 0';
    }

    if (formData.prix < 0) {
      newErrors.prix = 'Le prix ne peut pas être négatif';
    }

    if (!formData.date_achat) {
      newErrors.date_achat = 'La date d\'achat est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Formulaire soumis:', formData);
    
    if (!validateForm()) {
      console.log('Validation échouée:', errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const articleToSave = {
        ...formData,
        quantite: parseInt(formData.quantite),
        quantite_min: parseInt(formData.quantite_min),
        prix: parseFloat(formData.prix)
      };
      console.log('Données à sauvegarder:', articleToSave);
      await onSave(articleToSave);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Nettoyer les erreurs quand l'utilisateur commence à taper
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount).replace('XAF', 'FCFA');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {article ? 'Modifier l\'article' : 'Nouvel article'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Informations de base
            </h3>

            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'article *
              </label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.nom ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ex: Bureau directeur, Ordinateur portable..."
              />
              {errors.nom && <p className="mt-1 text-sm text-red-600">{errors.nom}</p>}
            </div>

            <div>
              <label htmlFor="categorie" className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie *
              </label>
              <select
                id="categorie"
                name="categorie"
                value={formData.categorie}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.categorie ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.categorie && <p className="mt-1 text-sm text-red-600">{errors.categorie}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="quantite" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité *
                </label>
                <input
                  type="number"
                  id="quantite"
                  name="quantite"
                  min="1"
                  value={formData.quantite}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.quantite ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.quantite && <p className="mt-1 text-sm text-red-600">{errors.quantite}</p>}
              </div>

              <div>
                <label htmlFor="quantite_min" className="block text-sm font-medium text-gray-700 mb-1">
                  Seuil minimal *
                </label>
                <input
                  type="number"
                  id="quantite_min"
                  name="quantite_min"
                  min="1"
                  value={formData.quantite_min}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.quantite_min ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.quantite_min && <p className="mt-1 text-sm text-red-600">{errors.quantite_min}</p>}
              </div>

              <div>
                <label htmlFor="etat" className="block text-sm font-medium text-gray-700 mb-1">
                  État
                </label>
                <select
                  id="etat"
                  name="etat"
                  value={formData.etat}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description détaillée de l'article..."
              />
            </div>
          </div>

          {/* Informations de gestion */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Informations de gestion
            </h3>

            <div>
              <label htmlFor="localisation" className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Localisation</span>
                </div>
              </label>
              <input
                type="text"
                id="localisation"
                name="localisation"
                value={formData.localisation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Bureau directeur, Salle informatique, Cour..."
              />
            </div>

            <div>
              <label htmlFor="responsable" className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Responsable</span>
                </div>
              </label>
              <input
                type="text"
                id="responsable"
                name="responsable"
                value={formData.responsable}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: M. Dupont, Service informatique..."
              />
            </div>

            <div>
              <label htmlFor="numero_serie" className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4" />
                  <span>Numéro de série</span>
                </div>
              </label>
              <input
                type="text"
                id="numero_serie"
                name="numero_serie"
                value={formData.numero_serie}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: ABC123456789..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="prix" className="block text-sm font-medium text-gray-700 mb-1">
                  Prix unitaire (FCFA)
                </label>
                <input
                  type="number"
                  id="prix"
                  name="prix"
                  min="0"
                  step="1"
                  value={formData.prix}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.prix ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.prix && <p className="mt-1 text-sm text-red-600">{errors.prix}</p>}
                {formData.prix > 0 && (
                  <p className="mt-1 text-sm text-gray-600">
                    Valeur totale: {formatCurrency(formData.prix * formData.quantite)}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="date_achat" className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Date d'achat *</span>
                  </div>
                </label>
                <input
                  type="date"
                  id="date_achat"
                  name="date_achat"
                  value={formData.date_achat}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.date_achat ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.date_achat && <p className="mt-1 text-sm text-red-600">{errors.date_achat}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Récapitulatif */}
        {formData.nom && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Récapitulatif</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Article:</strong> {formData.nom}</p>
              <p><strong>Catégorie:</strong> {formData.categorie}</p>
              <p><strong>Quantité:</strong> {formData.quantite} unité{formData.quantite > 1 ? 's' : ''}</p>
              <p><strong>Seuil minimal:</strong> {formData.quantite_min}</p>
              <p><strong>État:</strong> {formData.etat}</p>
              {formData.prix > 0 && (
                <p><strong>Valeur totale:</strong> {formatCurrency(formData.prix * formData.quantite)}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ArticleForm;