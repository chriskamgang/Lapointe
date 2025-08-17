import { Edit, Trash2, Package, MapPin, User, Calendar, Hash, AlertTriangle } from 'lucide-react';

const ArticleList = ({ articles, onEdit, onDelete, loading }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount).replace('XAF', 'FCFA');
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Bon': return 'bg-blue-100 text-blue-800';
      case 'Correct': return 'bg-yellow-100 text-yellow-800';
      case 'Défaillant': return 'bg-orange-100 text-orange-800';
      case 'Hors service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Mobilier': 'bg-purple-100 text-purple-800',
      'Informatique': 'bg-blue-100 text-blue-800',
      'Fournitures': 'bg-green-100 text-green-800',
      'Equipement sportif': 'bg-orange-100 text-orange-800',
      'Matériel pédagogique': 'bg-indigo-100 text-indigo-800',
      'Sécurité': 'bg-red-100 text-red-800',
      'Entretien': 'bg-yellow-100 text-yellow-800',
      'Cuisine': 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Chargement des articles...</span>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun article trouvé</h3>
        <p className="mt-1 text-sm text-gray-500">
          Aucun article ne correspond à vos critères de recherche.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Version desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Article</span>
                  <span className="text-sm font-medium text-gray-900 normal-case">Liste des articles ({articles.length})</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantité
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                État
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Localisation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responsable
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {articles.map((article) => (
              <tr key={article.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Package className="h-8 w-8 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {article.nom}
                      </div>
                      {article.numero_serie && (
                        <div className="text-xs text-gray-500 flex items-center">
                          <Hash className="h-3 w-3 mr-1" />
                          {article.numero_serie}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(article.categorie)}`}>
                    {article.categorie}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">{article.quantite}</span>
                    {article.quantite <= 5 && (
                      <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStateColor(article.etat)}`}>
                    {article.etat}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {article.localisation || 'Non spécifiée'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {article.responsable || 'Non assigné'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onEdit(article)}
                      className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(article.id)}
                      className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Version mobile */}
      <div className="lg:hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">
            Liste des articles ({articles.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {articles.map((article) => (
          <div key={article.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Package className="h-8 w-8 text-gray-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{article.nom}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(article.categorie)}`}>
                    {article.categorie}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEdit(article)}
                  className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(article.id)}
                  className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Quantité:</span>
                <div className="flex items-center">
                  <span className="font-medium">{article.quantite}</span>
                  {article.quantite <= 5 && (
                    <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-500">État:</span>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStateColor(article.etat)}`}>
                    {article.etat}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Localisation:</span>
                <div className="font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {article.localisation || 'Non spécifiée'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Responsable:</span>
                <div className="font-medium flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {article.responsable || 'Non assigné'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Prix unitaire:</span>
                <div className="font-medium">{formatCurrency(article.prix)}</div>
              </div>
              <div>
                <span className="text-gray-500">Valeur totale:</span>
                <div className="font-medium">{formatCurrency(article.prix * article.quantite)}</div>
              </div>
            </div>

            {(article.numero_serie || article.date_achat) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  {article.numero_serie && (
                    <div>
                      <span className="text-gray-500">N° série:</span>
                      <div className="flex items-center font-medium">
                        <Hash className="h-4 w-4 mr-1" />
                        <span>{article.numero_serie}</span>
                      </div>
                    </div>
                  )}
                  {article.date_achat && (
                    <div>
                      <span className="text-gray-500">Date d'achat:</span>
                      <div className="flex items-center font-medium">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{new Date(article.date_achat).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {article.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">{article.description}</p>
              </div>
            )}
          </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArticleList;