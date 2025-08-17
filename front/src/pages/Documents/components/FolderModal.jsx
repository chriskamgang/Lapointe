import { useState, useEffect } from 'react';
import {
    Modal,
    Form,
    Button,
    Row,
    Col,
    Alert,
    Spinner
} from 'react-bootstrap';
import { secureApiEndpoints } from '../../../utils/apiMigration';
import { extractErrorMessage } from '../../../utils/errorHandler';

const FolderModal = ({ show, onHide, folderData, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        folder_type: 'custom',
        color: '#007bff',
        icon: 'folder',
        is_private: false,
        allowed_roles: []
    });
    
    const [folderTypes, setFolderTypes] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEditMode = !!folderData;

    useEffect(() => {
        if (show) {
            loadFolderTypes();
            if (folderData) {
                setFormData({
                    name: folderData.name || '',
                    description: folderData.description || '',
                    folder_type: folderData.folder_type || 'custom',
                    color: folderData.color || '#007bff',
                    icon: folderData.icon || 'folder',
                    is_private: folderData.is_private || false,
                    allowed_roles: folderData.allowed_roles || []
                });
            } else {
                resetForm();
            }
        }
    }, [show, folderData]);

    const loadFolderTypes = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.documents.folders.getTypes();
            if (response.success) {
                setFolderTypes(response.data);
            }
        } catch (error) {
            setError(extractErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            folder_type: 'custom',
            color: '#007bff',
            icon: 'folder',
            is_private: false,
            allowed_roles: []
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setSaving(true);
            setError('');
            
            let response;
            if (isEditMode) {
                response = await secureApiEndpoints.documents.folders.update(folderData.id, formData);
            } else {
                response = await secureApiEndpoints.documents.folders.create(formData);
            }
            
            if (response.success) {
                onSuccess(response.data);
                onHide();
                resetForm();
            } else {
                setError(response.message || 'Une erreur est survenue');
            }
            
        } catch (error) {
            setError(extractErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleRoleChange = (role, checked) => {
        setFormData(prev => ({
            ...prev,
            allowed_roles: checked 
                ? [...prev.allowed_roles, role]
                : prev.allowed_roles.filter(r => r !== role)
        }));
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    {isEditMode ? 'Modifier le Dossier' : 'Nouveau Dossier'}
                </Modal.Title>
            </Modal.Header>
            
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}
                    
                    {loading ? (
                        <div className="text-center py-3">
                            <Spinner animation="border" />
                        </div>
                    ) : (
                        <>
                            <Row>
                                <Col md={8}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Nom du dossier *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Nom du dossier"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Type</Form.Label>
                                        <Form.Select
                                            value={formData.folder_type}
                                            onChange={(e) => setFormData({ ...formData, folder_type: e.target.value })}
                                            disabled={isEditMode} // Ne pas permettre de changer le type en édition
                                        >
                                            {Object.entries(folderTypes).map(([key, value]) => (
                                                <option key={key} value={key}>{value}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-3">
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Description du dossier (optionnel)"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </Form.Group>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Couleur</Form.Label>
                                        <Form.Control
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Icône</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="folder"
                                            value={formData.icon}
                                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    label="Dossier privé (visible uniquement par moi)"
                                    checked={formData.is_private}
                                    onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                                />
                            </Form.Group>

                            {!formData.is_private && (
                                <Form.Group className="mb-3">
                                    <Form.Label>Rôles autorisés (laisser vide pour tous)</Form.Label>
                                    <div>
                                        {[
                                            { key: 'admin', label: 'Administrateur' },
                                            { key: 'accountant', label: 'Comptable' },
                                            { key: 'teacher', label: 'Enseignant' },
                                            { key: 'surveillant_general', label: 'Surveillant Général' }
                                        ].map(role => (
                                            <Form.Check
                                                key={role.key}
                                                type="checkbox"
                                                label={role.label}
                                                checked={formData.allowed_roles.includes(role.key)}
                                                onChange={(e) => handleRoleChange(role.key, e.target.checked)}
                                            />
                                        ))}
                                    </div>
                                </Form.Group>
                            )}
                        </>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={saving}>
                        Annuler
                    </Button>
                    <Button variant="primary" type="submit" disabled={saving || loading}>
                        {saving ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                {isEditMode ? 'Modification...' : 'Création...'}
                            </>
                        ) : (
                            isEditMode ? 'Modifier' : 'Créer'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default FolderModal;