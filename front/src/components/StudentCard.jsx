import React from 'react';
import { useSchool } from '../contexts/SchoolContext';
import defaultPhoto from '../images/1.png';
import cameroonFlag from '../images/carte.jpeg'; // On utilisera le drapeau intégré dans l'image de référence

const StudentCard = ({ student, schoolYear, onPrint }) => {
    const { schoolSettings, getLogoUrl } = useSchool();
    console.log(student);
    
    const getStudentPhotoUrl = (student) => {
        // Priorité à photo_url (URL complète générée par le backend)
        if (student.photo_url) {
            console.log('Using backend photo_url:', student.photo_url);
            return student.photo_url;
        }
        
        // Fallback sur le champ photo
        if (student.photo) {
            // Si c'est déjà une URL complète
            if (student.photo.startsWith('http')) {
                console.log('Using full URL from photo field:', student.photo);
                return student.photo;
            }
            
            // Si c'est un chemin relatif, construire l'URL complète
            const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
            const fullUrl = `${baseUrl}/storage/${student.photo}`;
            console.log('Constructed photo URL from photo field:', fullUrl);
            return fullUrl;
        }
        
        // Aucune photo trouvée, utiliser l'image par défaut
        console.log('No photo found for student:', student.full_name || `${student.first_name} ${student.last_name}`, '- using default');
        return defaultPhoto;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const generateMatricule = (student) => {
        if (student.matricule) return student.matricule;
        
        // Générer un matricule basé sur l'année et l'ID
        const year = new Date().getFullYear().toString().slice(-2);
        const id = student.id.toString().padStart(4, '0');
        return `${year}${id}AB`;
    };

    const generateQRCode = (student) => {
        // Format conforme au système de présences : "STUDENT_ID_123"
        const qrData = `STUDENT_ID_${student.id}`;
        
        // Générer le QR code avec une taille appropriée et marge minimale
        return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}&margin=1`;
    };

    const cardStyle = {
        width: '85.6mm', // Format carte standard
        height: '54mm',
        backgroundColor: '#fff',
        border: '2px solid #e67e22',
        borderRadius: '8px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        lineHeight: '1.1',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        margin: '0 auto'
    };

    const headerStyle = {
        backgroundColor: '#f8f9fa',
        padding: '2px 4px',
        borderBottom: '1px solid #e67e22',
        textAlign: 'center',
        fontSize: '7px',
        fontWeight: 'bold'
    };

    const bodyStyle = {
        padding: '3px',
        display: 'flex',
        height: 'calc(100% - 18px)', // Réduire l'en-tête pour plus d'espace
        position: 'relative'
    };

    const photoStyle = {
        width: '32px',
        height: '38px',
        objectFit: 'cover',
        border: '1px solid #ddd',
        borderRadius: '2px',
        marginRight: '3px',
        flexShrink: 0
    };

    const infoStyle = {
        flex: 1,
        fontSize: '10px',
        lineHeight: '1.2',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        paddingRight: '34px' // Espace pour le QR code avec bordure
    };

    const qrStyle = {
        position: 'absolute',
        bottom: '20px',
        right: '4px',
        width: '50px',
        height: '50px',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '2px',
        padding: '2px',
        boxSizing: 'border-box'
    };

    const footerStyle = {
        position: 'absolute',
        bottom: '5px',
        left: '2px',
        fontSize: '5px',
        color: '#666'
    };

    return (
        <div style={cardStyle} className="student-card">
            {/* En-tête avec drapeau et nom de l'école */}
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '6px' }}>
                        🇨🇲 RÉPUBLIQUE DU CAMEROUN<br />
                        Paix - Travail - Patrie
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#2c3e50' }}>
                            {schoolSettings.school_name?.toUpperCase() || 'LYCÉE GANALIS'}
                        </div>
                        <div style={{ fontSize: '8px', color: '#7f8c8d' }}>
                            CARTE D'IDENTITÉ SCOLAIRE
                        </div>
                    </div>
                    <div style={{ width: '20px' }}>
                        {getLogoUrl() && (
                            <img 
                                src={getLogoUrl()} 
                                alt="Logo" 
                                style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Corps de la carte */}
            <div style={bodyStyle}>
                {/* Photo de l'étudiant */}
                <div>
                    <img 
                        src={getStudentPhotoUrl(student)} 
                        alt={`${student.first_name} ${student.last_name}`}
                        style={photoStyle}
                        onError={(e) => {
                            // Éviter les boucles infinies si l'image par défaut échoue aussi
                            if (e.target.src !== defaultPhoto) {
                                e.target.src = defaultPhoto;
                            }
                        }}
                        onLoad={(e) => {
                            // Debug: afficher l'URL de l'image chargée
                            console.log('Photo loaded:', e.target.src);
                        }}
                    />
                </div>

                {/* Informations de l'étudiant */}
                <div style={infoStyle}>
                    <div>
                        <div style={{ fontSize: '7px', marginBottom: '1px', fontWeight: 'bold', color: '#2c3e50' }}>
                            ANNÉE SCOLAIRE : {schoolYear?.year || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`}
                        </div>
                        
                        <div style={{ marginBottom: '1px', fontSize: '10px' }}>
                            <strong>Nom :</strong> {student.last_name?.toUpperCase() || ''}
                        </div>
                        
                        <div style={{ marginBottom: '1px', fontSize: '10px' }}>
                            <strong>Prénom :</strong> {student.first_name || ''}
                        </div>
                        
                        <div style={{ marginBottom: '1px', fontSize: '9px' }}>
                            <strong>Né(e) le :</strong> {formatDate(student.date_of_birth)} 
                            <strong style={{ marginLeft: '4px' }}>À :</strong> {student.place_of_birth || 'BAFOUSSAM'}
                        </div>
                        <div style={{ marginBottom: '1px', fontSize: '10px' }}>
                            <strong>Matricule :</strong> {generateMatricule(student)}
                        </div>
                        
                        <div style={{ marginBottom: '1px', fontSize: '9px' }}>
                            <strong>Sexe :</strong> {student.gender === 'male' ? 'M' : student.gender === 'female' ? 'F' : 'M'}
                            <strong style={{ marginLeft: '8px' }}>Classe :</strong> {student.class_series?.name || student.current_class || ''}
                        </div>
                        {student.parent_name && (
                            <div style={{ marginBottom: '1px', fontSize: '9px', }}>
                                <strong>Parent/Tuteur :</strong> {student.parent_name}
                            </div>
                        )}
                        <div style={{ marginBottom: '1px', fontSize: '10px' }}>
                            <strong>Contact :</strong> {student.phone || student.parent_phone || 'Non renseigné'}
                        </div>
                    </div>
                    
                </div>

                {/* QR Code */}
                <div style={qrStyle}>
                    <img 
                        src={generateQRCode(student)} 
                        alt="QR Code"
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            display: 'block',
                            maxWidth: '100%',
                            maxHeight: '100%'
                        }}
                        onError={(e) => {
                            console.error('QR Code failed to load for student:', student.id);
                            // Fallback: afficher un petit carré avec l'ID
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                        onLoad={() => {
                            console.log('QR Code loaded successfully for student:', student.id);
                        }}
                    />
                    <div 
                        style={{
                            display: 'none',
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #ddd',
                            borderRadius: '2px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '6px',
                            fontWeight: 'bold',
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: '1'
                        }}
                    >
                        ID<br/>{student.id}
                    </div>
                </div>
            </div>

            <div style={{ 
                position: 'absolute', 
                bottom: '5px', 
                right:'30%', 
                fontSize: '4px', 
                color: '#aaa',
                textAlign: 'center',
                maxWidth: '140px',
                lineHeight: '1.1'
            }}>
                Generated by Djephix (www.djephix.com) © / j'{new Date().getFullYear()} ALL RIGHTS RESERVED
            </div>
        </div>
    );
};

export default StudentCard;