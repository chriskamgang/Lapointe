import React, { useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { Printer } from 'react-bootstrap-icons';
import StudentCard from './StudentCard';
import { useSchool } from '../contexts/SchoolContext';
import Swal from 'sweetalert2';

const StudentCardPrint = ({ student, schoolYear, show, onHide, onPrintSuccess }) => {
    const [printing, setPrinting] = useState(false);
    const { schoolSettings } = useSchool();

    const convertImageToBase64 = async (imageSrc) => {
        return new Promise((resolve, reject) => {
            if (!imageSrc) {
                resolve('');
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                try {
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (error) {
                    console.error('Error converting image to base64:', error);
                    resolve('');
                }
            };
            
            img.onerror = function() {
                console.error('Error loading image:', imageSrc);
                resolve('');
            };
            
            img.src = imageSrc;
        });
    };

    const getStudentPhotoUrl = (student) => {
        if (student.photo_url) return student.photo_url;
        if (student.photo) {
            if (student.photo.startsWith('http')) return student.photo;
            const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
            return `${baseUrl}/storage/${student.photo}`;
        }
        // Retourner l'image par défaut en utilisant un chemin absolu
        return `${window.location.origin}/static/media/1.png`;
    };

    const handlePrint = async () => {
        if (!student) return;

        try {
            setPrinting(true);

            // Convertir les images en base64 pour l'impression
            const studentPhotoUrl = getStudentPhotoUrl(student);
            const logoUrl = schoolSettings?.logo_url;
            
            console.log('Preparing images for print:', {
                studentPhotoUrl,
                logoUrl,
                studentId: student.id
            });
            
            const [studentPhotoBase64, logoBase64] = await Promise.all([
                convertImageToBase64(studentPhotoUrl),
                convertImageToBase64(logoUrl)
            ]);
            
            console.log('Images converted to base64:', {
                hasStudentPhoto: !!studentPhotoBase64,
                hasLogo: !!logoBase64,
                studentPhotoLength: studentPhotoBase64?.length || 0,
                logoLength: logoBase64?.length || 0
            });

            // Créer une nouvelle fenêtre pour l'impression
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            
            if (!printWindow) {
                throw new Error('Popup bloqué. Veuillez autoriser les popups pour imprimer.');
            }

            // Générer le HTML de la carte avec les styles d'impression
            const cardHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Carte Scolaire - ${student.first_name} ${student.last_name}</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            background: white;
                            padding: 20px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                        }
                        
                        .card-container {
                            width: 85.6mm;
                            height: 54mm;
                            background: white;
                            border: 2px solid #e67e22;
                            border-radius: 8px;
                            overflow: hidden;
                            position: relative;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        
                        .card-header {
                            background: #f8f9fa;
                            padding: 4px 8px;
                            border-bottom: 1px solid #e67e22;
                            text-align: center;
                            font-size: 8px;
                            font-weight: bold;
                        }
                        
                        .header-content {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        }
                        
                        .flag-section {
                            font-size: 6px;
                        }
                        
                        .school-section {
                            text-align: center;
                            flex: 1;
                        }
                        
                        .school-name {
                            font-size: 10px;
                            font-weight: bold;
                            color: #2c3e50;
                        }
                        
                        .card-title {
                            font-size: 8px;
                            color: #7f8c8d;
                        }
                        
                        .logo-section {
                            width: 20px;
                        }
                        
                        .logo {
                            width: 18px;
                            height: 18px;
                            object-fit: contain;
                        }
                        
                        .card-body {
                            padding: 6px;
                            display: flex;
                            height: calc(100% - 30px);
                            position: relative;
                        }
                        
                        .photo {
                            width: 40px;
                            height: 45px;
                            object-fit: cover;
                            border: 1px solid #ddd;
                            border-radius: 2px;
                            margin-right: 6px;
                        }
                        
                        .info-section {
                            flex: 1;
                            font-size: 8px;
                            line-height: 1.2;
                        }
                        
                        .year-info {
                            font-size: 7px;
                            margin-bottom: 2px;
                            font-weight: bold;
                        }
                        
                        .info-line {
                            margin-bottom: 1px;
                        }
                        
                        .qr-code {
                            position: absolute;
                            bottom: 20px;
                            right: 4px;
                            width: 40px;
                            height: 40px;
                        }
                        
                        .qr-image {
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                        }
                        
                        .matricule {
                            position: absolute;
                            bottom: 2px;
                            left: 4px;
                            font-size: 6px;
                            color: #666;
                            font-weight: bold;
                        }
                        
                        .copyright {
                            position: absolute;
                            bottom: 1px;
                            right: 60px;
                            font-size: 5px;
                            color: #aaa;
                        }
                        
                        @media print {
                            body {
                                margin: 0;
                                padding: 10mm;
                            }
                            
                            .no-print {
                                display: none !important;
                            }
                        }
                        
                        .print-controls {
                            text-align: center;
                            margin-top: 20px;
                        }
                        
                        .print-btn {
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            margin: 0 5px;
                            font-size: 14px;
                        }
                        
                        .close-btn {
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            margin: 0 5px;
                            font-size: 14px;
                        }
                    </style>
                </head>
                <body>
                    <div class="card-container">
                        <div class="card-header">
                            <div class="header-content">
                                <div class="flag-section">
                                    🇨🇲 RÉPUBLIQUE DU CAMEROUN<br />
                                    Paix - Travail - Patrie
                                </div>
                                <div class="school-section">
                                    <div class="school-name">${schoolSettings?.school_name?.toUpperCase() || 'LYCÉE GANALIS'}</div>
                                    <div class="card-title">CARTE D'IDENTITÉ SCOLAIRE</div>
                                </div>
                                <div class="logo-section">
                                    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : '<div style="width: 18px; height: 18px; background: #ddd; border-radius: 2px;"></div>'}
                                </div>
                            </div>
                        </div>
                        
                        <div class="card-body">
                            <img 
                                src="${studentPhotoBase64 || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0MCA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQ1IiBmaWxsPSIjZjBmMGYwIiBzdHJva2U9IiNkZGQiLz4KPHN2ZyB4PSI1IiB5PSI1IiB3aWR0aD0iMzAiIGhlaWdodD0iMzUiIHZpZXdCb3g9IjAgMCAzMCAzNSIgZmlsbD0ibm9uZSI+CjxjaXJjbGUgY3g9IjE1IiBjeT0iMTAiIHI9IjUiIGZpbGw9IiM5OTkiLz4KPHBhdGggZD0iTTUgMzBDNSAyNSAxMCAyMCAxNSAyMEMyMCAyMCAyNSAyNSAyNSAzMFYzNUg1VjMwWiIgZmlsbD0iIzk5OSIvPgo8L3N2Zz4KPC9zdmc+'}"
                                alt="Photo étudiant"
                                class="photo"
                            />
                            
                            <div class="info-section">
                                <div class="year-info">
                                    ANNÉE SCOLAIRE : ${schoolYear?.year || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`}
                                </div>
                                
                                <div class="info-line">
                                    <strong>Nom :</strong> ${student.last_name?.toUpperCase() || ''}
                                </div>
                                
                                <div class="info-line">
                                    <strong>Prénom :</strong> ${student.first_name || ''}
                                </div>
                                
                                <div class="info-line">
                                    <strong>Née le :</strong> ${student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('fr-FR') : ''} 
                                    <strong style="margin-left: 8px;">À</strong> ${student.place_of_birth || 'DOUALA'}
                                </div>
                                
                                <div class="info-line">
                                    <strong>Matricule :</strong> ${student.matricule || `${new Date().getFullYear().toString().slice(-2)}${student.id.toString().padStart(4, '0')}AB`}
                                </div>
                                
                                <div class="info-line">
                                    <strong>Sexe :</strong> ${student.gender === 'male' ? 'M' : student.gender === 'female' ? 'F' : 'M'}
                                    <strong style="margin-left: 15px;">Classe :</strong> ${student.class_series?.name || student.current_class || ''}
                                </div>
                                
                                
                                <div class="info-line">
                                    <strong>Parent/Tuteur :</strong> ${student.parent_name || ''}
                                </div>
                                <div class="info-line">
                                    <strong>Contact:</strong> ${student.parent_phone || '***********'}
                                </div>
                                
                                <div class="info-line">
                                    <strong>Prénom :</strong> ${student.first_name || ''}
                                </div>
                            </div>
                            
                            <div class="qr-code">
                                <img 
                                    src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`STUDENT_ID_${student.id}`)}&margin=1"
                                    alt="QR Code"
                                    class="qr-image"
                                />
                            </div>
                        </div>
                        <div class="copyright">
                            Generated by Djephix (www.djephix.com) © / ${new Date().getFullYear()} ALL RIGHTS RESERVED
                        </div>
                    </div>
                    
                    <div class="print-controls no-print">
                        <button class="print-btn" onclick="window.print()">
                            🖨️ Imprimer la carte
                        </button>
                        <button class="close-btn" onclick="window.close()">
                            ✖️ Fermer
                        </button>
                    </div>
                    
                    <script>
                        // Auto-focus pour permettre Ctrl+P
                        window.focus();
                        
                        // Optionnel: impression automatique après chargement
                        // window.onload = function() { window.print(); }
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(cardHtml);
            printWindow.document.close();
            
            // Attendre que la fenêtre se charge avant de permettre l'impression
            printWindow.onload = () => {
                setPrinting(false);
                if (onPrintSuccess) {
                    onPrintSuccess();
                }
            };

        } catch (error) {
            console.error('Erreur lors de l\'impression:', error);
            setPrinting(false);
            
            Swal.fire({
                title: 'Erreur d\'impression',
                text: error.message || 'Impossible d\'ouvrir la fenêtre d\'impression',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    };

    if (!student) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <Printer className="me-2" />
                    Carte Scolaire - {student.first_name} {student.last_name}
                </Modal.Title>
            </Modal.Header>
            
            <Modal.Body>
                <div className="text-center mb-3">
                    <div className="d-inline-block" style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}>
                        <StudentCard 
                            student={student} 
                            schoolYear={schoolYear} 
                        />
                    </div>
                </div>
                
                <div className="text-center text-muted">
                    <small>
                        📌 Aperçu de la carte scolaire<br />
                        Cliquez sur "Imprimer" pour ouvrir la fenêtre d'impression
                    </small>
                </div>
            </Modal.Body>
            
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Annuler
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handlePrint}
                    disabled={printing}
                >
                    {printing ? (
                        <>
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                className="me-2"
                            />
                            Préparation...
                        </>
                    ) : (
                        <>
                            <Printer className="me-2" />
                            Imprimer la carte
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default StudentCardPrint;