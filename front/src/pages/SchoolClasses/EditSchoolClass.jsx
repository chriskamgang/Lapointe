import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Plus, Trash2, CreditCard } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import Swal from 'sweetalert2';

const EditSchoolClass = ({ show, onHide, onSuccess, classData, sections, levels }) => {
    const [formData, setFormData] = useState({
        name: '',
        level_id: '',
        description: '',
        is_active: true,
        series: [],
        payment_amounts: []
    });
    
    const [paymentTranches, setPaymentTranches] = useState([]);
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && classData) {
            loadPaymentTranches();
            initializeFormData();
        }
    }, [show, classData]);

    const initializeFormData = () => {
        setFormData({
            name: classData.name || '',
            level_id: classData.level_id || '',
            description: classData.description || '',
            is_active: classData.is_active !== undefined ? classData.is_active : true,
            series: classData.series?.map(serie => ({
                id: serie.id,
                name: serie.name || '',
                code: serie.code || '',
                capacity: serie.capacity || '',
                is_active: serie.is_active !== undefined ? serie.is_active : true
            })) || [],
            payment_amounts: classData.payment_amounts?.map(amount => ({
                id: amount.id,
                payment_tranche_id: amount.payment_tranche_id,
                amount: amount.amount || '',
                is_required: amount.is_required !== undefined ? amount.is_required : true
            })) || []
        });

        // Set section ID for level filtering
        const level = levels.find(l => l.id === classData.level_id);
        setSelectedSectionId(level?.section_id || '');
    };

    const loadPaymentTranches = async () => {
        try {
            const response = await secureApiEndpoints.paymentTranches.getAll();
            if (response.success) {
                setPaymentTranches(response.data);
            } else {
                console.error('Erreur lors du chargement des tranches:', response.message);
                setPaymentTranches([]);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des tranches:', error);
            setPaymentTranches([]);
        }
    };

    useEffect(() => {
        // Update payment amounts when payment tranches are loaded
        if (paymentTranches.length > 0 && classData) {
            console.log('Updating payment amounts with tranches loaded');
            console.log('paymentTranches:', paymentTranches);
            console.log('classData.payment_amounts:', classData.payment_amounts);
            
            const existingAmounts = classData.payment_amounts || [];
            const updatedAmounts = paymentTranches.map(tranche => {
                const existing = existingAmounts.find(amount => amount.payment_tranche_id === tranche.id);
                console.log(`For tranche ${tranche.id} (${tranche.name}), found existing:`, existing);
                
                if (existing) {
                    return {
                        id: existing.id,
                        payment_tranche_id: tranche.id,
                        amount: existing.amount || '',
                        is_required: existing.is_required !== undefined ? existing.is_required : true
                    };
                } else {
                    return {
                        payment_tranche_id: tranche.id,
                        amount: '',
                        is_required: true
                    };
                }
            });
            
            console.log('Final updatedAmounts:', updatedAmounts);
            
            setFormData(prev => ({
                ...prev,
                payment_amounts: updatedAmounts
            }));
        }
    }, [paymentTranches, classData]);

    const handleLevelChange = (levelId) => {
        const level = levels.find(l => l.id === parseInt(levelId));
        setSelectedSectionId(level?.section_id || '');
        setFormData(prev => ({ ...prev, level_id: levelId }));
    };

    const handleSeriesChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            series: prev.series.map((serie, i) => 
                i === index ? { ...serie, [field]: value } : serie
            )
        }));
    };

    const addSeries = () => {
        setFormData(prev => ({
            ...prev,
            series: [...prev.series, { name: '', code: '', capacity: '', is_active: true }]
        }));
    };

    const removeSeries = (index) => {
        const serie = formData.series[index];
        
        if (serie.id) {
            // Show confirmation for existing series
            Swal.fire({
                title: 'Confirmer la suppression',
                text: 'Êtes-vous sûr de vouloir supprimer cette série ? Cette action est irréversible.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Supprimer',
                cancelButtonText: 'Annuler'
            }).then((result) => {
                if (result.isConfirmed) {
                    setFormData(prev => ({
                        ...prev,
                        series: prev.series.filter((_, i) => i !== index)
                    }));
                }
            });
        } else {
            // Remove new series without confirmation
            setFormData(prev => ({
                ...prev,
                series: prev.series.filter((_, i) => i !== index)
            }));
        }
    };

    const handlePaymentAmountChange = (trancheId, field, value) => {
        setFormData(prev => ({
            ...prev,
            payment_amounts: prev.payment_amounts.map(amount =>
                amount.payment_tranche_id === trancheId 
                    ? { ...amount, [field]: value }
                    : amount
            )
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // Validation
            if (!formData.name.trim()) {
                Swal.fire('Erreur', 'Le nom de la classe est requis', 'error');
                return;
            }
            
            if (!formData.level_id) {
                Swal.fire('Erreur', 'Veuillez sélectionner un niveau', 'error');
                return;
            }

            // Validate series
            for (let i = 0; i < formData.series.length; i++) {
                const serie = formData.series[i];
                if (!serie.name.trim()) {
                    Swal.fire('Erreur', `Le nom de la série ${i + 1} est requis`, 'error');
                    return;
                }
            }

            // Validate payment amounts
            for (const amount of formData.payment_amounts) {
                if (amount.amount && isNaN(amount.amount)) {
                    Swal.fire('Erreur', 'Les montants doivent être des nombres', 'error');
                    return;
                }
            }

            const submissionData = {
                ...formData,
                payment_amounts: formData.payment_amounts.filter(amount => 
                    amount.amount
                )
            };

            setLoading(true);
            const response = await secureApiEndpoints.schoolClasses.update(classData.id, submissionData);
            
            if (response.success) {
                Swal.fire('Succès', response.message || 'Classe modifiée avec succès', 'success');
                onSuccess();
            } else {
                Swal.fire('Erreur', response.message || 'Erreur lors de la modification de la classe', 'error');
            }
        } catch (error) {
            console.error('Error updating class:', error);
            Swal.fire('Erreur', 'Erreur lors de la modification de la classe', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredLevels = () => {
        return levels.filter(level => level.is_active);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" scrollable>
            <Modal.Header closeButton>
                <Modal.Title>Modifier la Classe</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form onSubmit={handleSubmit}>
                    {/* Informations de base */}
                    <div className="mb-4">
                        <h6 className="text-primary mb-3">Informations de Base</h6>
                        
                        <div className="row">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Nom de la classe *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ex: 6ème A, CP1 B..."
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Niveau *</label>
                                    <select
                                        className="form-select"
                                        value={formData.level_id}
                                        onChange={(e) => handleLevelChange(e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner un niveau</option>
                                        {getFilteredLevels().map(level => (
                                            <option key={level.id} value={level.id}>
                                                {level.section?.name} - {level.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Description de la classe..."
                            />
                        </div>

                        <div className="form-check">
                            <input
                                className="form-check-input"
                                
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                id="classActive"
                            />
                            <label className="form-check-label" htmlFor="classActive">
                                Classe active
                            </label>
                        </div>
                    </div>

                    {/* Séries */}
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="text-primary mb-0">
                                {/* <Users size={16} className="me-2" /> */}
                                Séries de la Classe
                            </h6>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={addSeries}
                            >
                                <Plus size={16} className="me-1" />
                                Ajouter Série
                            </button>
                        </div>

                        {formData.series.map((serie, index) => (
                            <div key={index} className="card mb-3">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <h6 className="card-title mb-0">
                                            Série {index + 1}
                                            {serie.id && <small className="text-muted ms-2">(Existante)</small>}
                                        </h6>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => removeSeries(index)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    
                                    <div className="row">
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Nom *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={serie.name}
                                                    onChange={(e) => handleSeriesChange(index, 'name', e.target.value)}
                                                    placeholder="Ex: A, B, C..."
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Code</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={serie.code}
                                                    onChange={(e) => handleSeriesChange(index, 'code', e.target.value)}
                                                    placeholder="Code optionnel"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Capacité</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={serie.capacity}
                                                    onChange={(e) => handleSeriesChange(index, 'capacity', e.target.value)}
                                                    placeholder="Nombre max d'élèves"
                                                    min="1"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={serie.is_active}
                                            onChange={(e) => handleSeriesChange(index, 'is_active', e.target.checked)}
                                            id={`serieActive${index}`}
                                        />
                                        <label className="form-check-label" htmlFor={`serieActive${index}`}>
                                            Série active
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {formData.series.length === 0 && (
                            <div className="text-center py-4">
                                <p className="text-muted mb-3">Aucune série configurée</p>
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={addSeries}
                                >
                                    <Plus size={16} className="me-1" />
                                    Ajouter la première série
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Montants de paiement */}
                    <div className="mb-4">
                        <h6 className="text-success mb-3">
                            <CreditCard size={16} className="me-2" />
                            Montants de Paiement
                            <span className="badge bg-info ms-2">
                                {paymentTranches.length} tranche{paymentTranches.length > 1 ? 's' : ''}
                            </span>
                        </h6>
                        
                        {paymentTranches.length === 0 ? (
                            <div className="alert alert-info">
                                <p className="mb-0">
                                    <strong>Aucune tranche de paiement configurée.</strong>
                                </p>
                                <small className="text-muted">
                                    Les tranches de paiement doivent être créées avant de pouvoir configurer les montants des classes.
                                    Allez dans la section "Tranches de Paiement" pour en créer.
                                </small>
                            </div>
                        ) : (
                            <>
                                <p className="text-muted mb-3">
                                    Configurez les montants pour chaque tranche de paiement. Laissez vide pour ne pas configurer une tranche.
                                </p>

                            {paymentTranches.map((tranche) => {
                                const paymentAmount = formData.payment_amounts.find(pa => pa.payment_tranche_id === tranche.id);
                                return (
                                    <div key={tranche.id} className="card mb-3">
                                        <div className="card-body">
                                            <h6 className="card-title">{tranche.name}</h6>
                                            {tranche.description && (
                                                <p className="text-muted small mb-3">{tranche.description}</p>
                                            )}
                                            
                                            <div className="row">
                                                <div className="col-md-8">
                                                    <div className="mb-3">
                                                        <label className="form-label">Montant (FCFA)</label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={paymentAmount?.amount || ''}
                                                            onChange={(e) => handlePaymentAmountChange(tranche.id, 'amount', e.target.value)}
                                                            placeholder="Montant pour cette tranche"
                                                            min="0"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="mb-3">
                                                        <label className="form-label">Obligatoire</label>
                                                        <div className="form-check mt-2">
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input"
                                                                id={`required-edit-${tranche.id}`}
                                                                checked={paymentAmount?.is_required !== false}
                                                                onChange={(e) => handlePaymentAmountChange(tranche.id, 'is_required', e.target.checked)}
                                                            />
                                                            <label className="form-check-label" htmlFor={`required-edit-${tranche.id}`}>
                                                                Requis
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            </>
                        )}
                    </div>
                </form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Annuler
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? 'Modification...' : 'Modifier la Classe'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EditSchoolClass;