import { useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';

const TestInventory = () => {
  useEffect(() => {
    const testService = async () => {
      console.log('=== TEST DU SERVICE INVENTAIRE ===');
      
      try {
        // Test de récupération
        console.log('1. Test getAll()...');
        const articles = await inventoryService.getAll();
        console.log('Articles récupérés:', articles);
        console.log('Nombre d\'articles:', articles.length);

        // Test de création
        console.log('2. Test create()...');
        const testArticle = {
          nom: 'Article de test',
          categorie: 'Informatique',
          quantite: 1,
          etat: 'Excellent',
          localisation: 'Bureau test',
          responsable: 'Test User',
          prix: 1000,
          date_achat: '2024-01-01',
          numero_serie: 'TEST-001'
        };
        
        const createdArticle = await inventoryService.create(testArticle);
        console.log('Article créé:', createdArticle);

        // Re-test de récupération
        console.log('3. Re-test getAll() après création...');
        const updatedArticles = await inventoryService.getAll();
        console.log('Articles après création:', updatedArticles);
        console.log('Nouveau nombre d\'articles:', updatedArticles.length);

      } catch (error) {
        console.error('ERREUR DANS LES TESTS:', error);
      }
    };

    testService();
  }, []);

  return (
    <div className="p-4">
      <h1>Test du Service Inventaire</h1>
      <p>Ouvrez la console pour voir les résultats des tests.</p>
    </div>
  );
};

export default TestInventory;