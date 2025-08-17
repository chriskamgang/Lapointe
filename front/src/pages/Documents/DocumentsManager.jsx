import { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Table,
    Badge,
    Modal,
    Form,
    Alert,
    Spinner,
    Pagination,
    Dropdown,
    ButtonGroup,
    InputGroup,
    ProgressBar
} from 'react-bootstrap';
import {
    Plus,
    Eye,
    Download,
    PencilSquare,
    Trash3,
    Search,
    Filter,
    FolderPlus,
    Upload,
    Archive,
    File,
    FileEarmark,
    FileEarmarkPdf,
    FileEarmarkWord,
    FileEarmarkExcel,
    FolderFill,
    PersonFill,
    Calendar,
    Tag
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import { extractErrorMessage } from '../../utils/errorHandler';
import Swal from 'sweetalert2';
import FolderModal from './components/FolderModal';

const DocumentsManager = () => {
    const [documents, setDocuments] = useState([]);
    const [folders, setFolders] = useState([]);
    const [documentTypes, setDocumentTypes] = useState({});
    const [visibilityTypes, setVisibilityTypes] = useState({});
    
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const [filters, setFilters] = useState({
        folder_id: '',
        document_type: '',
        search: '',
        visibility: ''
    });
    
    const [uploadForm, setUploadForm] = useState({
        title: '',
        description: '',
        folder_id: '',
        document_type: 'general',
        visibility: 'private',
        tags: [],
        file: null,
        notes: ''
    });
    
    const [folderForm, setFolderForm] = useState({
        name: '',
        description: '',
        folder_type: 'custom',
        color: '#007bff',
        icon: 'folder',
        is_private: false,
        allowed_roles: []
    });
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadData();
    }, [currentPage, filters]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            console.log('Chargement des données...');
            
            // Charger en parallèle
            const [docsResponse, foldersResponse, typesResponse, visibilityResponse] = await Promise.all([
                secureApiEndpoints.documents.getAll({ 
                    page: currentPage, 
                    per_page: 15,
                    ...filters 
                }),
                secureApiEndpoints.documents.folders.getAll({ roots_only: true }),
                secureApiEndpoints.documents.getTypes(),
                secureApiEndpoints.documents.getVisibilityTypes()
            ]);

            console.log('Réponses:', { docsResponse, foldersResponse, typesResponse, visibilityResponse });

            if (docsResponse.success) {
                setDocuments(docsResponse.data.data);
                setCurrentPage(docsResponse.data.current_page);
                setTotalPages(docsResponse.data.last_page);
            }

            if (foldersResponse.success) {
                setFolders(foldersResponse.data);
                console.log('Dossiers chargés:', foldersResponse.data);
            }

            if (typesResponse.success) {
                setDocumentTypes(typesResponse.data);
                console.log('Types de documents chargés:', typesResponse.data);
            }

            if (visibilityResponse.success) {
                setVisibilityTypes(visibilityResponse.data);
                console.log('Types de visibilité chargés:', visibilityResponse.data);
            }

        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            setError(extractErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        if (!uploadForm.file) {
            setError('Veuillez sélectionner un fichier');
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(0);
            setError('');
            
            console.log('Form data avant upload:', uploadForm);
            
            const formData = new FormData();
            Object.keys(uploadForm).forEach(key => {
                if (key === 'tags' && Array.isArray(uploadForm[key])) {
                    uploadForm[key].forEach(tag => formData.append('tags[]', tag));
                } else if (uploadForm[key] !== null && uploadForm[key] !== '') {
                    formData.append(key, uploadForm[key]);
                }
            });

            // Debug: afficher le contenu du FormData
            console.log('FormData entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }

            const response = await secureApiEndpoints.documents.upload(formData);
            
            if (response.success) {
                setSuccess('Document uploadé avec succès');
                setShowUploadModal(false);
                resetUploadForm();
                loadData();
                
                Swal.fire({
                    title: 'Succès !',
                    text: 'Le document a été uploadé avec succès',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            }
            
        } catch (error) {
            console.error('Erreur upload:', error);
            setError(extractErrorMessage(error));
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDownload = async (document) => {
        try {
            const response = await secureApiEndpoints.documents.download(document.id);
            
            // Créer un blob et déclencher le téléchargement
            const blob = new Blob([response], { type: document.mime_type });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = document.original_filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            setError(extractErrorMessage(error));
        }
    };

    const handleDelete = async (document) => {
        const result = await Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: 'Cette action supprimera définitivement le document. Cette action est irréversible !',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            try {
                const response = await secureApiEndpoints.documents.delete(document.id);
                
                if (response.success) {
                    setSuccess('Document supprimé avec succès');
                    loadData();
                    
                    Swal.fire({
                        title: 'Supprimé !',
                        text: 'Le document a été supprimé avec succès',
                        icon: 'success',
                        confirmButtonText: 'OK'
                    });
                }
                
            } catch (error) {
                setError(extractErrorMessage(error));
                
                Swal.fire({
                    title: 'Erreur !',
                    text: 'Une erreur est survenue lors de la suppression',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        }
    };

    const resetUploadForm = () => {
        setUploadForm({
            title: '',
            description: '',
            folder_id: '',
            document_type: 'general',
            visibility: 'private',
            tags: [],
            file: null,
            notes: ''
        });
    };

    const handleFolderSuccess = (newFolder) => {
        setSuccess('Dossier créé avec succès');
        setShowFolderModal(false);
        loadData(); // Recharger les données
    };

    const resetFolderForm = () => {
        setFolderForm({
            name: '',
            description: '',
            folder_type: 'custom',
            color: '#007bff',
            icon: 'folder',
            is_private: false,
            allowed_roles: []
        });
        setSelectedFolder(null);
    };

    const getFileIcon = (extension) => {
        const iconMap = {
            'pdf': <FileEarmarkPdf className="text-danger" />,
            'doc': <FileEarmarkWord className="text-primary" />,
            'docx': <FileEarmarkWord className="text-primary" />,
            'xls': <FileEarmarkExcel className="text-success" />,
            'xlsx': <FileEarmarkExcel className="text-success" />,
            'jpg': <FileEarmark className="text-info" />,
            'jpeg': <FileEarmark className="text-info" />,
            'png': <FileEarmark className="text-info" />,
        };
        
        return iconMap[extension?.toLowerCase()] || <File className="text-secondary" />;
    };

    const getVisibilityBadge = (visibility) => {
        const variants = {
            'private': 'secondary',
            'shared': 'primary', 
            'public': 'success'
        };
        
        return <Badge bg={variants[visibility] || 'secondary'}>{visibilityTypes[visibility] || visibility}</Badge>;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>Cahier des Pièces Jointes</h2>
                            <p className="text-muted">Gérez vos documents et fichiers</p>
                        </div>
                        <ButtonGroup>
                            <Button
                                variant="outline-primary"
                                onClick={() => {
                                    resetFolderForm();
                                    setShowFolderModal(true);
                                }}
                            >
                                <FolderPlus className="me-2" />
                                Nouveau Dossier
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    resetUploadForm();
                                    setShowUploadModal(true);
                                }}
                            >
                                <Upload className="me-2" />
                                Uploader Document
                            </Button>
                        </ButtonGroup>
                    </div>
                </Col>
            </Row>

            {/* Alerts */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            {/* Filtres */}
            <Card className="mb-4">
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Dossier</Form.Label>
                                <Form.Select
                                    value={filters.folder_id}
                                    onChange={(e) => {
                                        setFilters({ ...filters, folder_id: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Tous les dossiers</option>
                                    {folders.map(folder => (
                                        <option key={folder.id} value={folder.id}>
                                            {folder.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Type</Form.Label>
                                <Form.Select
                                    value={filters.document_type}
                                    onChange={(e) => {
                                        setFilters({ ...filters, document_type: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Tous les types</option>
                                    {Object.entries(documentTypes).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Visibilité</Form.Label>
                                <Form.Select
                                    value={filters.visibility}
                                    onChange={(e) => {
                                        setFilters({ ...filters, visibility: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Toutes les visibilités</option>
                                    {Object.entries(visibilityTypes).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Recherche</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="text"
                                        placeholder="Rechercher..."
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    />
                                    <Button variant="outline-secondary">
                                        <Search />
                                    </Button>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Table des documents */}
            <Card>
                <Card.Header>
                    <h5 className="mb-0">Documents ({documents.length})</h5>
                </Card.Header>
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Chargement...</span>
                            </Spinner>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-4">
                            <FileEarmark size={48} className="text-muted mb-3" />
                            <p className="text-muted">Aucun document trouvé</p>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    resetUploadForm();
                                    setShowUploadModal(true);
                                }}
                            >
                                <Upload className="me-2" />
                                Uploader votre premier document
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Table responsive hover>
                                <thead>
                                    <tr>
                                        <th width="40"></th>
                                        <th>Document</th>
                                        <th>Dossier</th>
                                        <th>Type</th>
                                        <th>Visibilité</th>
                                        <th>Taille</th>
                                        <th>Uploadé par</th>
                                        <th>Date</th>
                                        <th width="120">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((doc) => (
                                        <tr key={doc.id}>
                                            <td>
                                                {getFileIcon(doc.file_extension)}
                                            </td>
                                            <td>
                                                <div>
                                                    <strong>{doc.title}</strong>
                                                    <div className="text-muted small">
                                                        {doc.original_filename}
                                                    </div>
                                                    {doc.description && (
                                                        <div className="text-muted small mt-1">
                                                            {doc.description.length > 50 
                                                                ? `${doc.description.substring(0, 50)}...`
                                                                : doc.description
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <FolderFill 
                                                        className="me-2" 
                                                        style={{ color: doc.folder?.color || '#007bff' }} 
                                                    />
                                                    {doc.folder?.name || 'Sans dossier'}
                                                </div>
                                            </td>
                                            <td>
                                                <Badge bg="info">
                                                    {documentTypes[doc.document_type] || doc.document_type}
                                                </Badge>
                                            </td>
                                            <td>
                                                {getVisibilityBadge(doc.visibility)}
                                            </td>
                                            <td>
                                                <small className="text-muted">
                                                    {formatFileSize(doc.file_size)}
                                                </small>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <PersonFill className="me-1 text-muted" size={14} />
                                                    <small>{doc.uploader?.name || 'Inconnu'}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <Calendar className="me-1 text-muted" size={14} />
                                                    <small>
                                                        {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                                                    </small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleDownload(doc)}
                                                        title="Télécharger"
                                                    >
                                                        <Download size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-warning"
                                                        size="sm"
                                                        onClick={() => setSelectedDocument(doc)}
                                                        title="Modifier"
                                                    >
                                                        <PencilSquare size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDelete(doc)}
                                                        title="Supprimer"
                                                    >
                                                        <Trash3 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center mt-3">
                                    <Pagination>
                                        <Pagination.Prev
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                        />
                                        {[...Array(totalPages)].map((_, index) => (
                                            <Pagination.Item
                                                key={index + 1}
                                                active={index + 1 === currentPage}
                                                onClick={() => setCurrentPage(index + 1)}
                                            >
                                                {index + 1}
                                            </Pagination.Item>
                                        ))}
                                        <Pagination.Next
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                        />
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </Card.Body>
            </Card>

            {/* Modal Dossier */}
            <FolderModal
                show={showFolderModal}
                onHide={() => setShowFolderModal(false)}
                folderData={selectedFolder}
                onSuccess={handleFolderSuccess}
            />

            {/* Modal Upload Document */}
            <Modal
                show={showUploadModal}
                onHide={() => setShowUploadModal(false)}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Uploader un Document</Modal.Title>
                </Modal.Header>
                
                <Form onSubmit={handleUpload}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Titre *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Titre du document"
                                        value={uploadForm.title}
                                        onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Dossier *</Form.Label>
                                    <Form.Select
                                        value={uploadForm.folder_id}
                                        onChange={(e) => setUploadForm({ ...uploadForm, folder_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Sélectionner un dossier</option>
                                        {folders.length === 0 ? (
                                            <option disabled>Aucun dossier disponible</option>
                                        ) : (
                                            folders.map(folder => (
                                                <option key={folder.id} value={folder.id}>
                                                    {folder.name}
                                                </option>
                                            ))
                                        )}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Type de document</Form.Label>
                                    <Form.Select
                                        value={uploadForm.document_type}
                                        onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                                    >
                                        {Object.entries(documentTypes).map(([key, value]) => (
                                            <option key={key} value={key}>{value}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Visibilité</Form.Label>
                                    <Form.Select
                                        value={uploadForm.visibility}
                                        onChange={(e) => setUploadForm({ ...uploadForm, visibility: e.target.value })}
                                    >
                                        {Object.entries(visibilityTypes).map(([key, value]) => (
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
                                placeholder="Description du document (optionnel)"
                                value={uploadForm.description}
                                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Fichier *</Form.Label>
                            <Form.Control
                                type="file"
                                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                                required
                            />
                            <Form.Text className="text-muted">
                                Types autorisés : PDF, Word, Excel, PowerPoint, Images, Archives. Taille max : 10MB
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Notes personnelles</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Notes personnelles (optionnel)"
                                value={uploadForm.notes}
                                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                            />
                        </Form.Group>

                        {uploading && (
                            <div className="mb-3">
                                <div className="d-flex justify-content-between">
                                    <small>Upload en cours...</small>
                                    <small>{uploadProgress}%</small>
                                </div>
                                <ProgressBar now={uploadProgress} />
                            </div>
                        )}
                    </Modal.Body>

                    <Modal.Footer>
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowUploadModal(false)}
                            disabled={uploading}
                        >
                            Annuler
                        </Button>
                        <Button 
                            variant="primary" 
                            type="submit"
                            disabled={uploading}
                        >
                            {uploading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Upload...
                                </>
                            ) : (
                                <>
                                    <Upload className="me-2" />
                                    Uploader
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default DocumentsManager;