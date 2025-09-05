import React, { useState, useEffect } from 'react';
import { secureApiEndpoints, scholarshipUtils } from '../../utils/apiMigration';

const ScholarshipManagementPage = () => {
    const [scholarships, setScholarships] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingScholarship, setEditingScholarship] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const schools = [
        { code: 'INSSAS', name: 'Institut National Supérieur des Sciences de la Santé' },
        { code: 'ESGIT', name: 'École Supérieure de Génie Informatique et Télécommunications' },
        { code: 'ESJEC', name: 'École Supérieure Juridique, Économique et Commerciale' },
        { code: 'ESSIT', name: 'École Supérieure des Sciences Industrielles et Technologiques' },
        { code: 'ISTPM', name: 'Institut Supérieur de Technologies Professionnelles et Managériales' },
        { code: 'ISTMS', name: 'Institut Supérieur de Technologies Médico-Sanitaires' }
    ];

    const levelTypes = ['Licence', 'Master', 'Doctorat'];
    const specialties = ['Informatique', 'Télécommunications', 'Médecine', 'Droit', 'Gestion', 'Ingénierie'];

    useEffect(() => {
        loadScholarships();
    }, [selectedSchool]);

    const loadScholarships = async () => {
        setLoading(true);
        try {
            const response = selectedSchool 
                ? await secureApiEndpoints.universityScholarships.getBySchoolCode(selectedSchool)
                : await secureApiEndpoints.universityScholarships.getAll();
            
            if (response.success) {
                setScholarships(response.data || []);
            }
        } catch (error) {
            console.error('Erreur chargement bourses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (scholarshipData) => {
        try {
            const response = editingScholarship
                ? await secureApiEndpoints.universityScholarships.update(editingScholarship.id, scholarshipData)
                : await secureApiEndpoints.universityScholarships.create(scholarshipData);

            if (response.success) {
                await loadScholarships();
                setShowModal(false);
                setEditingScholarship(null);
                alert('Bourse sauvegardée avec succès!');
            }
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            alert('Erreur lors de la sauvegarde');
        }
    };
    const handleDelete = async (id) => {
        try {
            const response = await secureApiEndpoints.universityScholarships.delete(id);
            if (response.success) {
                await loadScholarships();
                alert('Bourse supprimée avec succès!');
            }
        } catch (error) {
            console.error('Erreur suppression:', error);
            alert('Erreur lors de la suppression');
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="row mb-4">
                <div className="col">
                    <h2 className="mb-3">Gestion des Bourses Universitaires</h2>
                    <p className="text-muted">
                        Configuration des bourses selon les écoles et niveaux d'études
                    </p>
                </div>
                <div className="col-auto">
                    <button 
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingScholarship(null);
                            setShowModal(true);
                        }}
                    >
                        Nouvelle Bourse
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-4">
                            <label className="form-label">École</label>
                            <select 
                                className="form-select"
                                value={selectedSchool}
                                onChange={(e) => setSelectedSchool(e.target.value)}
                            >
                                <option value="">Toutes les écoles</option>
                                {schools.map(school => (
                                    <option key={school.code} value={school.code}>
                                        {school.name} ({school.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-4 d-flex align-items-end">
                            <button className="btn btn-outline-primary" onClick={loadScholarships}>
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tableau des bourses */}
            <div className="card">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border" />
                        </div>
                    ) : (
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>École</th>
                                    <th>Niveau</th>
                                    <th>Spécialité</th>
                                    <th>Montant</th>
                                    <th>Conditions</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scholarships.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4">
                                            <div className="alert alert-info mb-0">
                                                Aucune bourse configurée
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    scholarships.map(scholarship => (
                                        <tr key={scholarship.id}>
                                            <td>
                                                <span className="badge bg-primary">
                                                    {scholarship.school_code}
                                                </span>
                                            </td>
                                            <td>{scholarship.level_type}</td>
                                            <td>{scholarship.specialty || 'Toutes'}</td>
                                            <td>
                                                <strong className="text-success">
                                                    {new Intl.NumberFormat('fr-FR').format(scholarship.amount)} FCFA
                                                </strong>
                                            </td>
                                            <td>
                                                <small className="text-muted">
                                                    {scholarship.conditions || 'Aucune condition spéciale'}
                                                </small>
                                            </td>
                                            <td>
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        className="btn btn-outline-primary"
                                                        onClick={() => {
                                                            setEditingScholarship(scholarship);
                                                            setShowModal(true);
                                                        }}
                                                    >
                                                        Modifier
                                                    </button>
                                                    <button
                                                        className="btn btn-outline-danger"
                                                        onClick={() => setConfirmDeleteId(scholarship.id)}
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                                }
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal de création/édition */}
            {/* Modal de création/édition */}
            {showModal && (
                <ScholarshipModal
                    scholarship={editingScholarship}
                    schools={schools}
                    levelTypes={levelTypes}
                    specialties={specialties}
                    onSave={handleSave}
                    onClose={() => {
                        setShowModal(false);
                        setEditingScholarship(null);
                    }}
                />
            )}

            {/* Modal de confirmation de suppression */}
            {confirmDeleteId && (
                <ConfirmModal
                    message="Êtes-vous sûr de vouloir supprimer cette bourse ?"
                    onConfirm={async () => {
                        await handleDelete(confirmDeleteId);
                        setConfirmDeleteId(null);
                    }}
                    onCancel={() => setConfirmDeleteId(null)}
                />
            )}
        </div>
    );
};
// Modal de confirmation de suppression
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
    <div className="modal show d-block" tabIndex="-1">
        <div className="modal-dialog">
            <div className="modal-content">
                <div className="modal-header">
                    <h5 className="modal-title">Confirmation</h5>
                    <button type="button" className="btn-close" onClick={onCancel}></button>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>
                        Annuler
                    </button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm}>
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// Composant Modal pour créer/éditer une bourse
const ScholarshipModal = ({ scholarship, schools, levelTypes, specialties, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        school_code: '',
        level_type: '',
        specialty: '',
        amount: '',
        conditions: '',
        ...scholarship
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.school_code || !formData.level_type || !formData.amount) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        const dataToSave = {
            ...formData,
            amount: parseFloat(formData.amount)
        };

        onSave(dataToSave);
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {scholarship ? 'Modifier' : 'Créer'} une Bourse
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">École *</label>
                                    <select 
                                        className="form-select"
                                        value={formData.school_code}
                                        onChange={(e) => handleChange('school_code', e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner une école</option>
                                        {schools.map(school => (
                                            <option key={school.code} value={school.code}>
                                                {school.name} ({school.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Niveau d'étude *</label>
                                    <select 
                                        className="form-select"
                                        value={formData.level_type}
                                        onChange={(e) => handleChange('level_type', e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner un niveau</option>
                                        {levelTypes.map(level => (
                                            <option key={level} value={level}>
                                                {level}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Spécialité</label>
                                    <select 
                                        className="form-select"
                                        value={formData.specialty}
                                        onChange={(e) => handleChange('specialty', e.target.value)}
                                    >
                                        <option value="">Toutes spécialités</option>
                                        {specialties.map(spec => (
                                            <option key={spec} value={spec}>
                                                {spec}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Montant (FCFA) *</label>
                                    <input 
                                        type="number"
                                        className="form-control"
                                        value={formData.amount}
                                        onChange={(e) => handleChange('amount', e.target.value)}
                                        placeholder="Ex: 50000"
                                        min="0"
                                        step="1000"
                                        required
                                    />
                                </div>

                                <div className="col-12 mb-3">
                                    <label className="form-label">Conditions d'attribution</label>
                                    <textarea 
                                        className="form-control"
                                        rows="3"
                                        value={formData.conditions}
                                        onChange={(e) => handleChange('conditions', e.target.value)}
                                        placeholder="Décrivez les conditions pour bénéficier de cette bourse..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Annuler
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {scholarship ? 'Modifier' : 'Créer'} la Bourse
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ScholarshipManagementPage;