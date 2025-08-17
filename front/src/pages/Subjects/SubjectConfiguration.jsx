import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Badge, Card, InputGroup, Table } from 'react-bootstrap';
import { LoadingSpinner } from '../../components/UI';
import { Check, X, Plus, Trash } from 'react-bootstrap-icons';
import { useApi } from '../../hooks/useApi';
import Swal from 'sweetalert2';

const SubjectConfiguration = ({ show, onHide, classSeries }) => {
    const { apiCall, loading } = useApi();
    const [subjects, setSubjects] = useState([]);
    const [configurations, setConfigurations] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (show && classSeries) {
            loadData();
        }
    }, [show, classSeries]);

    const loadData = async () => {
        try {
            // Charger toutes les matières actives
            const subjectsResponse = await apiCall('/subjects?active=true');
            if (subjectsResponse.success) {
                setSubjects(subjectsResponse.data);
            }

            // Charger les configurations existantes pour cette série
            const configResponse = await apiCall(`/subjects/series/${classSeries.id}`);
            if (configResponse.success) {
                const existingConfigs = configResponse.data;
                
                // Créer les configurations avec les matières existantes et nouvelles
                const allConfigs = subjectsResponse.data.map(subject => {
                    const existing = existingConfigs.find(config => config.id === subject.id);
                    return {
                        subject_id: subject.id,
                        subject_name: subject.name,
                        subject_code: subject.code,
                        coefficient: existing ? existing.pivot.coefficient : 1.00,
                        is_active: existing ? existing.pivot.is_active : false,
                        is_new: !existing
                    };
                });

                setConfigurations(allConfigs);
            }
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            Swal.fire('Erreur', 'Impossible de charger les données', 'error');
        }
    };

    const handleConfigurationChange = (index, field, value) => {
        const newConfigurations = [...configurations];
        newConfigurations[index][field] = value;
        setConfigurations(newConfigurations);
        setHasChanges(true);

        // Nettoyer les erreurs
        if (formErrors[`subjects.${index}.${field}`]) {
            const newErrors = { ...formErrors };
            delete newErrors[`subjects.${index}.${field}`];
            setFormErrors(newErrors);
        }
    };

    const handleSubmit = async () => {
        try {
            // Filtrer seulement les matières actives
            const activeConfigs = configurations.filter(config => config.is_active);
            
            if (activeConfigs.length === 0) {
                Swal.fire('Attention', 'Vous devez sélectionner au moins une matière', 'warning');
                return;
            }

            const payload = {
                subjects: activeConfigs.map(config => ({
                    subject_id: config.subject_id,
                    coefficient: parseFloat(config.coefficient),
                    is_active: config.is_active
                }))
            };

            const response = await apiCall(`/subjects/series/${classSeries.id}/configure`, {
                method: 'POST',
                data: payload
            });

            if (response.success) {
                Swal.fire('Succès!', 'Configuration des matières mise à jour avec succès', 'success');
                setHasChanges(false);
                onHide();
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
            } else {
                Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
            }
        }
    };

    const handleClose = () => {
        if (hasChanges) {
            Swal.fire({
                title: 'Modifications non sauvegardées',
                text: 'Voulez-vous fermer sans sauvegarder les modifications ?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Oui, fermer',
                cancelButtonText: 'Annuler'
            }).then((result) => {
                if (result.isConfirmed) {
                    setHasChanges(false);
                    onHide();
                }
            });
        } else {
            onHide();
        }
    };

    const getActiveSubjectsCount = () => {
        return configurations.filter(config => config.is_active).length;
    };

    const getTotalCoefficient = () => {
        return configurations
            .filter(config => config.is_active)
            .reduce((sum, config) => sum + parseFloat(config.coefficient || 0), 0)
            .toFixed(2);
    };

    if (!classSeries) return null;

    return (
        <Modal show={show} onHide={handleClose} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>
                    Configuration des Matières - {classSeries.full_name}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading && configurations.length === 0 ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {/* Statistiques */}
                        <div className="row mb-4">
                            <div className="col-md-4">
                                <Card className="text-center">
                                    <Card.Body>
                                        <h5 className="text-primary">{getActiveSubjectsCount()}</h5>
                                        <small className="text-muted">Matières sélectionnées</small>
                                    </Card.Body>
                                </Card>
                            </div>
                            <div className="col-md-4">
                                <Card className="text-center">
                                    <Card.Body>
                                        <h5 className="text-success">{getTotalCoefficient()}</h5>
                                        <small className="text-muted">Total des coefficients</small>
                                    </Card.Body>
                                </Card>
                            </div>
                            <div className="col-md-4">
                                <Card className="text-center">
                                    <Card.Body>
                                        <h5 className="text-info">{subjects.length}</h5>
                                        <small className="text-muted">Matières disponibles</small>
                                    </Card.Body>
                                </Card>
                            </div>
                        </div>

                        {/* Configuration des matières */}
                        <Card>
                            <Card.Header>
                                <h6 className="mb-0">Sélection et Configuration des Matières</h6>
                            </Card.Header>
                            <Table responsive>
                                <thead>
                                    <tr>
                                        <th width="50">Actif</th>
                                        <th>Code</th>
                                        <th>Matière</th>
                                        <th width="150">Coefficient</th>
                                        <th width="100">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {configurations.map((config, index) => (
                                        <tr key={config.subject_id} className={config.is_active ? 'table-light' : ''}>
                                            <td>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={config.is_active}
                                                    onChange={(e) => handleConfigurationChange(index, 'is_active', e.target.checked)}
                                                />
                                            </td>
                                            <td>
                                                <code className="fs-6">{config.subject_code}</code>
                                            </td>
                                            <td>
                                                <strong>{config.subject_name}</strong>
                                            </td>
                                            <td>
                                                <InputGroup size="sm">
                                                    <Form.Control
                                                        type="number"
                                                        step="0.1"
                                                        min="0.1"
                                                        max="10"
                                                        value={config.coefficient}
                                                        onChange={(e) => handleConfigurationChange(index, 'coefficient', e.target.value)}
                                                        disabled={!config.is_active}
                                                        isInvalid={!!formErrors[`subjects.${index}.coefficient`]}
                                                    />
                                                </InputGroup>
                                                {formErrors[`subjects.${index}.coefficient`] && (
                                                    <div className="invalid-feedback d-block">
                                                        {formErrors[`subjects.${index}.coefficient`][0]}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {config.is_new ? (
                                                    <Badge bg="info">Nouvelle</Badge>
                                                ) : (
                                                    <Badge bg="secondary">Existante</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card>

                        {/* Informations complémentaires */}
                        <Alert variant="info" className="mt-3">
                            <h6>Informations :</h6>
                            <ul className="mb-0">
                                <li>Sélectionnez les matières que vous souhaitez enseigner dans cette série</li>
                                <li>Le coefficient détermine l'importance de la matière dans le calcul des moyennes</li>
                                <li>Un coefficient plus élevé donne plus de poids à la matière</li>
                                <li>Les coefficients doivent être compris entre 0.1 et 10</li>
                            </ul>
                        </Alert>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer className="d-flex justify-content-between">
                <div>
                    {hasChanges && (
                        <small className="text-warning">
                            <i>Modifications non sauvegardées</i>
                        </small>
                    )}
                </div>
                <div>
                    <Button variant="secondary" onClick={handleClose} className="me-2">
                        Annuler
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSubmit} 
                        disabled={loading || getActiveSubjectsCount() === 0}
                    >
                        {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default SubjectConfiguration;