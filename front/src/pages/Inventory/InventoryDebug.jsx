import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const InventoryDebug = () => {
  const { user } = useAuth();
  const [step, setStep] = useState('initial');
  const [error, setError] = useState(null);
  
  useEffect(() => {
    console.log('InventoryDebug: Component mounted');
    setStep('mounted');
    
    const checkServices = async () => {
      try {
        console.log('InventoryDebug: Checking services...');
        setStep('checking-services');
        
        // Test simple sans import du service
        console.log('InventoryDebug: Services check completed');
        setStep('services-ok');
        
      } catch (err) {
        console.error('InventoryDebug: Error in service check:', err);
        setError(err.message);
        setStep('error');
      }
    };
    
    checkServices();
  }, []);
  
  console.log('InventoryDebug: Rendering, step =', step);

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="text-primary mb-4">🔧 Debug Inventaire</h1>
          
          <div className="card">
            <div className="card-body">
              <h5>État du composant:</h5>
              <ul className="list-group list-group-flush">
                <li className={`list-group-item ${step === 'initial' ? 'bg-warning' : step === 'mounted' ? 'bg-success text-white' : ''}`}>
                  ✓ Composant initialisé
                </li>
                <li className={`list-group-item ${step === 'mounted' || step === 'checking-services' ? 'bg-warning' : step === 'services-ok' ? 'bg-success text-white' : ''}`}>
                  {step === 'checking-services' ? '⏳' : '✓'} Vérification des services
                </li>
                <li className={`list-group-item ${step === 'services-ok' ? 'bg-success text-white' : ''}`}>
                  {step === 'services-ok' ? '✅' : '⏳'} Prêt à charger l'inventaire
                </li>
              </ul>
              
              <div className="mt-3">
                <p><strong>Étape actuelle:</strong> {step}</p>
                <p><strong>Utilisateur:</strong> {user?.name || 'Non connecté'}</p>
                <p><strong>Rôle:</strong> {user?.role || 'Inconnu'}</p>
              </div>
              
              {error && (
                <div className="alert alert-danger mt-3">
                  <h6>Erreur détectée:</h6>
                  <pre>{error}</pre>
                </div>
              )}
            </div>
          </div>
          
          <div className="card mt-3">
            <div className="card-body">
              <h5>Console Log</h5>
              <p>Ouvrez les outils de développement (F12) et regardez l'onglet Console pour voir les logs détaillés.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDebug;