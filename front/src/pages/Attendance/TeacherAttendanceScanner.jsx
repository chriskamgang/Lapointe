/**
 * Scanner de présences pour les enseignants
 * Adaptation du scanner étudiant pour gérer les présences des enseignants
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
    Card, 
    Button, 
    Alert, 
    Container, 
    Row, 
    Col, 
    Table, 
    Badge, 
    Spinner, 
    ButtonGroup, 
    Form,
    Modal,
    ProgressBar,
    Toast,
    ToastContainer
} from 'react-bootstrap';
import { 
    QrCodeScan, 
    CheckCircleFill, 
    XCircleFill, 
    Calendar, 
    Clock, 
    ArrowRightCircle, 
    ArrowLeftCircle,
    PersonBadge,
    Wifi,
    WifiOff,
    CloudArrowUp,
    CloudArrowDown,
    ExclamationTriangle,
    InfoCircle,
    PersonCheck,
    PersonX
} from 'react-bootstrap-icons';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineMode } from '../../hooks/useOfflineMode';
import { secureApiEndpoints } from '../../utils/apiMigration';
import QrScanner from 'qr-scanner';
import Swal from 'sweetalert2';

const TeacherAttendanceScanner = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [todayAttendances, setTodayAttendances] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [scannerError, setScannerError] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualQrCode, setManualQrCode] = useState('');
    const [eventType, setEventType] = useState('auto');
    const [entryExitStats, setEntryExitStats] = useState(null);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [toastList, setToastList] = useState([]);
    const [teachersList, setTeachersList] = useState([]);

    const { user } = useAuth();
    const {
        isOnline,
        isSyncing,
        syncStats,
        syncStatus,
        saveAttendanceOffline,
        forceSync
    } = useOfflineMode();

    const videoRef = useRef(null);
    const qrScannerRef = useRef(null);

    useEffect(() => {
        loadTodayAttendances();
        loadEntryExitStats();
        loadTeachersList();
        
        return () => {
            if (qrScannerRef.current) {
                qrScannerRef.current.destroy();
            }
        };
    }, []);

    // Surveiller les changements de statut offline/online
    useEffect(() => {
        if (!isOnline) {
            showToast('Mode offline activé', 'warning', <WifiOff />);
        } else {
            showToast('Connexion restaurée', 'success', <Wifi />);
        }
    }, [isOnline]);

    // Surveiller les changements de synchronisation
    useEffect(() => {
        if (syncStatus === 'syncing') {
            showToast('Synchronisation en cours...', 'info', <CloudArrowUp />);
        } else if (syncStatus === 'success') {
            showToast('Synchronisation terminée', 'success', <CheckCircleFill />);
        } else if (syncStatus === 'error') {
            showToast('Erreur de synchronisation', 'danger', <ExclamationTriangle />);
        }
    }, [syncStatus]);

    const loadTodayAttendances = async () => {
        try {
            setIsLoading(true);
            
            if (isOnline) {
                const response = await secureApiEndpoints.teacherAttendance.getDailyAttendance({
                    supervisor_id: user.id
                });

                if (response.success) {
                    setTodayAttendances(response.data.attendances || []);
                }
            } else {
                // Mode offline: récupérer les présences en attente
                const pendingAttendances = await getPendingTeacherAttendances();
                setTodayAttendances(pendingAttendances);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des présences:', error);
            showToast('Erreur lors du chargement des présences', 'danger');
        } finally {
            setIsLoading(false);
        }
    };

    const loadEntryExitStats = async () => {
        try {
            if (!isOnline) return;

            const response = await secureApiEndpoints.teacherAttendance.getEntryExitStats({
                supervisor_id: user.id
            });

            if (response.success) {
                setEntryExitStats(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    };

    const loadTeachersList = async () => {
        try {
            if (!isOnline) return;

            const response = await secureApiEndpoints.teacherAttendance.getTeachersWithQR();

            if (response.success) {
                setTeachersList(response.data.teachers || []);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des enseignants:', error);
        }
    };

    const getPendingTeacherAttendances = async () => {
        // Simulation pour mode offline
        const stored = localStorage.getItem('pendingTeacherAttendances');
        return stored ? JSON.parse(stored) : [];
    };

    const saveTeacherAttendanceOffline = async (attendanceData) => {
        const stored = localStorage.getItem('pendingTeacherAttendances');
        const pendingAttendances = stored ? JSON.parse(stored) : [];
        
        const newAttendance = {
            ...attendanceData,
            timestamp: new Date().toISOString(),
            syncStatus: 'pending',
            id: Date.now()
        };
        
        pendingAttendances.push(newAttendance);
        localStorage.setItem('pendingTeacherAttendances', JSON.stringify(pendingAttendances));
        
        return newAttendance;
    };

    const handleScanResult = async (result) => {
        if (!result || result.trim() === '') return;

        console.log('🔍 QR Code enseignant scanné:', result);
        setIsScanning(false);
        stopScanner();

        try {
            await processTeacherAttendanceScan(result);
        } catch (error) {
            console.error('Erreur lors du traitement du scan:', error);
            setMessage('Erreur lors du traitement du scan');
            setMessageType('danger');
        }
    };

    const processTeacherAttendanceScan = async (qrCode) => {
        try {
            setIsLoading(true);
            setMessage('');

            // Essayer d'abord de traiter online si possible
            if (isOnline) {
                const response = await secureApiEndpoints.teacherAttendance.scanQR({
                    teacher_qr_code: qrCode,
                    supervisor_id: user.id,
                    event_type: eventType
                });

                if (response.success) {
                    const data = response.data;
                    
                    setMessage(`✅ ${response.message}`);
                    setMessageType('success');
                    await loadTodayAttendances();
                    await loadEntryExitStats();
                    
                    // Afficher des informations détaillées
                    if (data.punctuality_info) {
                        const info = data.punctuality_info;
                        let statusMessage = '';
                        
                        if (info.late_minutes > 0) {
                            statusMessage += ` (${info.late_minutes} min de retard)`;
                        }
                        if (info.early_departure_minutes > 0) {
                            statusMessage += ` (${info.early_departure_minutes} min de départ anticipé)`;
                        }
                        if (info.work_hours > 0) {
                            statusMessage += ` (${info.work_hours}h travaillées)`;
                        }
                        
                        if (statusMessage) {
                            showToast(`Présence enregistrée${statusMessage}`, 'info');
                        }
                    }
                    
                    showToast('Présence enseignant enregistrée (en ligne)', 'success');
                    return;
                }
            }

            // Mode offline ou échec online
            console.log('📱 Traitement en mode offline...');
            
            // Trouver l'enseignant dans la liste locale
            const teacher = teachersList.find(t => t.qr_code === qrCode);
            
            const attendanceData = {
                teacherId: teacher?.id || qrCode,
                teacherName: teacher?.full_name || `Enseignant ${qrCode}`,
                teacherQrCode: qrCode,
                supervisorId: user.id,
                eventType: eventType,
                isPresent: true,
                notes: teacher ? 'Scan offline' : 'Scan offline - enseignant non trouvé en cache'
            };

            await saveTeacherAttendanceOffline(attendanceData);
            
            if (teacher) {
                setMessage(`📱 Présence sauvegardée offline: ${teacher.full_name}`);
                setMessageType('info');
                showToast(`Présence offline: ${teacher.full_name}`, 'info', <CloudArrowDown />);
            } else {
                setMessage('📱 Présence sauvegardée offline (enseignant non trouvé en cache)');
                setMessageType('warning');
                showToast('Présence sauvegardée offline', 'warning', <CloudArrowDown />);
            }

            await loadTodayAttendances();

        } catch (error) {
            console.error('Erreur lors du traitement:', error);
            setMessage('❌ Erreur lors de l\'enregistrement de la présence');
            setMessageType('danger');
            showToast('Erreur lors de l\'enregistrement', 'danger');
        } finally {
            setIsLoading(false);
        }
    };

    const startScanner = async () => {
        try {
            setScannerError('');
            setIsScanning(true);
            
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            
            const cameras = await QrScanner.listCameras(true);
            
            if (cameras.length === 0) {
                throw new Error('Aucune caméra trouvée sur cet appareil');
            }
            
            if (videoRef.current) {
                qrScannerRef.current = new QrScanner(
                    videoRef.current,
                    (result) => handleScanResult(result.data),
                    {
                        returnDetailedScanResult: true,
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                    }
                );
                
                await qrScannerRef.current.start();
                console.log('✅ Scanner QR enseignants démarré avec succès');
            }
        } catch (error) {
            console.error('❌ Erreur scanner:', error);
            setScannerError(error.message);
            setIsScanning(false);
            showToast('Erreur du scanner: ' + error.message, 'danger');
        }
    };

    const stopScanner = () => {
        if (qrScannerRef.current) {
            qrScannerRef.current.stop();
            setIsScanning(false);
            console.log('⏹️ Scanner arrêté');
        }
    };

    const handleManualScan = async () => {
        if (manualQrCode.trim()) {
            await processTeacherAttendanceScan(manualQrCode.trim());
            setManualQrCode('');
            setShowManualInput(false);
        }
    };

    const handleForceSync = async () => {
        try {
            await forceSync();
            showToast('Synchronisation forcée terminée', 'success');
        } catch (error) {
            showToast('Erreur lors de la synchronisation: ' + error.message, 'danger');
        }
    };

    const showToast = (message, variant = 'info', icon = null) => {
        const id = Date.now();
        const newToast = {
            id,
            message,
            variant,
            icon,
            timestamp: new Date()
        };
        
        setToastList(prev => [...prev, newToast]);
        
        // Auto-suppression après 5 secondes
        setTimeout(() => {
            setToastList(prev => prev.filter(toast => toast.id !== id));
        }, 5000);
    };

    const getNetworkStatusBadge = () => {
        if (!isOnline) {
            return <Badge bg="warning" className="ms-2">
                <WifiOff size={12} className="me-1" />
                Offline
            </Badge>;
        }
        
        if (isSyncing) {
            return <Badge bg="info" className="ms-2">
                <CloudArrowUp size={12} className="me-1" />
                Sync...
            </Badge>;
        }
        
        return <Badge bg="success" className="ms-2">
            <Wifi size={12} className="me-1" />
            Online
        </Badge>;
    };

    const getAttendanceTypeIcon = (eventType) => {
        return eventType === 'entry' ? (
            <ArrowRightCircle size={12} className="me-1" />
        ) : (
            <ArrowLeftCircle size={12} className="me-1" />
        );
    };

    const getAttendanceTypeBadge = (eventType) => {
        return eventType === 'entry' ? (
            <Badge bg="success" size="sm">
                {getAttendanceTypeIcon(eventType)}
                Entrée
            </Badge>
        ) : (
            <Badge bg="warning" size="sm">
                {getAttendanceTypeIcon(eventType)}
                Sortie
            </Badge>
        );
    };

    return (
        <Container fluid className="py-4">
            {/* Header avec statut réseau */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>
                                <PersonBadge className="me-2" />
                                Scanner Présences Enseignants
                                {getNetworkStatusBadge()}
                            </h2>
                            <p className="text-muted mb-0">
                                Surveillance: {user?.name}
                            </p>
                        </div>
                        
                        <ButtonGroup>
                            <Button 
                                variant="outline-info"
                                onClick={() => setShowOfflineModal(true)}
                            >
                                <InfoCircle className="me-1" />
                                Status ({syncStats.pendingAttendances || 0})
                            </Button>
                        </ButtonGroup>
                    </div>
                </Col>
            </Row>

            {/* Statistiques rapides */}
            {entryExitStats && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="text-center">
                            <Card.Body>
                                <PersonCheck size={24} className="text-success mb-2" />
                                <h4>{entryExitStats.totals.present_teachers}</h4>
                                <small className="text-muted">Présents</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center">
                            <Card.Body>
                                <ArrowRightCircle size={24} className="text-primary mb-2" />
                                <h4>{entryExitStats.totals.entries}</h4>
                                <small className="text-muted">Entrées</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center">
                            <Card.Body>
                                <ArrowLeftCircle size={24} className="text-warning mb-2" />
                                <h4>{entryExitStats.totals.exits}</h4>
                                <small className="text-muted">Sorties</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center">
                            <Card.Body>
                                <Clock size={24} className="text-danger mb-2" />
                                <h4>{entryExitStats.totals.late_teachers}</h4>
                                <small className="text-muted">En retard</small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Alerte mode offline */}
            {!isOnline && (
                <Alert variant="warning" className="mb-4">
                    <WifiOff className="me-2" />
                    <strong>Mode offline activé</strong> - Les présences seront synchronisées automatiquement lors du retour en ligne.
                    {syncStats.pendingAttendances > 0 && (
                        <span className="ms-2">
                            ({syncStats.pendingAttendances} présence(s) en attente)
                        </span>
                    )}
                </Alert>
            )}

            {/* Interface de scan principale */}
            <Row>
                <Col lg={6} className="mb-4">
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <div>
                                <QrCodeScan className="me-2" />
                                Scanner QR Code Enseignant
                            </div>
                            <ButtonGroup size="sm">
                                <Button 
                                    variant="outline-secondary"
                                    onClick={() => setShowManualInput(!showManualInput)}
                                >
                                    Saisie manuelle
                                </Button>
                            </ButtonGroup>
                        </Card.Header>
                        
                        <Card.Body>
                            {/* Contrôles du scanner */}
                            <div className="mb-3">
                                <div className="d-flex gap-2 mb-3">
                                    <Button 
                                        variant={isScanning ? "danger" : "success"}
                                        onClick={isScanning ? stopScanner : startScanner}
                                        disabled={isLoading}
                                    >
                                        {isScanning ? "Arrêter" : "Démarrer"} Scanner
                                    </Button>
                                    
                                    <Form.Select 
                                        value={eventType} 
                                        onChange={(e) => setEventType(e.target.value)}
                                        style={{ width: 'auto' }}
                                    >
                                        <option value="auto">Auto-détection</option>
                                        <option value="entry">Entrée forcée</option>
                                        <option value="exit">Sortie forcée</option>
                                    </Form.Select>
                                </div>

                                {/* Saisie manuelle */}
                                {showManualInput && (
                                    <div className="mb-3">
                                        <div className="d-flex gap-2">
                                            <Form.Control
                                                type="text"
                                                placeholder="Code QR enseignant"
                                                value={manualQrCode}
                                                onChange={(e) => setManualQrCode(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                                            />
                                            <Button 
                                                variant="primary" 
                                                onClick={handleManualScan}
                                                disabled={!manualQrCode.trim() || isLoading}
                                            >
                                                Scanner
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Zone de scan vidéo */}
                            <div className="text-center">
                                <video 
                                    ref={videoRef}
                                    style={{ 
                                        width: '100%', 
                                        maxWidth: '400px',
                                        height: '300px',
                                        border: '2px solid #dee2e6',
                                        borderRadius: '8px',
                                        display: isScanning ? 'block' : 'none'
                                    }}
                                />
                                
                                {!isScanning && (
                                    <div 
                                        className="d-flex align-items-center justify-content-center text-muted"
                                        style={{ height: '300px', border: '2px dashed #dee2e6', borderRadius: '8px' }}
                                    >
                                        <div className="text-center">
                                            <PersonBadge size={48} className="mb-2" />
                                            <p>Scanner QR Code Enseignant</p>
                                            <small className="text-muted">Cliquez sur "Démarrer Scanner"</small>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Messages et erreurs */}
                            {scannerError && (
                                <Alert variant="danger" className="mt-3">
                                    {scannerError}
                                </Alert>
                            )}
                            
                            {message && (
                                <Alert variant={messageType} className="mt-3">
                                    {message}
                                </Alert>
                            )}

                            {/* Loader */}
                            {isLoading && (
                                <div className="text-center mt-3">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2 text-muted">Traitement en cours...</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Liste des présences du jour */}
                <Col lg={6} className="mb-4">
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <div>
                                <Calendar className="me-2" />
                                Présences Enseignants du jour
                            </div>
                            <div>
                                {isSyncing && <Spinner animation="border" size="sm" className="me-2" />}
                                <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={loadTodayAttendances}
                                    disabled={isLoading}
                                >
                                    Actualiser
                                </Button>
                                {!isOnline && syncStats.pendingAttendances > 0 && (
                                    <Button 
                                        variant="warning" 
                                        size="sm"
                                        onClick={handleForceSync}
                                        disabled={isSyncing}
                                        className="ms-2"
                                    >
                                        <CloudArrowUp className="me-1" />
                                        Sync ({syncStats.pendingAttendances})
                                    </Button>
                                )}
                            </div>
                        </Card.Header>
                        
                        <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {todayAttendances.length > 0 ? (
                                <Table responsive size="sm">
                                    <thead>
                                        <tr>
                                            <th>Heure</th>
                                            <th>Enseignant</th>
                                            <th>Type</th>
                                            <th>Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todayAttendances.map((attendance, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <small>
                                                        <Clock size={12} className="me-1" />
                                                        {attendance.scanned_at || attendance.timestamp ? 
                                                            new Date(attendance.scanned_at || attendance.timestamp).toLocaleTimeString() : 
                                                            'N/A'
                                                        }
                                                    </small>
                                                </td>
                                                <td>
                                                    <small>{attendance.teacher?.full_name || attendance.teacherName || 'Inconnu'}</small>
                                                </td>
                                                <td>
                                                    {getAttendanceTypeBadge(attendance.event_type || attendance.eventType)}
                                                </td>
                                                <td>
                                                    {attendance.syncStatus === 'pending' ? (
                                                        <Badge bg="secondary" size="sm">En attente</Badge>
                                                    ) : attendance.syncStatus === 'syncing' ? (
                                                        <Badge bg="info" size="sm">Sync...</Badge>
                                                    ) : attendance.syncStatus === 'error' ? (
                                                        <Badge bg="danger" size="sm">Erreur</Badge>
                                                    ) : (
                                                        <Badge bg="success" size="sm">
                                                            <CheckCircleFill size={12} />
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <div className="text-center text-muted py-4">
                                    <PersonX size={32} className="mb-2" />
                                    <p>Aucune présence enseignant enregistrée aujourd'hui</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Modal de statut offline */}
            <Modal show={showOfflineModal} onHide={() => setShowOfflineModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <InfoCircle className="me-2" />
                        Statut de Synchronisation
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <strong>Statut réseau:</strong> 
                        <Badge bg={isOnline ? "success" : "warning"} className="ms-2">
                            {isOnline ? "En ligne" : "Hors ligne"}
                        </Badge>
                    </div>
                    
                    <div className="mb-3">
                        <strong>Présences en attente:</strong> {syncStats.pendingAttendances || 0}
                    </div>
                    
                    <div className="mb-3">
                        <strong>Enseignants chargés:</strong> {teachersList.length}
                    </div>
                    
                    {isSyncing && (
                        <div className="mb-3">
                            <ProgressBar animated now={100} label="Synchronisation en cours..." />
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowOfflineModal(false)}>
                        Fermer
                    </Button>
                    {isOnline && syncStats.pendingAttendances > 0 && (
                        <Button variant="primary" onClick={handleForceSync} disabled={isSyncing}>
                            <CloudArrowUp className="me-1" />
                            Synchroniser
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Toasts de notification */}
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
                            {toast.icon && <span className="me-2">{toast.icon}</span>}
                            {toast.message}
                        </Toast.Body>
                    </Toast>
                ))}
            </ToastContainer>
        </Container>
    );
};

export default TeacherAttendanceScanner;