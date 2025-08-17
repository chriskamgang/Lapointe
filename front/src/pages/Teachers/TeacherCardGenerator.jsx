/**
 * Générateur de cartes avec QR code pour les enseignants
 * Permet de générer et imprimer les cartes d'identification avec QR codes
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Table,
    Badge,
    Alert,
    Spinner,
    Form,
    Modal,
    ButtonGroup,
    Toast,
    ToastContainer
} from 'react-bootstrap';
import {
    PersonBadge,
    QrCode,
    Printer,
    Download,
    CheckCircleFill,
    XCircleFill,
    PersonCheck,
    Search,
    Plus,
    Eye,
    Refresh
} from 'react-bootstrap-icons';
import { useAuth } from '../../hooks/useAuth';
import { secureApiEndpoints } from '../../utils/apiMigration';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const TeacherCardGenerator = () => {
    const [teachers, setTeachers] = useState([]);
    const [selectedTeachers, setSelectedTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewTeacher, setPreviewTeacher] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [toastList, setToastList] = useState([]);
    const [showBulkModal, setShowBulkModal] = useState(false);

    const { user } = useAuth();
    const cardRef = useRef(null);

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        try {
            setIsLoading(true);
            const response = await secureApiEndpoints.teacherAttendance.getTeachersWithQR();

            if (response.success) {
                setTeachers(response.data.teachers || []);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des enseignants:', error);
            showToast('Erreur lors du chargement des enseignants', 'danger');
        } finally {
            setIsLoading(false);
        }
    };

    const generateQRCode = async (teacherId) => {
        try {
            const response = await secureApiEndpoints.teacherAttendance.generateQRCode({
                teacher_id: teacherId
            });

            if (response.success) {
                showToast('QR Code généré avec succès', 'success');
                await loadTeachers(); // Recharger pour voir le nouveau QR code
                return response.data;
            }
        } catch (error) {
            console.error('Erreur lors de la génération du QR code:', error);
            showToast('Erreur lors de la génération du QR code', 'danger');
        }
        return null;
    };

    const handleSelectTeacher = (teacherId) => {
        setSelectedTeachers(prev => {
            if (prev.includes(teacherId)) {
                return prev.filter(id => id !== teacherId);
            } else {
                return [...prev, teacherId];
            }
        });
    };

    const handleSelectAll = () => {
        const filteredTeachers = getFilteredTeachers();
        if (selectedTeachers.length === filteredTeachers.length) {
            setSelectedTeachers([]);
        } else {
            setSelectedTeachers(filteredTeachers.map(t => t.id));
        }
    };

    const getFilteredTeachers = () => {
        return teachers.filter(teacher => 
            teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const previewCard = (teacher) => {
        setPreviewTeacher(teacher);
        setShowPreviewModal(true);
    };

    const downloadCard = async (teacher) => {
        try {
            setIsGenerating(true);
            
            // Si pas de QR code, le générer d'abord
            if (!teacher.qr_code) {
                const result = await generateQRCode(teacher.id);
                if (result) {
                    teacher = { ...teacher, ...result.teacher, qr_image_url: result.qr_image_url };
                }
            }

            // Créer un élément temporaire pour le rendu
            const tempElement = document.createElement('div');
            tempElement.innerHTML = generateCardHTML(teacher);
            tempElement.style.position = 'absolute';
            tempElement.style.left = '-9999px';
            document.body.appendChild(tempElement);

            try {
                // Convertir en image
                const canvas = await html2canvas(tempElement.firstChild, {
                    width: 400,
                    height: 250,
                    scale: 2
                });

                // Créer le PDF
                const pdf = new jsPDF('landscape', 'mm', [85.6, 54]); // Format carte de crédit
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54);
                
                // Télécharger
                pdf.save(`carte_enseignant_${teacher.full_name.replace(/\s+/g, '_')}.pdf`);
                
                showToast(`Carte téléchargée: ${teacher.full_name}`, 'success');
            } finally {
                document.body.removeChild(tempElement);
            }
        } catch (error) {
            console.error('Erreur lors de la génération de la carte:', error);
            showToast('Erreur lors de la génération de la carte', 'danger');
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadBulkCards = async () => {
        try {
            setIsGenerating(true);
            const selectedTeachersList = teachers.filter(t => selectedTeachers.includes(t.id));
            
            if (selectedTeachersList.length === 0) {
                showToast('Aucun enseignant sélectionné', 'warning');
                return;
            }

            const pdf = new jsPDF('landscape', 'mm', 'a4');
            let cardCount = 0;
            const cardsPerPage = 8; // 4x2 cartes par page A4
            const cardWidth = 85.6;
            const cardHeight = 54;
            const marginX = 10;
            const marginY = 15;

            for (const teacher of selectedTeachersList) {
                let teacherWithQR = teacher;
                
                // Générer QR si nécessaire
                if (!teacher.qr_code) {
                    const result = await generateQRCode(teacher.id);
                    if (result) {
                        teacherWithQR = { ...teacher, ...result.teacher, qr_image_url: result.qr_image_url };
                    }
                }

                // Calculer position
                const row = Math.floor((cardCount % cardsPerPage) / 2);
                const col = cardCount % 2;
                const x = marginX + col * (cardWidth + 5);
                const y = marginY + row * (cardHeight + 5);

                // Nouvelle page si nécessaire
                if (cardCount > 0 && cardCount % cardsPerPage === 0) {
                    pdf.addPage();
                }

                // Créer et ajouter la carte
                const tempElement = document.createElement('div');
                tempElement.innerHTML = generateCardHTML(teacherWithQR);
                tempElement.style.position = 'absolute';
                tempElement.style.left = '-9999px';
                document.body.appendChild(tempElement);

                try {
                    const canvas = await html2canvas(tempElement.firstChild, {
                        width: 400,
                        height: 250,
                        scale: 2
                    });
                    const imgData = canvas.toDataURL('image/png');
                    pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight);
                } finally {
                    document.body.removeChild(tempElement);
                }

                cardCount++;
            }

            pdf.save(`cartes_enseignants_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast(`${selectedTeachersList.length} cartes téléchargées`, 'success');
            setShowBulkModal(false);
            
        } catch (error) {
            console.error('Erreur lors de la génération des cartes:', error);
            showToast('Erreur lors de la génération des cartes', 'danger');
        } finally {
            setIsGenerating(false);
        }
    };

    const generateCardHTML = (teacher) => {
        const qrImageUrl = teacher.qr_image_url || 'data:image/svg+xml;base64,' + btoa(`
            <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="#f8f9fa" stroke="#dee2e6"/>
                <text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial" font-size="10" fill="#6c757d">QR Code</text>
            </svg>
        `);

        return `
            <div style="
                width: 400px; 
                height: 250px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 15px;
                color: white;
                font-family: Arial, sans-serif;
                position: relative;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            ">
                <!-- Logo/École -->
                <div style="
                    position: absolute;
                    top: 15px;
                    left: 20px;
                    font-size: 14px;
                    font-weight: bold;
                    opacity: 0.9;
                ">
                    COLLEGE POLYVALENT BILINGUE
                </div>
                
                <!-- Type de carte -->
                <div style="
                    position: absolute;
                    top: 35px;
                    left: 20px;
                    font-size: 11px;
                    opacity: 0.8;
                ">
                    CARTE ENSEIGNANT
                </div>
                
                <!-- Informations enseignant -->
                <div style="
                    position: absolute;
                    top: 80px;
                    left: 20px;
                    right: 130px;
                ">
                    <div style="
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 8px;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    ">
                        ${teacher.full_name || 'N/A'}
                    </div>
                    
                    <div style="
                        font-size: 12px;
                        opacity: 0.9;
                        margin-bottom: 4px;
                    ">
                        📧 ${teacher.email || 'N/A'}
                    </div>
                    
                    <div style="
                        font-size: 11px;
                        opacity: 0.8;
                        margin-bottom: 4px;
                    ">
                        ID: ${teacher.id}
                    </div>
                    
                    <div style="
                        font-size: 10px;
                        opacity: 0.7;
                    ">
                        Horaires: ${teacher.expected_arrival_time || '08:00'} - ${teacher.expected_departure_time || '17:00'}
                    </div>
                </div>
                
                <!-- QR Code -->
                <div style="
                    position: absolute;
                    top: 50px;
                    right: 20px;
                    width: 100px;
                    height: 100px;
                    background: white;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                ">
                    <img src="${qrImageUrl}" 
                         style="width: 90px; height: 90px; border-radius: 5px;" 
                         alt="QR Code"/>
                </div>
                
                <!-- Code QR texte -->
                <div style="
                    position: absolute;
                    bottom: 40px;
                    right: 20px;
                    font-size: 9px;
                    opacity: 0.8;
                    text-align: center;
                    width: 100px;
                ">
                    ${teacher.qr_code || 'QR_PENDING'}
                </div>
                
                <!-- Footer -->
                <div style="
                    position: absolute;
                    bottom: 15px;
                    left: 20px;
                    font-size: 9px;
                    opacity: 0.7;
                ">
                    Valide ${new Date().getFullYear()} • Scanner pour présence
                </div>
                
                <!-- Décoration -->
                <div style="
                    position: absolute;
                    top: -50px;
                    right: -50px;
                    width: 100px;
                    height: 100px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 50%;
                "></div>
                
                <div style="
                    position: absolute;
                    bottom: -30px;
                    left: -30px;
                    width: 60px;
                    height: 60px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 50%;
                "></div>
            </div>
        `;
    };

    const showToast = (message, variant = 'info') => {
        const id = Date.now();
        const newToast = { id, message, variant };
        setToastList(prev => [...prev, newToast]);
        
        setTimeout(() => {
            setToastList(prev => prev.filter(toast => toast.id !== id));
        }, 5000);
    };

    const filteredTeachers = getFilteredTeachers();

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>
                                <PersonBadge className="me-2" />
                                Génération Cartes Enseignants
                            </h2>
                            <p className="text-muted mb-0">
                                Générer et imprimer les cartes avec QR codes
                            </p>
                        </div>
                        
                        <ButtonGroup>
                            <Button 
                                variant="primary"
                                onClick={() => setShowBulkModal(true)}
                                disabled={selectedTeachers.length === 0}
                            >
                                <Download className="me-1" />
                                Télécharger ({selectedTeachers.length})
                            </Button>
                            <Button 
                                variant="outline-secondary"
                                onClick={loadTeachers}
                                disabled={isLoading}
                            >
                                <Refresh className="me-1" />
                                Actualiser
                            </Button>
                        </ButtonGroup>
                    </div>
                </Col>
            </Row>

            {/* Statistiques */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body>
                            <PersonCheck size={24} className="text-primary mb-2" />
                            <h4>{teachers.length}</h4>
                            <small className="text-muted">Total Enseignants</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body>
                            <QrCode size={24} className="text-success mb-2" />
                            <h4>{teachers.filter(t => t.qr_code).length}</h4>
                            <small className="text-muted">Avec QR Code</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body>
                            <XCircleFill size={24} className="text-warning mb-2" />
                            <h4>{teachers.filter(t => !t.qr_code).length}</h4>
                            <small className="text-muted">Sans QR Code</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body>
                            <CheckCircleFill size={24} className="text-info mb-2" />
                            <h4>{selectedTeachers.length}</h4>
                            <small className="text-muted">Sélectionnés</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Barre de recherche et filtres */}
            <Row className="mb-4">
                <Col md={6}>
                    <Form.Group>
                        <Form.Control
                            type="text"
                            placeholder="Rechercher un enseignant..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Form.Group>
                </Col>
                <Col md={6} className="text-end">
                    <Button 
                        variant="outline-primary"
                        onClick={handleSelectAll}
                        disabled={filteredTeachers.length === 0}
                    >
                        {selectedTeachers.length === filteredTeachers.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </Button>
                </Col>
            </Row>

            {/* Table des enseignants */}
            <Row>
                <Col>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Liste des Enseignants</h5>
                        </Card.Header>
                        <Card.Body>
                            {isLoading ? (
                                <div className="text-center py-4">
                                    <Spinner animation="border" />
                                    <p className="mt-2">Chargement des enseignants...</p>
                                </div>
                            ) : filteredTeachers.length > 0 ? (
                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={selectedTeachers.length === filteredTeachers.length && filteredTeachers.length > 0}
                                                    onChange={handleSelectAll}
                                                />
                                            </th>
                                            <th>Nom</th>
                                            <th>Email</th>
                                            <th>QR Code</th>
                                            <th>Horaires</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTeachers.map(teacher => (
                                            <tr key={teacher.id}>
                                                <td>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={selectedTeachers.includes(teacher.id)}
                                                        onChange={() => handleSelectTeacher(teacher.id)}
                                                    />
                                                </td>
                                                <td>
                                                    <strong>{teacher.full_name}</strong>
                                                    <br />
                                                    <small className="text-muted">ID: {teacher.id}</small>
                                                </td>
                                                <td>{teacher.email}</td>
                                                <td>
                                                    {teacher.qr_code ? (
                                                        <Badge bg="success">
                                                            <QrCode className="me-1" />
                                                            Généré
                                                        </Badge>
                                                    ) : (
                                                        <Badge bg="warning">
                                                            <XCircleFill className="me-1" />
                                                            À générer
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    <small>
                                                        {teacher.expected_arrival_time || '08:00'} - {teacher.expected_departure_time || '17:00'}
                                                        <br />
                                                        <span className="text-muted">
                                                            {teacher.daily_work_hours || 8}h/jour
                                                        </span>
                                                    </small>
                                                </td>
                                                <td>
                                                    <ButtonGroup size="sm">
                                                        <Button
                                                            variant="outline-info"
                                                            onClick={() => previewCard(teacher)}
                                                            title="Aperçu"
                                                        >
                                                            <Eye />
                                                        </Button>
                                                        {!teacher.qr_code && (
                                                            <Button
                                                                variant="outline-warning"
                                                                onClick={() => generateQRCode(teacher.id)}
                                                                title="Générer QR"
                                                            >
                                                                <Plus />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline-primary"
                                                            onClick={() => downloadCard(teacher)}
                                                            disabled={isGenerating}
                                                            title="Télécharger"
                                                        >
                                                            <Download />
                                                        </Button>
                                                    </ButtonGroup>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <div className="text-center py-4">
                                    <PersonBadge size={48} className="text-muted mb-3" />
                                    <p className="text-muted">Aucun enseignant trouvé</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Modal d'aperçu */}
            <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <Eye className="me-2" />
                        Aperçu Carte - {previewTeacher?.full_name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    {previewTeacher && (
                        <div 
                            ref={cardRef}
                            dangerouslySetInnerHTML={{ __html: generateCardHTML(previewTeacher) }}
                            style={{ display: 'inline-block' }}
                        />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
                        Fermer
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => downloadCard(previewTeacher)}
                        disabled={isGenerating}
                    >
                        <Download className="me-1" />
                        Télécharger
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal téléchargement groupé */}
            <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <Download className="me-2" />
                        Téléchargement Groupé
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Vous allez télécharger {selectedTeachers.length} cartes enseignants.</p>
                    <p className="text-muted">
                        Les cartes seront générées dans un seul fichier PDF avec 8 cartes par page.
                    </p>
                    {isGenerating && (
                        <div className="text-center">
                            <Spinner animation="border" />
                            <p className="mt-2">Génération en cours...</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBulkModal(false)} disabled={isGenerating}>
                        Annuler
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={downloadBulkCards}
                        disabled={isGenerating}
                    >
                        {isGenerating ? 'Génération...' : 'Télécharger'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Toasts */}
            <ToastContainer position="top-end" className="p-3">
                {toastList.map(toast => (
                    <Toast 
                        key={toast.id}
                        bg={toast.variant}
                        show={true}
                        onClose={() => setToastList(prev => prev.filter(t => t.id !== toast.id))}
                        delay={5000}
                        autohide
                    >
                        <Toast.Body className="text-white">
                            {toast.message}
                        </Toast.Body>
                    </Toast>
                ))}
            </ToastContainer>
        </Container>
    );
};

export default TeacherCardGenerator;