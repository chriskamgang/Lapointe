import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

const ScholarshipModal = ({ show, onHide, onSave, scholarship, schools }) => {
    const [formData, setFormData] = useState({
        school_code: '',
        level_type: '',
        specialty: '',
        amount: '',
        conditions: ''
    });

    useEffect(() => {
        if (scholarship) {
            setFormData({
                school_code: scholarship.school_code,
                level_type: scholarship.level_type,
                specialty: scholarship.specialty || '',
                amount: scholarship.amount || '',
                conditions: scholarship.conditions || ''
            });
        } else {
            setFormData({
                school_code: '',
                level_type: '',
                specialty: '',
                amount: '',
                conditions: ''
            });
        }
    }, [scholarship]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{scholarship ? 'Éditer Bourse' : 'Ajouter Bourse'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Form.Group controlId="formSchool">
                        <Form.Label>École</Form.Label>
                        <Form.Select name="school_code" value={formData.school_code} onChange={handleChange} required>
                            <option value="">Sélectionner une école</option>
                            {schools.map((school) => (
                                <option key={school.code} value={school.code}>
                                    {school.name} ({school.code})
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group controlId="formLevel">
                        <Form.Label>Niveau</Form.Label>
                        <Form.Control
                            type="text"
                            name="level_type"
                            value={formData.level_type}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="formSpecialty">
                        <Form.Label>Spécialité</Form.Label>
                        <Form.Control
                            type="text"
                            name="specialty"
                            value={formData.specialty}
                            onChange={handleChange}
                        />
                    </Form.Group>
                    <Form.Group controlId="formAmount">
                        <Form.Label>Montant</Form.Label>
                        <Form.Control
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="formConditions">
                        <Form.Label>Conditions</Form.Label>
                        <Form.Control
                            as="textarea"
                            name="conditions"
                            value={formData.conditions}
                            onChange={handleChange}
                        />
                    </Form.Group>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={onHide}>
                            Annuler
                        </Button>
                        <Button variant="primary" type="submit">
                            Sauvegarder
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default ScholarshipModal;