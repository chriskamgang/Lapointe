import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Plus, Trash2, CreditCard } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import Swal from 'sweetalert2';

const CreateSchoolClass = ({ show, onHide, onSuccess, sections, levels }) => {
    const [formData, setFormData] = useState({
        name: '',
        level_id: '',
        description: '',
        is_active: true,
        series: [
            { name: '', code: '', capacity: '', is_active: true }
        ],
        payment_amounts: []
    });
    
    const [paymentTranches, setPaymentTranches] = useState([]);
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            loadPaymentTranches();
        }
    }, [show]);

    useEffect(() => {
        // Reset payment amounts when payment tranches change
        if (paymentTranches.length > 0) {
            setFormData(prev => ({
                ...prev,
                payment_amounts: paymentTranches.map(tranche => ({
                    payment_tranche_id: tranche.id,
                    amount: '',
                    is_required: true
                }))
            }));
        }
    }, [paymentTranches]);

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
        if (formData.series.length > 1) {
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
            const response = await secureApiEndpoints.schoolClasses.create(submissionData);
            
            if (response.success) {
                Swal.fire('Succès', response.message || 'Classe créée avec succès', 'success');
                onSuccess();
                resetForm();
            } else {
                Swal.fire('Erreur', response.message || 'Erreur lors de la création de la classe', 'error');
            }
        } catch (error) {
            console.error('Error creating class:', error);
            Swal.fire('Erreur', 'Erreur lors de la création de la classe', 'error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            level_id: '',
            description: '',
            is_active: true,
            series: [
                { name: '', code: '', capacity: '', is_active: true }
            ],
            payment_amounts: []
        });
        setSelectedSectionId('');
    };

    const getFilteredLevels = () => {
        return levels.filter(level => level.is_active);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" scrollable>
            <Modal.Header closeButton>
                <Modal.Title>Créer une Nouvelle Classe</Modal.Title>
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
                                        <h6 className="card-title mb-0">Série {index + 1}</h6>
                                        {formData.series.length > 1 && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => removeSeries(index)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
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
                                                                id={`required-${tranche.id}`}
                                                                checked={paymentAmount?.is_required !== false}
                                                                onChange={(e) => handlePaymentAmountChange(tranche.id, 'is_required', e.target.checked)}
                                                            />
                                                            <label className="form-check-label" htmlFor={`required-${tranche.id}`}>
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
                    {loading ? 'Création...' : 'Créer la Classe'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CreateSchoolClass;