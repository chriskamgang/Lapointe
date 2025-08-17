import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { ArrowRightCircle, PersonFillExclamation } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../utils/apiMigration';
import Swal from 'sweetalert2';

const StudentTransfer = ({ student, show, onHide, onTransferSuccess }) => {
    const [availableClasses, setAvailableClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSeriesId, setSelectedSeriesId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (show) {
            loadAvailableClasses();
            setSelectedClassId('');
            setSelectedSeriesId('');
            setError('');
        }
    }, [show]);

    const loadAvailableClasses = async () => {
        try {
            setLoadingClasses(true);
            const response = await secureApiEndpoints.schoolClasses.getAll();
            
            if (response.success) {
                // Filtrer pour exclure la classe actuelle de l'élève
                const filteredClasses = response.data?.filter(cls => {
                    const currentSeriesId = student?.class_series_id || student?.series_id;
                    return !cls.series?.some(series => series.id === currentSeriesId);
                }) || [];
                
                setAvailableClasses(filteredClasses);
            } else {
                setError('Erreur lors du chargement des classes disponibles');
            }
        } catch (error) {
            console.error('Error loading classes:', error);
            setError('Erreur lors du chargement des classes disponibles');
        } finally {
            setLoadingClasses(false);
        }
    };

    const getAvailableSeries = () => {
        if (!selectedClassId) return [];
        
        const selectedClass = availableClasses.find(cls => cls.id === parseInt(selectedClassId));
        return selectedClass?.series || [];
    };

    const handleClassChange = (classId) => {
        setSelectedClassId(classId);
        setSelectedSeriesId(''); // Reset series selection
    };

    const getCurrentClassInfo = () => {
        if (!student) return { className: 'Non définie', seriesName: 'Non définie' };
        
        return {
            className: student.class_series?.school_class?.name || student.current_class || 'Non définie',
            seriesName: student.class_series?.name || 'Non définie'
        };
    };

    const getSelectedClassInfo = () => {
        if (!selectedClassId || !selectedSeriesId) return null;
        
        const selectedClass = availableClasses.find(cls => cls.id === parseInt(selectedClassId));
        const selectedSeries = selectedClass?.series?.find(series => series.id === parseInt(selectedSeriesId));
        
        return {
            className: selectedClass?.name || '',
            seriesName: selectedSeries?.name || ''
        };
    };

    const handleTransfer = async () => {
        if (!selectedSeriesId) {
            setError('Veuillez sélectionner une série de destination');
            return;
        }

        const currentInfo = getCurrentClassInfo();
        const newInfo = getSelectedClassInfo();

        if (!newInfo) {
            setError('Informations de destination invalides');
            return;
        }

        // Confirmation
        const result = await Swal.fire({
            title: 'Confirmer le transfert',
            html: `
                <div class="text-start">
                    <p><strong>Élève :</strong> ${student.first_name} ${student.last_name}</p>
                    <hr>
                    <p><strong>Classe actuelle :</strong><br>
                       ${currentInfo.className} - ${currentInfo.seriesName}</p>
                    <p><strong>Nouvelle classe :</strong><br>
                       ${newInfo.className} - ${newInfo.seriesName}</p>
                    <hr>
                    <p class="text-warning">
                        <small>⚠️ Cette action est irréversible. L'élève sera transféré immédiatement.</small>
                    </p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Transférer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d'
        });

        if (!result.isConfirmed) return;

        try {
            setLoading(true);
            setError('');

            // Utiliser l'endpoint de transfert vers une série
            const response = await secureApiEndpoints.students.transferToSeries(student.id, selectedSeriesId);

            if (response.success) {
                Swal.fire({
                    title: 'Transfert réussi !',
                    text: `${student.first_name} ${student.last_name} a été transféré(e) vers ${newInfo.className} - ${newInfo.seriesName}`,
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });

                if (onTransferSuccess) {
                    onTransferSuccess(response.data || student, newInfo);
                }
                
                onHide();
            } else {
                setError(response.message || 'Erreur lors du transfert');
            }
        } catch (error) {
            console.error('Error transferring student:', error);
            setError('Erreur lors du transfert de l\'élève');
        } finally {
            setLoading(false);
        }
    };

    if (!student) return null;

    const currentInfo = getCurrentClassInfo();
    const availableSeries = getAvailableSeries();

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <ArrowRightCircle className="me-2 text-primary" />
                    Transférer un élève
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* Informations de l'élève */}
                <div className="mb-4 p-3 bg-light rounded">
                    <h6 className="mb-2">
                        <PersonFillExclamation className="me-2 text-info" />
                        Élève à transférer
                    </h6>
                    <div className="row">
                        <div className="col-md-6">
                            <strong>{student.first_name} {student.last_name}</strong>
                            <br />
                            <small className="text-muted">
                                N° {student.student_number || student.id}
                            </small>
                        </div>
                        <div className="col-md-6">
                            <small className="text-muted">Classe actuelle :</small>
                            <br />
                            <span className="badge bg-secondary">
                                {currentInfo.className} - {currentInfo.seriesName}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sélection de la nouvelle classe */}
                <div className="mb-3">
                    <Form.Label>Nouvelle classe *</Form.Label>
                    {loadingClasses ? (
                        <div className="text-center py-3">
                            <Spinner animation="border" size="sm" className="me-2" />
                            Chargement des classes...
                        </div>
                    ) : (
                        <Form.Select
                            value={selectedClassId}
                            onChange={(e) => handleClassChange(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Sélectionner une classe</option>
                            {availableClasses.map(cls => (
                                <option key={cls.id} value={cls.id}>
                                    {cls.name} ({cls.level?.name} - {cls.level?.section?.name})
                                </option>
                            ))}
                        </Form.Select>
                    )}
                </div>

                {/* Sélection de la série */}
                {selectedClassId && (
                    <div className="mb-3">
                        <Form.Label>Série de destination *</Form.Label>
                        <Form.Select
                            value={selectedSeriesId}
                            onChange={(e) => setSelectedSeriesId(e.target.value)}
                            disabled={loading || availableSeries.length === 0}
                        >
                            <option value="">Sélectionner une série</option>
                            {availableSeries.map(series => (
                                <option key={series.id} value={series.id}>
                                    {series.name} {series.code && `(${series.code})`}
                                    {series.capacity && ` - Capacité: ${series.capacity}`}
                                </option>
                            ))}
                        </Form.Select>
                        
                        {selectedClassId && availableSeries.length === 0 && (
                            <Form.Text className="text-warning">
                                ⚠️ Aucune série disponible dans cette classe
                            </Form.Text>
                        )}
                    </div>
                )}

                {/* Aperçu du transfert */}
                {selectedSeriesId && (
                    <div className="mt-4 p-3 border border-success rounded">
                        <h6 className="text-success mb-2">Aperçu du transfert</h6>
                        <div className="row align-items-center">
                            <div className="col-md-5 text-center">
                                <div className="badge bg-secondary fs-6 p-2">
                                    {currentInfo.className}<br />
                                    {currentInfo.seriesName}
                                </div>
                                <div className="small text-muted mt-1">Classe actuelle</div>
                            </div>
                            <div className="col-md-2 text-center">
                                <ArrowRightCircle size={24} className="text-success" />
                            </div>
                            <div className="col-md-5 text-center">
                                <div className="badge bg-success fs-6 p-2">
                                    {getSelectedClassInfo()?.className}<br />
                                    {getSelectedClassInfo()?.seriesName}
                                </div>
                                <div className="small text-muted mt-1">Nouvelle classe</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Erreur */}
                {error && (
                    <Alert variant="danger" className="mt-3">
                        {error}
                    </Alert>
                )}

                {/* Information importante */}
                <div className="mt-4">
                    <Alert variant="info">
                        <strong>Information importante :</strong>
                        <ul className="mb-0 mt-2">
                            <li>Le transfert est immédiat et irréversible</li>
                            <li>L'historique des paiements sera conservé</li>
                            <li>Les notes et bulletins resteront liés à l'élève</li>
                            <li>L'ordre dans la nouvelle classe sera automatiquement défini</li>
                        </ul>
                    </Alert>
                </div>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={loading}>
                    Annuler
                </Button>
                <Button 
                    variant="success" 
                    onClick={handleTransfer}
                    disabled={loading || !selectedSeriesId || loadingClasses}
                >
                    {loading ? (
                        <>
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                className="me-2"
                            />
                            Transfert en cours...
                        </>
                    ) : (
                        <>
                            <ArrowRightCircle className="me-2" />
                            Transférer l'élève
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default StudentTransfer;