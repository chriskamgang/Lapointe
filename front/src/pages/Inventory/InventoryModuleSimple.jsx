import React from 'react';

const InventoryModuleSimple = () => {
  console.log('InventoryModuleSimple: Component is rendering');
  
  try {
    return (
      <div className="container-fluid py-4">
        <div className="row">
          <div className="col-12">
            <h1>Test Inventaire</h1>
            <p>Si vous voyez ce message, le composant de base fonctionne.</p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('InventoryModuleSimple: Error in render:', error);
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          Erreur dans le composant: {error.message}
        </div>
      </div>
    );
  }
};

export default InventoryModuleSimple;