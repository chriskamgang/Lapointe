import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert, Container, Row, Col, Table, Badge, Spinner, ButtonGroup, Form } from 'react-bootstrap';
import { QrCodeScan, CheckCircleFill, XCircleFill, Calendar, Clock, ArrowRightCircle, ArrowLeftCircle } from 'react-bootstrap-icons';
import { useAuth } from '../../hooks/useAuth';
import { secureApiEndpoints } from '../../utils/apiMigration';
import QrScanner from 'qr-scanner';
import Swal from 'sweetalert2';

const AttendanceScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [todayAttendances, setTodayAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualQrCode, setManualQrCode] = useState('');
  const [isMarkingAbsent, setIsMarkingAbsent] = useState(false);
  const [eventType, setEventType] = useState('auto'); // 'entry', 'exit' ou 'auto'
  const [entryExitStats, setEntryExitStats] = useState(null);
  
  const { user } = useAuth();
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

  const loadTodayAttendances = async () => {
    try {
      setIsLoading(true);
      const response = await secureApiEndpoints.supervisors.getDailyAttendance({
        supervisor_id: user.id
      });

      if (response.success) {
        setTodayAttendances(response.data.attendances || []);
      } else {
        console.error('Erreur API:', response.message);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des présences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEntryExitStats = async () => {
    try {
      const response = await secureApiEndpoints.supervisors.getEntryExitStats({
        supervisor_id: user.id
      });

      if (response.success) {
        setEntryExitStats(response.data);
      } else {
        console.error('Erreur API stats:', response.message);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const startScanner = async () => {
    try {
      setScannerError('');
      setIsScanning(true);
      
      console.log('🔍 Tentative de démarrage du scanner...');
      
      // Vérifier d'abord les permissions de caméra
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('✅ Permissions caméra accordées');
        stream.getTracks().forEach(track => track.stop()); // Arrêter le stream de test
      } catch (permError) {
        console.error('❌ Permissions caméra refusées:', permError);
        throw new Error('Permission denied: ' + permError.message);
      }
      
      // Vérifier les caméras disponibles
      const cameras = await QrScanner.listCameras(true);
      console.log('📷 Caméras disponibles:', cameras);
      
      if (cameras.length === 0) {
        throw new Error('Aucune caméra trouvée sur cet appareil');
      }
      
      if (videoRef.current) {
        // Configuration plus permissive
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result) => handleScanResult(result.data),
          {
            onDecodeError: error => {
              // Réduire le bruit des erreurs de décodage
              // console.log('Scan decode error:', error);
            },
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: cameras.length > 1 ? 'environment' : cameras[0].id, // Utiliser la première caméra si une seule
            maxScansPerSecond: 3, // Réduire pour éviter la surcharge
            returnDetailedScanResult: false,
          }
        );
        
        console.log('⏳ Démarrage du scanner QR...');
        await qrScannerRef.current.start();
        console.log('✅ Scanner QR démarré avec succès');
        
        // Masquer le formulaire de saisie manuelle si le scanner fonctionne
        setShowManualInput(false);
      }
    } catch (error) {
      console.error('❌ Erreur lors du démarrage du scanner:', error);
      console.error('Type d\'erreur:', error.constructor.name);
      console.error('Message:', error.message);
      
      let errorMessage = 'Impossible d\'accéder à la caméra.';
      let debugInfo = '';
      
      if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
        errorMessage = '🚫 Accès à la caméra refusé par le navigateur.';
        debugInfo = 'Cliquez sur l\'icône 🔒 dans la barre d\'adresse et autorisez la caméra.';
      } else if (error.name === 'NotFoundError' || error.message.includes('Camera not found')) {
        errorMessage = '📷 Aucune caméra trouvée.';
        debugInfo = 'Vérifiez qu\'une caméra est connectée et fonctionnelle.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '🌐 Votre navigateur ne supporte pas l\'accès à la caméra.';
        debugInfo = 'Essayez avec Chrome, Firefox ou Safari récent.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '⚠️ Caméra occupée par une autre application.';
        debugInfo = 'Fermez les autres applications utilisant la caméra.';
      } else {
        errorMessage = '🔧 Erreur technique du scanner.';
        debugInfo = `Détails: ${error.message}`;
      }
      
      setScannerError(`${errorMessage} ${debugInfo}`);
      setIsScanning(false);
      
      // Proposer l'alternative de saisie manuelle
      setShowManualInput(true);
    }
  };

  const stopScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
    setShowManualInput(false);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualQrCode.trim()) return;
    
    await handleScanResult(manualQrCode.trim());
    setManualQrCode('');
    setShowManualInput(false);
  };

  const runCameraDiagnostic = async () => {
    console.log('🔍 === DIAGNOSTIC CAMÉRA ===');
    
    try {
      // Test 1: Vérifier le support MediaDevices
      if (!navigator.mediaDevices) {
        console.log('❌ navigator.mediaDevices non supporté');
        return;
      }
      console.log('✅ navigator.mediaDevices supporté');
      
      // Test 2: Lister les appareils
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      console.log('📷 Caméras détectées:', cameras.length);
      cameras.forEach((camera, index) => {
        console.log(`  ${index + 1}. ${camera.label || 'Caméra sans nom'} (${camera.deviceId})`);
      });
      
      // Test 3: Test d'accès simple
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'environment' 
          } 
        });
        console.log('✅ Accès caméra réussi');
        console.log('📹 Stream:', stream.getVideoTracks()[0].getSettings());
        stream.getTracks().forEach(track => track.stop());
      } catch (streamError) {
        console.log('❌ Échec accès caméra:', streamError.name, streamError.message);
      }
      
      // Test 4: Test QrScanner
      try {
        const qrCameras = await QrScanner.listCameras(true);
        console.log('📱 QrScanner caméras:', qrCameras.length);
        qrCameras.forEach((camera, index) => {
          console.log(`  ${index + 1}. ${camera.label} (${camera.id})`);
        });
      } catch (qrError) {
        console.log('❌ QrScanner erreur:', qrError.message);
      }
      
    } catch (error) {
      console.log('❌ Erreur diagnostic:', error);
    }
    
    console.log('🔍 === FIN DIAGNOSTIC ===');
  };

  const handleMarkAllAbsent = async () => {
    const result = await Swal.fire({
      title: '📋 Marquer les absents ?',
      html: `
        <p>Cette action va marquer comme <strong>absents</strong> tous les étudiants qui n'ont pas été enregistrés comme présents aujourd'hui.</p>
        <div class="alert alert-info mt-3">
          <strong>ℹ️ Note :</strong> Seuls les étudiants qui n'ont <strong>aucune entrée</strong> aujourd'hui seront marqués absents.
        </div>
        <p><strong>Êtes-vous sûr de vouloir continuer ?</strong></p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '✅ Oui, marquer les absents',
      cancelButtonText: '❌ Annuler'
    });

    if (result.isConfirmed) {
      setIsMarkingAbsent(true);
      
      try {
        const response = await secureApiEndpoints.supervisors.markAllAbsentStudents({
          supervisor_id: user.id,
          attendance_date: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        });

        if (response.success) {
          // Afficher le résultat détaillé
          const classStatsHtml = Object.entries(response.data.class_statistics || {})
            .map(([className, count]) => `<li><strong>${className}:</strong> ${count} absent(s)</li>`)
            .join('');

          await Swal.fire({
            title: '✅ Absences marquées !',
            html: `
              <div class="text-left">
                <p><strong>${response.data.absent_students_marked}</strong> étudiant(s) marqué(s) comme absent(s)</p>
                <hr>
                <p><strong>📊 Résumé du jour :</strong></p>
                <ul class="list-unstyled">
                  <li>👥 <strong>Total étudiants :</strong> ${response.data.total_students}</li>
                  <li>✅ <strong>Présents :</strong> ${response.data.present_students}</li>
                  <li>❌ <strong>Absents marqués :</strong> ${response.data.absent_students_marked}</li>
                </ul>
                ${classStatsHtml ? `
                <hr>
                <p><strong>📋 Par classe :</strong></p>
                <ul>${classStatsHtml}</ul>
                ` : ''}
                <div class="alert alert-success mt-3">
                  <small>📱 Les parents ont été notifiés automatiquement par WhatsApp</small>
                </div>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'Parfait !'
          });

          // Recharger les données
          loadTodayAttendances();
          loadEntryExitStats();
        } else {
          Swal.fire({
            title: 'Erreur',
            text: response.message || 'Erreur lors du marquage des absences',
            icon: 'error'
          });
        }
      } catch (error) {
        console.error('Erreur marquage absences:', error);
        Swal.fire({
          title: 'Erreur',
          text: 'Erreur lors du marquage des absences',
          icon: 'error'
        });
      } finally {
        setIsMarkingAbsent(false);
      }
    }
  };

  const handleScanResult = async (qrCode) => {
    try {
      stopScanner();
      setIsLoading(true);
      
      const response = await secureApiEndpoints.supervisors.scanQR({
        student_qr_code: qrCode,
        supervisor_id: user.id,
        event_type: eventType
      });
      
      if (response.success) {
        const eventIcon = response.data.event_type === 'entry' ? '🟢' : '🔴';
        setMessage(`${eventIcon} ${response.data.event_label} de ${response.data.student_name} enregistrée à ${response.data.marked_at}`);
        setMessageType('success');
        loadTodayAttendances(); // Recharger la liste
        loadEntryExitStats(); // Recharger les statistiques
      } else {
        // Afficher le message d'erreur détaillé
        let errorMessage = response.message;
        if (response.student_name) {
          errorMessage = `${response.student_name}: ${response.message}`;
        }
        setMessage(`❌ ${errorMessage}`);
        setMessageType('danger');
      }
    } catch (error) {
      console.error('Erreur scan:', error);
      
      // Tenter d'extraire un message d'erreur plus détaillé
      let errorMessage = 'Erreur lors de l\'enregistrement de la présence';
      
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error_details) {
          errorMessage = `Erreur technique: ${error.response.data.error_details}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage(`❌ ${errorMessage}`);
      setMessageType('danger');
    } finally {
      setIsLoading(false);
      // Auto-clear message after 5 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">
            <QrCodeScan className="me-2" />
            Scanner de Présences
          </h2>
        </Col>
      </Row>

      {/* Scanner School */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <QrCodeScan className="me-2" />
                Scanner QR
              </h5>
            </Card.Header>
            <Card.Body>
              {scannerError && (
                <Alert variant="danger" className="mb-3">
                  <div className="d-flex align-items-start">
                    <div className="me-2">📷</div>
                    <div>
                      <strong>Problème de caméra :</strong><br />
                      {scannerError}
                      <hr className="my-2" />
                      <small>
                        <strong>Solutions :</strong><br />
                        • Utilisez la <strong>saisie manuelle</strong> ci-dessous<br />
                        • Cliquez sur l'icône 🔒 dans la barre d'adresse et autorisez la caméra<br />
                        • Actualisez la page après avoir autorisé<br />
                        • Fermez les autres onglets/apps utilisant la caméra
                      </small>
                      <hr className="my-2" />
                      <Button 
                        variant="outline-info" 
                        size="sm"
                        onClick={runCameraDiagnostic}
                      >
                        🔍 Diagnostic caméra (voir console)
                      </Button>
                    </div>
                  </div>
                </Alert>
              )}
              
              {message && (
                <Alert variant={messageType} className="mb-3">
                  {message}
                </Alert>
              )}

              {/* Event Type Selection */}
              <div className="mb-4">
                <h6 className="mb-3">Mode de scan :</h6>
                <ButtonGroup className="w-100">
                  <Button
                    variant={eventType === 'auto' ? 'primary' : 'outline-primary'}
                    onClick={() => setEventType('auto')}
                    disabled={isScanning}
                    size="sm"
                  >
                    🤖 Automatique
                  </Button>
                  <Button
                    variant={eventType === 'entry' ? 'success' : 'outline-success'}
                    onClick={() => setEventType('entry')}
                    disabled={isScanning}
                    size="sm"
                  >
                    <ArrowRightCircle className="me-1" size={14} />
                    Entrée
                  </Button>
                  <Button
                    variant={eventType === 'exit' ? 'danger' : 'outline-danger'}
                    onClick={() => setEventType('exit')}
                    disabled={isScanning}
                    size="sm"
                  >
                    <ArrowLeftCircle className="me-1" size={14} />
                    Sortie
                  </Button>
                </ButtonGroup>
                <div className="mt-2">
                  <small className="text-muted">
                    {eventType === 'auto' && '🤖 Le système déterminera automatiquement si c\'est une entrée ou sortie'}
                    {eventType === 'entry' && '🟢 Mode entrée forcée'}
                    {eventType === 'exit' && '🔴 Mode sortie forcée'}
                  </small>
                </div>
              </div>

              <div className="text-center mb-3">
                {!isScanning ? (
                  <div className="d-flex flex-column gap-2">
                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={startScanner}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <QrCodeScan className="me-2" />
                          Démarrer le Scanner
                        </>
                      )}
                    </Button>
                    
                    {!showManualInput ? (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => setShowManualInput(true)}
                        disabled={isLoading}
                      >
                        📝 Saisie manuelle
                      </Button>
                    ) : (
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => setShowManualInput(false)}
                      >
                        ❌ Annuler saisie
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button 
                    variant="danger" 
                    size="lg"
                    onClick={stopScanner}
                  >
                    <XCircleFill className="me-2" />
                    Arrêter le Scanner
                  </Button>
                )}
              </div>

              {/* Manual Input Form */}
              {showManualInput && (
                <div className="mb-4">
                  <Card className="border-warning">
                    <Card.Header className="bg-warning text-dark">
                      <h6 className="mb-0">📝 Saisie manuelle du code QR</h6>
                    </Card.Header>
                    <Card.Body>
                      <Form onSubmit={handleManualSubmit}>
                        <Form.Group className="mb-3">
                          <Form.Label>Code QR ou ID de l'étudiant</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="Ex: STUDENT_ID_123 ou 123"
                            value={manualQrCode}
                            onChange={(e) => setManualQrCode(e.target.value)}
                            disabled={isLoading}
                          />
                          <Form.Text className="text-muted">
                            Saisissez le code QR ou l'ID numérique de l'étudiant
                          </Form.Text>
                        </Form.Group>
                        <div className="d-flex gap-2">
                          <Button 
                            type="submit" 
                            variant="success"
                            disabled={isLoading || !manualQrCode.trim()}
                          >
                            {isLoading ? (
                              <>
                                <Spinner size="sm" className="me-2" />
                                Traitement...
                              </>
                            ) : (
                              <>
                                ✅ Valider
                              </>
                            )}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline-secondary"
                            onClick={() => {
                              setManualQrCode('');
                              setShowManualInput(false);
                            }}
                            disabled={isLoading}
                          >
                            Annuler
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                </div>
              )}

              {/* Video preview */}
              <div className="scanner-container" style={{ position: 'relative', maxWidth: '400px', margin: '0 auto' }}>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: 'auto',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    display: isScanning ? 'block' : 'none'
                  }}
                />
                {!isScanning && (
                  <div 
                    style={{
                      width: '100%',
                      height: '300px',
                      border: '2px dashed #dee2e6',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <div className="text-center text-muted">
                      <QrCodeScan size={48} />
                      <p className="mt-2 mb-0">Cliquez sur "Démarrer le Scanner"</p>
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

          {/* Statistics Panel */}
        <Col lg={6}>
          <Row className="mb-3">
            <Col>
              <Card className="border-info">
                <Card.Header className="bg-info text-white">
                  <h6 className="mb-0">📊 Statistiques du Jour</h6>
                </Card.Header>
                <Card.Body>
                  {entryExitStats ? (
                    <Row>
                      <Col xs={4} className="text-center">
                        <div className="d-flex flex-column">
                          <div className="text-success fs-4 fw-bold">{entryExitStats.global_stats.total_entries}</div>
                          <small className="text-muted">Entrées</small>
                        </div>
                      </Col>
                      <Col xs={4} className="text-center">
                        <div className="d-flex flex-column">
                          <div className="text-primary fs-4 fw-bold">{entryExitStats.global_stats.currently_present}</div>
                          <small className="text-muted">Présents</small>
                        </div>
                      </Col>
                      <Col xs={4} className="text-center">
                        <div className="d-flex flex-column">
                          <div className="text-danger fs-4 fw-bold">{entryExitStats.global_stats.total_exits}</div>
                          <small className="text-muted">Sorties</small>
                        </div>
                      </Col>
                    </Row>
                  ) : (
                    <div className="text-center text-muted">
                      <Spinner size="sm" className="me-2" />
                      Chargement des statistiques...
                    </div>
                  )}
                </Card.Body>
                <Card.Footer className="text-center">
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={handleMarkAllAbsent}
                    disabled={isMarkingAbsent || isLoading}
                  >
                    {isMarkingAbsent ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Marquage en cours...
                      </>
                    ) : (
                      <>
                        📋 Marquer les absents
                      </>
                    )}
                  </Button>
                  <div className="mt-2">
                    <small className="text-muted">
                      Marque comme absents tous les étudiants sans entrée aujourd'hui
                    </small>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          </Row>
          
          {/* Today's Attendance List */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <Calendar className="me-2" />
                Présences d'Aujourd'hui
                <Badge bg="primary" className="ms-2">
                  {todayAttendances.length}
                </Badge>
              </h5>
            </Card.Header>
            <Card.Body>
              {isLoading ? (
                <div className="text-center py-4">
                  <Spinner />
                  <p className="mt-2 text-muted">Chargement...</p>
                </div>
              ) : todayAttendances.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <Table striped hover size="sm">
                    <thead>
                      <tr>
                        <th>Étudiant</th>
                        <th>Classe</th>
                        <th>Type</th>
                        <th>Heure</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayAttendances.map((attendance, index) => (
                        <tr key={index}>
                          <td>{attendance.student?.full_name || 'N/A'}</td>
                          <td>{attendance.school_class?.name || 'N/A'}</td>
                          <td>
                            {attendance.is_present ? (
                              <Badge bg={attendance.event_type === 'entry' ? 'success' : 'info'}>
                                {attendance.event_type === 'entry' ? (
                                  <>
                                    <ArrowRightCircle size={12} className="me-1" />
                                    Entrée
                                  </>
                                ) : (
                                  <>
                                    <ArrowLeftCircle size={12} className="me-1" />
                                    Sortie
                                  </>
                                )}
                              </Badge>
                            ) : (
                              <Badge bg="danger">
                                ❌ Absent
                              </Badge>
                            )}
                          </td>
                          <td>
                            <Clock size={14} className="me-1" />
                            {formatTime(attendance.scanned_at)}
                          </td>
                          <td>
                            <Badge bg={attendance.is_present ? 'success' : 'danger'}>
                              {attendance.is_present ? (
                                <>
                                  <CheckCircleFill size={12} className="me-1" />
                                  Présent
                                </>
                              ) : (
                                <>
                                  <XCircleFill size={12} className="me-1" />
                                  Absent
                                </>
                              )}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <Calendar size={48} />
                  <p className="mt-2 mb-0">Aucune présence enregistrée aujourd'hui</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Instructions */}
      <Row>
        <Col>
          <Card className="border-info">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">Instructions d'utilisation - Entrées/Sorties</h6>
            </Card.Header>
            <Card.Body>
              <ol className="mb-3">
                <li><strong>🤖 Mode Automatique (Recommandé) :</strong> Le système détecte automatiquement si l'étudiant doit entrer ou sortir</li>
                <li><strong>🎯 Mode Manuel :</strong> Choisissez "Entrée" ou "Sortie" selon le besoin</li>
                <li><strong>📷 Scanner Caméra :</strong> Cliquez sur "Démarrer le Scanner" et dirigez vers le code QR</li>
                <li><strong>📝 Saisie Manuelle :</strong> Si la caméra ne fonctionne pas, utilisez "Saisie manuelle"</li>
                <li><strong>📋 Gestion des Absences :</strong> Utilisez "Marquer les absents" pour marquer automatiquement tous les étudiants sans entrée</li>
                <li>Le système vérifie automatiquement les conditions (pas de double entrée/sortie)</li>
                <li>Les parents reçoivent une notification WhatsApp automatique</li>
                <li>Consultez les statistiques et la liste des mouvements du jour</li>
              </ol>
              
              <div className="alert alert-info mb-3">
                <strong>💡 Astuce :</strong> En cas de problème de caméra, vous pouvez toujours utiliser la saisie manuelle en saisissant directement l'ID de l'étudiant (ex: 123) ou le code QR complet (ex: STUDENT_ID_123).
              </div>
              
              <div className="alert alert-warning mb-0">
                <strong>📋 Absences :</strong> Les <strong>sorties</strong> ne sont pas des absences ! Elles indiquent simplement que l'étudiant est parti. Utilisez le bouton "Marquer les absents" pour les étudiants qui ne sont jamais venus à l'école.
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AttendanceScanner;