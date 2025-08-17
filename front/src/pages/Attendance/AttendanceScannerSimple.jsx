import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  Calendar,
  CheckCircleFill,
  Clock,
  PersonFill,
  Printer,
  QrCodeScan,
  XCircleFill,
} from "react-bootstrap-icons";
import { useAuth } from "../../hooks/useAuth";
import { host } from "../../utils/fetch";

const AttendanceScannerSimple = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [todayAttendances, setTodayAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [manualStudentId, setManualStudentId] = useState("");

  const { user, token } = useAuth();

  useEffect(() => {
    loadTodayAttendances();
  }, []);

  const loadTodayAttendances = async () => {
    try {
      setIsLoading(true);

      // Données de démonstration pour les présences du jour
      const mockAttendances = [
        {
          id: 1,
          student: { full_name: "Jean Dupont" },
          school_class: { name: "CP" },
          scanned_at: "08:15:00",
          is_present: true,
        },
        {
          id: 2,
          student: { full_name: "Marie Martin" },
          school_class: { name: "CP" },
          scanned_at: "08:20:00",
          is_present: true,
        },
      ];

      // Tentative d'appel API réel
      if (user && token) {
        try {
          const response = await fetch(
            `${host}/api/supervisors/daily-attendance?supervisor_id=${user.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setTodayAttendances(data.data.attendances || []);
              return;
            }
          }
        } catch (error) {
          console.log("API non disponible, utilisation des données de test");
        }
      }

      // Fallback vers les données mock
      setTodayAttendances(mockAttendances);
    } catch (error) {
      console.error("Erreur lors du chargement des présences:", error);
      setTodayAttendances([]);
    } finally {
      setIsLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      setScannerError("");
      setIsScanning(true);
      setMessage(
        "Scanner QR activé. En mode démo, utilisez le champ de saisie manuelle ci-dessous."
      );
      setMessageType("info");
    } catch (error) {
      console.error("Erreur lors du démarrage du scanner:", error);
      setScannerError(
        "Impossible d'accéder à la caméra. Utilisez la saisie manuelle."
      );
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    setIsScanning(false);
    setMessage("");
  };

  const handleManualScan = () => {
    if (!manualStudentId.trim()) {
      setMessage("❌ Veuillez entrer un ID d'élève");
      setMessageType("danger");
      return;
    }

    handleScanResult(manualStudentId.trim());
    setManualStudentId("");
  };

  const handleScanResult = async (qrCode) => {
    try {
      setIsLoading(true);

      // Simulation des noms d'élèves basée sur l'ID
      const studentNames = {
        1: "Jean Dupont",
        2: "Marie Martin",
        3: "Pierre Durand",
        4: "Sophie Lefebvre",
        5: "Thomas Moreau",
        123: "Alice Bernard",
        456: "Lucas Petit",
      };

      const studentId = qrCode.replace("STUDENT_ID_", "");
      const studentName = studentNames[studentId] || `Élève ${studentId}`;

      // Vérifier si déjà présent
      const alreadyPresent = todayAttendances.some(
        (att) => att.student.full_name === studentName
      );

      if (alreadyPresent) {
        setMessage(
          `❌ ${studentName} est déjà marqué(e) présent(e) aujourd'hui`
        );
        setMessageType("danger");
      } else {
        // Ajouter à la liste des présents
        const newAttendance = {
          id: todayAttendances.length + 1,
          student: { full_name: studentName },
          school_class: { name: "CP" },
          scanned_at: new Date().toTimeString().split(" ")[0],
          is_present: true,
        };

        setTodayAttendances((prev) => [...prev, newAttendance]);
        setMessage(
          `✅ ${studentName} marqué(e) présent(e) à ${newAttendance.scanned_at.substring(
            0,
            5
          )}`
        );
        setMessageType("success");

        // Tentative d'enregistrement réel via API
        if (user && token) {
          try {
            const response = await fetch(`${host}/api/supervisors/scan-qr`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                student_qr_code: qrCode,
                supervisor_id: user.id,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                console.log("Présence enregistrée dans la base de données");
              }
            }
          } catch (error) {
            console.log("Enregistrement local seulement (API non disponible)");
          }
        }
      }
    } catch (error) {
      setMessage("❌ Erreur lors de l'enregistrement de la présence");
      setMessageType("danger");
      console.error("Erreur scan:", error);
    } finally {
      setIsLoading(false);

      // Auto-clear message after 5 seconds
      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 5000);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    return timeString.substring(0, 5); // HH:MM format
  };

  const printDailyList = () => {
    const printWindow = window.open("", "_blank");
    const today = new Date().toLocaleDateString("fr-FR");

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Liste de Présences - ${today}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .present { color: #28a745; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>COLLEGE POLYVALENT BILINGUE DE DOUALA</h1>
            <h2>Liste de Présences du Jour</h2>
            <p><strong>Date:</strong> ${today}</p>
            <p><strong>Surveillant:</strong> ${user?.name || "N/A"}</p>
            <p><strong>Total présents:</strong> ${todayAttendances.length}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Élève</th>
                <th>Classe</th>
                <th>Heure d'arrivée</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${todayAttendances
                .map(
                  (attendance, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${
                    attendance.student?.full_name || "N/A"
                  }</strong></td>
                  <td>${attendance.school_class?.name || "N/A"}</td>
                  <td>${formatTime(attendance.scanned_at)}</td>
                  <td class="present">✓ Présent</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="footer">
            <p>Document généré automatiquement - ${new Date().toLocaleString(
              "fr-FR"
            )}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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

      {/* Scanner Section */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <QrCodeScan className="me-2" />
                Scanner QR (Mode Démo)
              </h5>
            </Card.Header>
            <Card.Body>
              {scannerError && (
                <Alert variant="warning" className="mb-3">
                  {scannerError}
                </Alert>
              )}

              {message && (
                <Alert variant={messageType} className="mb-3">
                  {message}
                </Alert>
              )}

              <div className="text-center mb-3">
                {!isScanning ? (
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
                ) : (
                  <Button variant="danger" size="lg" onClick={stopScanner}>
                    <XCircleFill className="me-2" />
                    Arrêter le Scanner
                  </Button>
                )}
              </div>

              {/* Manual Input for Demo */}
              <Card className="mt-3 border-info">
                <Card.Header className="bg-info text-white">
                  <h6 className="mb-0">Saisie Manuelle (Mode Démo)</h6>
                </Card.Header>
                <Card.Body>
                  <Form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleManualScan();
                    }}
                  >
                    <Form.Group className="mb-3">
                      <Form.Label>ID Élève ou Code QR</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ex: 1, 2, 3, 123, 456 ou STUDENT_ID_123"
                        value={manualStudentId}
                        onChange={(e) => setManualStudentId(e.target.value)}
                      />
                      <Form.Text className="text-muted">
                        IDs de test disponibles : 1, 2, 3, 4, 5, 123, 456
                      </Form.Text>
                    </Form.Group>
                    <Button
                      type="submit"
                      variant="success"
                      disabled={isLoading}
                    >
                      <PersonFill className="me-2" />
                      Marquer Présent
                    </Button>
                  </Form>
                </Card.Body>
              </Card>

              {/* Demo QR Display */}
              <div
                style={{
                  width: "100%",
                  height: "200px",
                  border: "2px dashed #dee2e6",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f8f9fa",
                  marginTop: "15px",
                }}
              >
                <div className="text-center text-muted">
                  <QrCodeScan size={48} />
                  <p className="mt-2 mb-0">Zone de Scanner QR</p>
                  <small>En mode démo - utilisez la saisie manuelle</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Today's Attendance List */}
        <Col lg={6}>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <Calendar className="me-2" />
                  Présences d'Aujourd'hui
                  <Badge bg="primary" className="ms-2">
                    {todayAttendances.length}
                  </Badge>
                </h5>
                {todayAttendances.length > 0 && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={printDailyList}
                  >
                    <Printer className="me-1" size={14} />
                    Imprimer
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {isLoading ? (
                <div className="text-center py-4">
                  <Spinner />
                  <p className="mt-2 text-muted">Chargement...</p>
                </div>
              ) : todayAttendances.length > 0 ? (
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <Table striped hover size="sm">
                    <thead>
                      <tr>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Heure</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayAttendances.map((attendance, index) => (
                        <tr key={index}>
                          <td>{attendance.student?.full_name || "N/A"}</td>
                          <td>{attendance.school_class?.name || "N/A"}</td>
                          <td>
                            <Clock size={14} className="me-1" />
                            {formatTime(attendance.scanned_at)}
                          </td>
                          <td>
                            <Badge
                              bg={attendance.is_present ? "success" : "danger"}
                            >
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
                  <p className="mt-2 mb-0">
                    Aucune présence enregistrée aujourd'hui
                  </p>
                  <small>Utilisez le scanner ou la saisie manuelle</small>
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
              <h6 className="mb-0">Instructions d'utilisation (Mode Démo)</h6>
            </Card.Header>
            <Card.Body>
              <ol className="mb-0">
                <li>
                  Cliquez sur "Démarrer le Scanner" pour activer le mode scan
                </li>
                <li>
                  Utilisez la saisie manuelle pour tester avec les IDs : 1, 2,
                  3, 4, 5, 123, 456
                </li>
                <li>Le système vérifie automatiquement les doublons</li>
                <li>
                  Les présences sont affichées en temps réel dans le panneau de
                  droite
                </li>
                <li>
                  En production, le scanner QR fonctionnera avec les badges
                  physiques
                </li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AttendanceScannerSimple;
