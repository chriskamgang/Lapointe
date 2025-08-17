import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Badge, ButtonGroup, Tabs, Tab, Card, Table } from 'react-bootstrap';
import { LoadingSpinner } from '../../components/UI';
import ImportExportButton from '../../components/ImportExportButton';
import { PlusCircle, PencilFill, Trash2, Eye, EyeSlashFill, Search, PersonFill, TelephoneFill, EnvelopeFill, PersonPlus, PersonDash } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import Swal from 'sweetalert2';

const Teachers = () => {
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState([]);
    const [filteredTeachers, setFilteredTeachers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        email: '',
        address: '',
        date_of_birth: '',
        gender: '',
        qualification: '',
        hire_date: '',
        is_active: true,
        create_user_account: false,
        username: '',
        password: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [showUserAccountModal, setShowUserAccountModal] = useState(false);
    const [selectedTeacherForAccount, setSelectedTeacherForAccount] = useState(null);
    const [userAccountData, setUserAccountData] = useState({
        username: '',
        password: '',
        email: ''
    });

    useEffect(() => {
        loadTeachers();
    }, []);

    useEffect(() => {
        filterTeachers();
    }, [teachers, searchTerm, statusFilter]);

    const loadTeachers = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.teachers.getAll({ with_details: true });
            if (response.success) {
                setTeachers(response.data);
            } else {
                console.error('Réponse API non réussie:', response);
                Swal.fire('Erreur', response.message || 'Impossible de charger les enseignants', 'error');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des enseignants:', error);
            Swal.fire('Erreur', error.message || 'Impossible de charger les enseignants', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filterTeachers = () => {
        let filtered = teachers;

        // Filtrer par terme de recherche
        if (searchTerm) {
            filtered = filtered.filter(teacher =>
                teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                teacher.phone_number.includes(searchTerm) ||
                (teacher.email && teacher.email.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Filtrer par statut
        if (statusFilter !== 'all') {
            const isActive = statusFilter === 'active';
            filtered = filtered.filter(teacher => teacher.is_active === isActive);
        }

        setFilteredTeachers(filtered);
    };

    const handleShowModal = (teacher = null) => {
        if (teacher) {
            setEditingTeacher(teacher);
            setFormData({
                first_name: teacher.first_name,
                last_name: teacher.last_name,
                phone_number: teacher.phone_number,
                email: teacher.email || '',
                address: teacher.address || '',
                date_of_birth: teacher.date_of_birth || '',
                gender: teacher.gender || '',
                qualification: teacher.qualification || '',
                hire_date: teacher.hire_date || '',
                is_active: teacher.is_active,
                create_user_account: false,
                username: '',
                password: ''
            });
        } else {
            setEditingTeacher(null);
            setFormData({
                first_name: '',
                last_name: '',
                phone_number: '',
                email: '',
                address: '',
                date_of_birth: '',
                gender: '',
                qualification: '',
                hire_date: new Date().toISOString().split('T')[0],
                is_active: true,
                create_user_account: false,
                username: '',
                password: ''
            });
        }
        setFormErrors({});
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTeacher(null);
        setFormData({
            first_name: '',
            last_name: '',
            phone_number: '',
            email: '',
            address: '',
            date_of_birth: '',
            gender: '',
            qualification: '',
            hire_date: '',
            is_active: true,
            create_user_account: false,
            username: '',
            password: ''
        });
        setFormErrors({});
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Générer automatiquement le nom d'utilisateur
        if (name === 'first_name' || name === 'last_name') {
            const firstName = name === 'first_name' ? value : formData.first_name;
            const lastName = name === 'last_name' ? value : formData.last_name;
            if (firstName && lastName && formData.create_user_account) {
                const username = (firstName.charAt(0) + lastName).toLowerCase().replace(/\s+/g, '');
                setFormData(prev => ({
                    ...prev,
                    username: username
                }));
            }
        }

        // Nettoyer les erreurs du champ modifié
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            let response;
            if (editingTeacher) {
                response = await secureApiEndpoints.teachers.update(editingTeacher.id, formData);
            } else {
                response = await secureApiEndpoints.teachers.create(formData);
            }

            if (response.success) {
                Swal.fire(
                    'Succès!',
                    editingTeacher ? 'Enseignant mis à jour avec succès' : 'Enseignant créé avec succès',
                    'success'
                );
                handleCloseModal();
                loadTeachers();
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
            } else {
                Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
            }
        }
    };

    const handleToggleStatus = async (teacher) => {
        try {
            const result = await Swal.fire({
                title: 'Confirmation',
                text: `Voulez-vous ${teacher.is_active ? 'désactiver' : 'activer'} cet enseignant ?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Oui',
                cancelButtonText: 'Annuler'
            });

            if (result.isConfirmed) {
                const response = await secureApiEndpoints.teachers.toggleStatus(teacher.id);

                if (response.success) {
                    Swal.fire('Succès!', 'Statut mis à jour avec succès', 'success');
                    loadTeachers();
                }
            }
        } catch (error) {
            Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
        }
    };

    const handleDelete = async (teacher) => {
        try {
            const result = await Swal.fire({
                title: 'Confirmation',
                text: 'Êtes-vous sûr de vouloir supprimer cet enseignant ? Cette action est irréversible.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Oui, supprimer',
                cancelButtonText: 'Annuler',
                confirmButtonColor: '#d33'
            });

            if (result.isConfirmed) {
                const response = await secureApiEndpoints.teachers.delete(teacher.id);

                if (response.success) {
                    Swal.fire('Supprimé!', 'Enseignant supprimé avec succès', 'success');
                    loadTeachers();
                }
            }
        } catch (error) {
            Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
        }
    };

    const handleCreateUserAccount = async (teacher) => {
        setSelectedTeacherForAccount(teacher);
        setUserAccountData({
            username: teacher.last_name.toLowerCase() + '.' + teacher.first_name.toLowerCase(),
            password: '',
            email: teacher.email || ''
        });
        setShowUserAccountModal(true);
    };

    const handleSubmitUserAccount = async (e) => {
        e.preventDefault();
        try {
            const response = await secureApiEndpoints.teachers.createUserAccount(
                selectedTeacherForAccount.id,
                userAccountData
            );

            if (response.success) {
                Swal.fire('Succès!', 'Compte utilisateur créé avec succès', 'success');
                setShowUserAccountModal(false);
                setSelectedTeacherForAccount(null);
                setUserAccountData({ username: '', password: '', email: '' });
                loadTeachers();
            }
        } catch (error) {
            Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
        }
    };

    const handleRemoveUserAccount = async (teacher) => {
        try {
            const result = await Swal.fire({
                title: 'Confirmation',
                text: 'Êtes-vous sûr de vouloir supprimer le compte utilisateur de cet enseignant ?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Oui, supprimer',
                cancelButtonText: 'Annuler',
                confirmButtonColor: '#d33'
            });

            if (result.isConfirmed) {
                const response = await secureApiEndpoints.teachers.removeUserAccount(teacher.id);

                if (response.success) {
                    Swal.fire('Supprimé!', 'Compte utilisateur supprimé avec succès', 'success');
                    loadTeachers();
                }
            }
        } catch (error) {
            Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
        }
    };

    const getStatusBadge = (isActive) => {
        return (
            <Badge bg={isActive ? 'success' : 'secondary'}>
                {isActive ? 'Actif' : 'Inactif'}
            </Badge>
        );
    };

    const getGenderText = (gender) => {
        switch (gender) {
            case 'm': return 'Masculin';
            case 'f': return 'Féminin';
            default: return '-';
        }
    };

    if (loading && teachers.length === 0) {
        return <LoadingSpinner />;
    }

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Gestion des Enseignants</h2>
                <div className="d-flex gap-2">
                    <ImportExportButton
                        title="Enseignants"
                        apiBasePath="/api/teachers"
                        onImportSuccess={loadTeachers}
                        templateFileName="template_enseignants.csv"
                    />
                    <Button variant="primary" onClick={() => handleShowModal()}>
                        <PlusCircle className="me-2" />
                        Nouvel Enseignant
                    </Button>
                </div>
            </div>

            {/* Filtres */}
            <Card className="mb-4">
                <Card.Body>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="position-relative">
                                <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                <Form.Control
                                    type="text"
                                    placeholder="Rechercher par nom, prénom, téléphone ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="ps-5"
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <Form.Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="active">Actifs uniquement</option>
                                <option value="inactive">Inactifs uniquement</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-3">
                            <div className="text-muted">
                                Total: {filteredTeachers.length} enseignant(s)
                            </div>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Tableau des enseignants */}
            <Card>
                <Table responsive>
                    <thead>
                        <tr>
                            <th>Nom complet</th>
                            <th>Contact</th>
                            <th>Qualification</th>
                            <th>Date d'embauche</th>
                            <th>Statut</th>
                            <th width="150">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeachers.length > 0 ? (
                            filteredTeachers.map((teacher) => (
                                <tr key={teacher.id}>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <PersonFill className="text-muted me-2" />
                                            <div>
                                                <strong>{teacher.full_name}</strong>
                                                <div className="small text-muted">
                                                    {getGenderText(teacher.gender)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="small">
                                            <div className="d-flex align-items-center mb-1">
                                                <TelephoneFill className="text-muted me-2" size={12} />
                                                {teacher.phone_number}
                                            </div>
                                            {teacher.email && (
                                                <div className="d-flex align-items-center">
                                                    <EnvelopeFill className="text-muted me-2" size={12} />
                                                    {teacher.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <small className="text-muted">
                                            {teacher.qualification || '-'}
                                        </small>
                                    </td>
                                    <td>
                                        <small>
                                            {teacher.hire_date 
                                                ? new Date(teacher.hire_date).toLocaleDateString('fr-FR')
                                                : '-'
                                            }
                                        </small>
                                    </td>
                                    <td>
                                        {getStatusBadge(teacher.is_active)}
                                        {teacher.user && (
                                            <Badge bg="info" className="ms-1" size="sm">
                                                Compte utilisateur
                                            </Badge>
                                        )}
                                    </td>
                                    <td>
                                        <ButtonGroup size="sm">
                                            <Button
                                                variant="outline-primary"
                                                onClick={() => handleShowModal(teacher)}
                                                title="Modifier"
                                            >
                                                <PencilFill size={14} />
                                            </Button>
                                            {!teacher.user ? (
                                                <Button
                                                    variant="outline-info"
                                                    onClick={() => handleCreateUserAccount(teacher)}
                                                    title="Créer compte utilisateur"
                                                >
                                                    <PersonPlus size={14} />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline-warning"
                                                    onClick={() => handleRemoveUserAccount(teacher)}
                                                    title="Supprimer compte utilisateur"
                                                >
                                                    <PersonDash size={14} />
                                                </Button>
                                            )}
                                            <Button
                                                variant={teacher.is_active ? "outline-warning" : "outline-success"}
                                                onClick={() => handleToggleStatus(teacher)}
                                                title={teacher.is_active ? "Désactiver" : "Activer"}
                                            >
                                                {teacher.is_active ? <EyeSlashFill size={14} /> : <Eye size={14} />}
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                onClick={() => handleDelete(teacher)}
                                                title="Supprimer"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </ButtonGroup>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-4">
                                    <div className="text-muted">
                                        {searchTerm || statusFilter !== 'all' 
                                            ? 'Aucun enseignant ne correspond aux critères de recherche'
                                            : 'Aucun enseignant trouvé'
                                        }
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Modal de création/édition */}
            <Modal show={showModal} onHide={handleCloseModal} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingTeacher ? 'Modifier l\'Enseignant' : 'Nouvel Enseignant'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Tabs defaultActiveKey="personal" className="mb-3">
                            <Tab eventKey="personal" title="Informations personnelles">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Prénom <span className="text-danger">*</span></Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="first_name"
                                                value={formData.first_name}
                                                onChange={handleInputChange}
                                                isInvalid={!!formErrors.first_name}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {formErrors.first_name && formErrors.first_name[0]}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Nom de famille <span className="text-danger">*</span></Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="last_name"
                                                value={formData.last_name}
                                                onChange={handleInputChange}
                                                isInvalid={!!formErrors.last_name}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {formErrors.last_name && formErrors.last_name[0]}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Téléphone <span className="text-danger">*</span></Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="phone_number"
                                                value={formData.phone_number}
                                                onChange={handleInputChange}
                                                isInvalid={!!formErrors.phone_number}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {formErrors.phone_number && formErrors.phone_number[0]}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Email</Form.Label>
                                            <Form.Control
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                isInvalid={!!formErrors.email}
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {formErrors.email && formErrors.email[0]}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Date de naissance</Form.Label>
                                            <Form.Control
                                                type="date"
                                                name="date_of_birth"
                                                value={formData.date_of_birth}
                                                onChange={handleInputChange}
                                            />
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Genre</Form.Label>
                                            <Form.Select
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Sélectionner...</option>
                                                <option value="m">Masculin</option>
                                                <option value="f">Féminin</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </div>
                                    <div className="col-12">
                                        <Form.Group>
                                            <Form.Label>Adresse</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                            />
                                        </Form.Group>
                                    </div>
                                </div>
                            </Tab>
                            <Tab eventKey="professional" title="Informations professionnelles">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Qualification/Diplôme</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="qualification"
                                                value={formData.qualification}
                                                onChange={handleInputChange}
                                                placeholder="Ex: Licence en Mathématiques"
                                            />
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Date d'embauche</Form.Label>
                                            <Form.Control
                                                type="date"
                                                name="hire_date"
                                                value={formData.hire_date}
                                                onChange={handleInputChange}
                                            />
                                        </Form.Group>
                                    </div>
                                    <div className="col-12">
                                        <Form.Check
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleInputChange}
                                            label="Enseignant actif"
                                        />
                                    </div>
                                </div>
                            </Tab>
                            {!editingTeacher && (
                                <Tab eventKey="account" title="Compte utilisateur">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <Form.Check
                                                type="checkbox"
                                                name="create_user_account"
                                                checked={formData.create_user_account}
                                                onChange={handleInputChange}
                                                label="Créer un compte utilisateur pour cet enseignant"
                                            />
                                            <Form.Text className="text-muted">
                                                Permet à l'enseignant de se connecter au système
                                            </Form.Text>
                                        </div>
                                        {formData.create_user_account && (
                                            <>
                                                <div className="col-md-6">
                                                    <Form.Group>
                                                        <Form.Label>Nom d'utilisateur <span className="text-danger">*</span></Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="username"
                                                            value={formData.username}
                                                            onChange={handleInputChange}
                                                            isInvalid={!!formErrors.username}
                                                            required={formData.create_user_account}
                                                        />
                                                        <Form.Control.Feedback type="invalid">
                                                            {formErrors.username && formErrors.username[0]}
                                                        </Form.Control.Feedback>
                                                    </Form.Group>
                                                </div>
                                                <div className="col-md-6">
                                                    <Form.Group>
                                                        <Form.Label>Mot de passe <span className="text-danger">*</span></Form.Label>
                                                        <Form.Control
                                                            type="password"
                                                            name="password"
                                                            value={formData.password}
                                                            onChange={handleInputChange}
                                                            isInvalid={!!formErrors.password}
                                                            required={formData.create_user_account}
                                                            minLength="6"
                                                        />
                                                        <Form.Control.Feedback type="invalid">
                                                            {formErrors.password && formErrors.password[0]}
                                                        </Form.Control.Feedback>
                                                    </Form.Group>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </Tab>
                            )}
                        </Tabs>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Annuler
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Enregistrement...' : editingTeacher ? 'Mettre à jour' : 'Créer'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal de création de compte utilisateur */}
            <Modal show={showUserAccountModal} onHide={() => setShowUserAccountModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Créer un compte utilisateur pour {selectedTeacherForAccount?.full_name}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmitUserAccount}>
                    <Modal.Body>
                        <div className="mb-3">
                            <Form.Label>Nom d'utilisateur <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                value={userAccountData.username}
                                onChange={(e) => setUserAccountData({...userAccountData, username: e.target.value})}
                                required
                                placeholder="nom.prenom"
                            />
                        </div>
                        
                        <div className="mb-3">
                            <Form.Label>Mot de passe <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="password"
                                value={userAccountData.password}
                                onChange={(e) => setUserAccountData({...userAccountData, password: e.target.value})}
                                required
                                minLength="6"
                                placeholder="Minimum 6 caractères"
                            />
                        </div>

                        <div className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={userAccountData.email}
                                onChange={(e) => setUserAccountData({...userAccountData, email: e.target.value})}
                                placeholder="email@example.com (optionnel)"
                            />
                            <Form.Text className="text-muted">
                                Si vide, l'email de l'enseignant sera utilisé ou un email temporaire sera généré.
                            </Form.Text>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowUserAccountModal(false)}>
                            Annuler
                        </Button>
                        <Button variant="primary" type="submit">
                            Créer le compte
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default Teachers;