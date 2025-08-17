/**
 * Scanner de présences avec support offline complet
 * Version améliorée avec synchronisation automatique et dashboard temps réel
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
    Wifi,
    WifiOff,
    CloudArrowUp,
    CloudArrowDown,
    ExclamationTriangle,
    InfoCircle
} from 'react-bootstrap-icons';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineMode } from '../../hooks/useOfflineMode';
import { secureApiEndpoints } from '../../utils/apiMigration';
import offlineStorageService from '../../services/OfflineStorageService';
import RealTimeDashboard from '../../components/RealTimeDashboard';
import QrScanner from 'qr-scanner';
import Swal from 'sweetalert2';

const AttendanceScannerOffline = () => {
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
    const [showDashboard, setShowDashboard] = useState(false);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [toastList, setToastList] = useState([]);

    const { user } = useAuth();
    const {
        isOnline,
        isSyncing,
        syncStats,
        syncStatus,
        saveAttendanceOffline,
        getStudentFromCache,
        forceSync,
        preloadCache,
        getPendingAttendances
    } = useOfflineMode();

    const videoRef = useRef(null);
    const qrScannerRef = useRef(null);

    useEffect(() => {
        loadTodayAttendances();
        loadEntryExitStats();
        
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
                const response = await secureApiEndpoints.supervisors.getDailyAttendance({
                    supervisor_id: user.id
                });

                if (response.success) {
                    setTodayAttendances(response.data.attendances || []);
                }
            } else {
                // Mode offline: combiner les données cachées + présences en attente
                const pendingAttendances = await getPendingAttendances();
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

            const response = await secureApiEndpoints.supervisors.getEntryExitStats({
                supervisor_id: user.id
            });

            if (response.success) {
                setEntryExitStats(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    };

    const handleScanResult = async (result) => {
        if (!result || result.trim() === '') return;

        console.log('🔍 QR Code scanné:', result);
        setIsScanning(false);
        stopScanner();

        try {
            await processAttendanceScan(result);
        } catch (error) {
            console.error('Erreur lors du traitement du scan:', error);
            setMessage('Erreur lors du traitement du scan');
            setMessageType('danger');
        }
    };

    const processAttendanceScan = async (qrCode) => {
        try {
            setIsLoading(true);
            setMessage('');

            // Essayer d'abord de traiter online si possible
            if (isOnline) {
                const response = await secureApiEndpoints.supervisors.scanQR({
                    student_qr_code: qrCode,
                    supervisor_id: user.id,
                    event_type: eventType
                });

                if (response.success) {
                    // Mettre en cache l'étudiant pour une utilisation future offline
                    if (response.data && response.data.student) {
                        const studentToCache = {
                            id: response.data.student.id,
                            full_name: response.data.student.full_name,
                            qrCode: qrCode,
                            class_name: response.data.student.class_name || 'N/A'
                        };
                        try {
                            await offlineStorageService.cacheStudents([studentToCache]);
                        } catch (cacheError) {
                            console.warn('Erreur lors de la mise en cache:', cacheError);
                        }
                    }
                    
                    setMessage(`✅ ${response.data.message}`);
                    setMessageType('success');
                    await loadTodayAttendances();
                    await loadEntryExitStats();
                    showToast('Présence enregistrée (en ligne)', 'success');
                    return;
                }
            }

            // Mode offline ou échec online
            console.log('📱 Traitement en mode offline...');
            
            // Essayer de trouver l'étudiant dans le cache
            const cachedStudent = await getStudentFromCache(qrCode);
            
            if (!cachedStudent) {
                // Si l'étudiant n'est pas en cache, créer un enregistrement minimal
                const attendanceData = {
                    studentId: qrCode,
                    studentName: `Étudiant ${qrCode}`,
                    studentQrCode: qrCode,
                    supervisorId: user.id,
                    eventType: eventType,
                    isPresent: true,
                    notes: 'Scan offline - étudiant non trouvé en cache'
                };

                await saveAttendanceOffline(attendanceData);
                
                setMessage('📱 Présence sauvegardée offline (étudiant non trouvé en cache)');
                setMessageType('warning');
                showToast('Présence sauvegardée offline', 'warning', <CloudArrowDown />);
            } else {
                // Étudiant trouvé en cache
                const attendanceData = {
                    studentId: cachedStudent.id,
                    studentName: cachedStudent.full_name,
                    studentQrCode: qrCode,
                    supervisorId: user.id,
                    eventType: eventType,
                    isPresent: true,
                    notes: 'Scan offline'
                };

                await saveAttendanceOffline(attendanceData);
                
                setMessage(`📱 Présence sauvegardée offline: ${cachedStudent.full_name}`);
                setMessageType('info');
                showToast(`Présence offline: ${cachedStudent.full_name}`, 'info', <CloudArrowDown />);
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
                console.log('✅ Scanner QR démarré avec succès');
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
            await processAttendanceScan(manualQrCode.trim());
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

    const handlePreloadCache = async () => {
        try {
            await preloadCache();
            showToast('Cache préchargé avec succès', 'success');
        } catch (error) {
            showToast('Erreur lors du préchargement: ' + error.message, 'danger');
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

    return (
        <Container fluid className="py-4">
            {/* Header avec statut réseau */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>
                                Scanner de Présences
                                {getNetworkStatusBadge()}
                            </h2>
                            <p className="text-muted mb-0">
                                Surveillance: {user?.name}
                            </p>
                        </div>
                        
                        <ButtonGroup>
                            <Button 
                                variant={showDashboard ? "primary" : "outline-primary"}
                                onClick={() => setShowDashboard(!showDashboard)}
                            >
                                Dashboard
                            </Button>
                            <Button 
                                variant="outline-info"
                                onClick={() => setShowOfflineModal(true)}
                            >
                                <InfoCircle className="me-1" />
                                Status ({syncStats.pendingAttendances})
                            </Button>
                        </ButtonGroup>
                    </div>
                </Col>
            </Row>

            {/* Dashboard temps réel */}
            {showDashboard && (
                <Row className="mb-4">
                    <Col>
                        <RealTimeDashboard 
                            supervisorId={user?.id}
                            isOnline={isOnline}
                            syncStatus={syncStatus}
                            onRefresh={loadEntryExitStats}
                        />
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
                                Scanner QR Code
                            </div>
                            <ButtonGroup size="sm">
                                <Button 
                                    variant="outline-secondary"
                                    onClick={() => setShowManualInput(!showManualInput)}
                                >
                                    Saisie manuelle
                                </Button>
                                {isOnline && (
                                    <Button 
                                        variant="outline-success"
                                        onClick={handlePreloadCache}
                                        disabled={isSyncing}
                                    >
                                        <CloudArrowDown className="me-1" />
                                        Cache
                                    </Button>
                                )}
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
                                                placeholder="Code QR ou ID étudiant"
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
                                            <QrCodeScan size={48} className="mb-2" />
                                            <p>Cliquez sur "Démarrer Scanner" pour commencer</p>
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
                                Présences du jour
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
                                            <th>Étudiant</th>
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
                                                    <small>{attendance.student?.full_name || attendance.studentName || 'Inconnu'}</small>
                                                </td>
                                                <td>
                                                    {attendance.event_type === 'entry' || attendance.eventType === 'entry' ? (
                                                        <Badge bg="success" size="sm">
                                                            <ArrowRightCircle size={12} className="me-1" />
                                                            Entrée
                                                        </Badge>
                                                    ) : (
                                                        <Badge bg="warning" size="sm">
                                                            <ArrowLeftCircle size={12} className="me-1" />
                                                            Sortie
                                                        </Badge>
                                                    )}
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
                                    <XCircleFill size={32} className="mb-2" />
                                    <p>Aucune présence enregistrée aujourd'hui</p>
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
                        <strong>Présences en attente:</strong> {syncStats.pendingAttendances}
                    </div>
                    
                    <div className="mb-3">
                        <strong>Étudiants en cache:</strong> {syncStats.cachedStudents}
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

export default AttendanceScannerOffline;