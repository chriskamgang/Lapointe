import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Badge, Spinner } from 'react-bootstrap';
import { Check, X, CupHot } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../utils/apiMigration';
import Swal from 'sweetalert2';

const RameStatusToggle = ({ studentId, studentName, onStatusChange = null }) => {
    const [rameStatus, setRameStatus] = useState({
        has_brought_rame: false,
        marked_date: null,
        marked_by_user: null,
        notes: null,
        last_updated: null
    });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (studentId) {
            loadRameStatus();
        }
    }, [studentId]);

    const loadRameStatus = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.studentRame.getStatus(studentId);
            
            if (response.success) {
                setRameStatus(response.data);
            } else {
                console.error('Erreur lors du chargement du statut RAME:', response.message);
            }
        } catch (error) {
            console.error('Erreur lors du chargement du statut RAME:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRame = async (newValue) => {
        const action = newValue ? 'apporté sa RAME' : 'pas apporté sa RAME';
        const icon = newValue ? 'success' : 'warning';
        
        const result = await Swal.fire({
            title: 'Confirmer le statut RAME',
            html: `
                <p>Confirmez-vous que <strong>${studentName}</strong> a <strong>${action}</strong> ?</p>
                <div class="mt-3">
                    <label for="rameNotes" class="form-label">Notes (optionnel):</label>
                    <textarea id="rameNotes" class="form-control" placeholder="Commentaires sur le statut RAME..."></textarea>
                </div>
            `,
            icon: icon,
            showCancelButton: true,
            confirmButtonText: 'Confirmer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: newValue ? '#28a745' : '#ffc107',
            cancelButtonColor: '#6c757d',
            preConfirm: () => {
                const notes = document.getElementById('rameNotes').value;
                return { notes: notes.trim() || null };
            }
        });

        if (result.isConfirmed) {
            try {
                setUpdating(true);
                const response = await secureApiEndpoints.studentRame.updateStatus(studentId, {
                    has_brought_rame: newValue,
                    notes: result.value.notes
                });

                if (response.success) {
                    setRameStatus(response.data);
                    
                    Swal.fire({
                        title: 'Statut mis à jour !',
                        text: response.message,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });

                    // Callback pour notifier le parent du changement
                    if (onStatusChange) {
                        onStatusChange(response.data);
                    }
                } else {
                    throw new Error(response.message || 'Erreur lors de la mise à jour');
                }
            } catch (error) {
                console.error('Erreur lors de la mise à jour:', error);
                Swal.fire({
                    title: 'Erreur',
                    text: error.message || 'Erreur lors de la mise à jour du statut RAME',
                    icon: 'error'
                });
            } finally {
                setUpdating(false);
            }
        }
    };

    if (loading) {
        return (
            <Card className="border-info">
                <Card.Body className="text-center py-3">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Chargement du statut RAME...
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className={`border-${rameStatus.has_brought_rame ? 'success' : 'warning'} mb-3`}>
            <Card.Header className={`bg-${rameStatus.has_brought_rame ? 'success' : 'warning'} text-white d-flex align-items-center`}>
                <CupHot size={18} className="me-2" />
                <strong>Statut RAME</strong>
            </Card.Header>
            <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center">
                        <Form.Check
                            type="switch"
                            id={`rame-switch-${studentId}`}
                            checked={rameStatus.has_brought_rame}
                            onChange={(e) => handleToggleRame(e.target.checked)}
                            disabled={updating}
                            className="me-3"
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <div>
                            <Badge 
                                bg={rameStatus.has_brought_rame ? 'success' : 'secondary'}
                                className="fs-6 d-flex align-items-center"
                            >
                                {rameStatus.has_brought_rame ? (
                                    <>
                                        <Check size={16} className="me-1" />
                                        A apporté sa RAME
                                    </>
                                ) : (
                                    <>
                                        <X size={16} className="me-1" />
                                        N'a pas apporté sa RAME
                                    </>
                                )}
                            </Badge>
                        </div>
                    </div>
                    
                    {updating && <Spinner animation="border" size="sm" />}
                </div>

                {rameStatus.marked_date && (
                    <div className="text-muted small">
                        <div className="mb-1">
                            <strong>Marqué le:</strong> {new Date(rameStatus.marked_date).toLocaleDateString('fr-FR')}
                        </div>
                        {rameStatus.marked_by_user && (
                            <div className="mb-1">
                                <strong>Par:</strong> {rameStatus.marked_by_user.name}
                            </div>
                        )}
                        {rameStatus.notes && (
                            <div>
                                <strong>Notes:</strong> {rameStatus.notes}
                            </div>
                        )}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default RameStatusToggle;