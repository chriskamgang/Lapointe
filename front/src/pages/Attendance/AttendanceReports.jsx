import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  ArrowLeftCircle,
  ArrowRightCircle,
  Calendar,
  CalendarRange,
  CheckCircleFill,
  Clock,
  FileEarmarkText,
  Filter,
  People,
  PersonXFill,
  Printer,
  Search,
  XCircleFill,
} from "react-bootstrap-icons";
import { useAuth } from "../../hooks/useAuth";
import { host } from "../../utils/fetch";

const AttendanceReports = () => {
  const [attendances, setAttendances] = useState([]);
  const [filteredAttendances, setFilteredAttendances] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAbsent, setIsMarkingAbsent] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    classId: "",
    status: "all", // all, present, absent
    eventType: "all", // all, entry, exit
    searchTerm: "",
  });

  const [summary, setSummary] = useState({
    totalRecords: 0,
    entryCount: 0,
    exitCount: 0,
    presentCount: 0,
    absentCount: 0,
    presentPercentage: 0,
  });

  const { user, token } = useAuth();

  useEffect(() => {
    console.log("🚀 AttendanceReports monté");
    console.log("👤 User:", user);
    console.log("🔑 Token présent:", !!token);
    console.log("📊 User role:", user?.role);

    if (!user || !token) {
      setMessage("Utilisateur non connecté ou token manquant");
      setMessageType("danger");
      return;
    }

    if (user.role !== "surveillant_general" && user.role !== "admin") {
      setMessage("Accès refusé: rôle insuffisant");
      setMessageType("danger");
      return;
    }

    loadSupervisorClasses();
  }, [user, token]);

  useEffect(() => {
    console.log("🔄 Effect loadAttendances déclenché");
    console.log("📅 Dates:", filters.startDate, "à", filters.endDate);
    console.log("🏫 Classe ID:", filters.classId);

    if (filters.startDate && filters.endDate && user && token) {
      console.log("▶️ Déclenchement loadAttendances");
      loadAttendances();
    } else {
      console.log("⏸️ Conditions non remplies:", {
        startDate: !!filters.startDate,
        endDate: !!filters.endDate,
        user: !!user,
        token: !!token,
      });
    }
  }, [filters.startDate, filters.endDate, filters.classId, user, token]);

  useEffect(() => {
    filterAndSummarizeAttendances();
  }, [attendances, filters.status, filters.eventType, filters.searchTerm]);

  const loadSupervisorClasses = async () => {
    try {
      console.log("🔍 Chargement des classes pour superviseur:", user.id);
      console.log("🔑 Token:", token ? "présent" : "absent");

      // Le token est déjà disponible depuis useAuth
      const response = await fetch(
        `${host}/api/supervisors/${user.id}/assignments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 Response status:", response.status);
      const data = await response.json();
      console.log("📊 Response data:", data);

      if (data.success) {
        console.log("✅ Classes trouvées:", data.data?.length || 0);
        setClasses(data.data || []);
        setMessage(
          `${data.data?.length || 0} classe(s) assignée(s) trouvée(s)`
        );
        setMessageType("success");
      } else {
        console.log("❌ Échec chargement classes:", data.message);
        setMessage(data.message || "Erreur lors du chargement des classes");
        setMessageType("warning");
      }
    } catch (error) {
      console.error("🚨 Erreur lors du chargement des classes:", error);
      setMessage("Erreur réseau lors du chargement des classes");
      setMessageType("danger");
    }
  };

  const loadAttendances = async () => {
    if (!filters.startDate || !filters.endDate) {
      console.log("⚠️ Dates manquantes:", filters.startDate, filters.endDate);
      return;
    }

    try {
      setIsLoading(true);
      console.log(
        "📅 Chargement attendance:",
        filters.startDate,
        "à",
        filters.endDate
      );

      // Le token est déjà disponible depuis useAuth
      const params = new URLSearchParams({
        supervisor_id: user.id,
        start_date: filters.startDate,
        end_date: filters.endDate,
      });

      if (filters.classId) {
        params.append("class_id", filters.classId);
        console.log("🏫 Filtre classe:", filters.classId);
      }

      const url = `${host}/api/supervisors/attendance-range?${params}`;
      console.log("🌐 URL requête:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Attendance response status:", response.status);
      const data = await response.json();
      console.log("📊 Attendance data:", data);

      if (data.success) {
        const attendanceCount = data.data?.attendances?.length || 0;
        console.log("✅ Attendances trouvées:", attendanceCount);
        setAttendances(data.data.attendances || []);
        if (attendanceCount === 0) {
          setMessage("Aucune donnée de présence trouvée pour cette période");
          setMessageType("info");
        } else {
          setMessage(
            `${attendanceCount} enregistrement(s) de présence trouvé(s)`
          );
          setMessageType("success");
        }
      } else {
        console.log("❌ Échec chargement attendance:", data.message);
        setMessage(data.message || "Erreur lors du chargement");
        setMessageType("danger");
      }
    } catch (error) {
      console.error("🚨 Erreur attendance:", error);
      setMessage("Erreur lors du chargement des présences");
      setMessageType("danger");
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSummarizeAttendances = () => {
    let filtered = [...attendances];

    // Filter by status
    if (filters.status === "present") {
      filtered = filtered.filter((att) => att.is_present);
    } else if (filters.status === "absent") {
      filtered = filtered.filter((att) => !att.is_present);
    }

    // Filter by event type
    if (filters.eventType === "entry") {
      filtered = filtered.filter((att) => att.event_type === "entry");
    } else if (filters.eventType === "exit") {
      filtered = filtered.filter((att) => att.event_type === "exit");
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (att) =>
          att.student?.full_name?.toLowerCase().includes(searchLower) ||
          att.school_class?.name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAttendances(filtered);

    // Calculate summary
    const totalRecords = attendances.length;
    const entryCount = attendances.filter(
      (att) => att.event_type === "entry"
    ).length;
    const exitCount = attendances.filter(
      (att) => att.event_type === "exit"
    ).length;
    const presentCount = attendances.filter((att) => att.is_present).length;
    const absentCount = totalRecords - presentCount;
    const presentPercentage =
      totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;

    setSummary({
      totalRecords,
      entryCount,
      exitCount,
      presentCount,
      absentCount,
      presentPercentage,
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      classId: "",
      status: "all",
      eventType: "all",
      searchTerm: "",
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportToPDF = () => {
    // TODO: Implement PDF export
    setMessage("Fonction d'export PDF en cours de développement");
    setMessageType("info");
  };

  const markAbsentStudents = async () => {
    if (!filters.classId) {
      setMessage("Veuillez sélectionner une classe pour marquer les absents");
      setMessageType("warning");
      return;
    }

    const confirmAction = window.confirm(
      `Êtes-vous sûr de vouloir marquer tous les élèves non présents comme absents pour le ${new Date(
        filters.startDate
      ).toLocaleDateString("fr-FR")} ?`
    );

    if (!confirmAction) return;

    try {
      setIsMarkingAbsent(true);
      console.log(
        "🔄 Marquage des absents pour classe:",
        filters.classId,
        "date:",
        filters.startDate
      );

      const response = await fetch(
        `${host}/api/supervisors/mark-absent-students`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supervisor_id: user.id,
            school_class_id: filters.classId,
            attendance_date: filters.startDate,
          }),
        }
      );

      const data = await response.json();
      console.log("📊 Résultat marquage absents:", data);

      if (data.success) {
        setMessage(data.message);
        setMessageType("success");

        // Recharger les données d'attendance
        loadAttendances();

        // Afficher les statistiques
        if (data.data) {
          setTimeout(() => {
            setMessage(
              `✅ ${data.message}\n` +
                `📊 Total étudiants: ${data.data.total_students}\n` +
                `✅ Présents: ${data.data.present_students}\n` +
                `❌ Absents marqués: ${data.data.absent_students_marked}`
            );
          }, 1000);
        }
      } else {
        setMessage(data.message || "Erreur lors du marquage des absents");
        setMessageType("danger");
      }
    } catch (error) {
      console.error("🚨 Erreur marquage absents:", error);
      setMessage("Erreur réseau lors du marquage des absents");
      setMessageType("danger");
    } finally {
      setIsMarkingAbsent(false);
    }
  };

  const printReport = () => {
    // Create a new window with printable content
    const printWindow = window.open("", "_blank");
    const printContent = generatePrintableReport();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport de Présences - ${filters.startDate} au ${filters.endDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .summary { margin-bottom: 20px; display: flex; justify-content: space-around; }
            .summary-item { text-align: center; }
            .summary-number { font-size: 24px; font-weight: bold; color: #007bff; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .present { color: #28a745; font-weight: bold; }
            .absent { color: #dc3545; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const generatePrintableReport = () => {
    const now = new Date();
    return `
      <div class="header">
        <h1>INSTITUT UNIVERSITAIRE DE LA POINTE</h1>
        <h2>Rapport de Présences</h2>
        <p><strong>Période:</strong> ${formatDate(
          filters.startDate
        )} - ${formatDate(filters.endDate)}</p>
        <p><strong>Surveillant:</strong> ${user?.name || "N/A"}</p>
        <p><strong>Généré le:</strong> ${now.toLocaleDateString(
          "fr-FR"
        )} à ${now.toLocaleTimeString("fr-FR")}</p>
      </div>

      <div class="summary">
        <div class="summary-item">
          <div class="summary-number">${summary.totalStudents}</div>
          <div>Total Enregistrements</div>
        </div>
        <div class="summary-item">
          <div class="summary-number" style="color: #28a745">${
            summary.presentCount
          }</div>
          <div>Présents</div>
        </div>
        <div class="summary-item">
          <div class="summary-number" style="color: #dc3545">${
            summary.absentCount
          }</div>
          <div>Absents</div>
        </div>
        <div class="summary-item">
          <div class="summary-number" style="color: #17a2b8">${
            summary.presentPercentage
          }%</div>
          <div>Taux de Présence</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Élève</th>
            <th>Classe</th>
            <th>Heure</th>
            <th>Statut</th>
            <th>Surveillant</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAttendances
            .map(
              (attendance) => `
            <tr>
              <td>${formatDate(attendance.attendance_date)}</td>
              <td><strong>${
                attendance.student?.full_name || "N/A"
              }</strong></td>
              <td>${attendance.school_class?.name || "N/A"}</td>
              <td>${formatTime(attendance.scanned_at)}</td>
              <td class="${attendance.is_present ? "present" : "absent"}">
                ${attendance.is_present ? "✓ Présent" : "✗ Absent"}
              </td>
              <td>${attendance.supervisor?.name || user?.name || "N/A"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <div class="footer">
        <p>Document généré automatiquement par le système de gestion scolaire</p>
        <p>Total: ${filteredAttendances.length} enregistrement(s)</p>
      </div>
    `;
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">
            <FileEarmarkText className="me-2" />
            Rapports de Présences
          </h2>
        </Col>
      </Row>

      {/* État de connexion */}
      <Row className="mb-3">
        <Col>
          {!user || !token ? (
            <Alert variant="danger">
              <strong>⚠️ Problème d'authentification</strong>
              <br />
              Veuillez vous reconnecter avec un compte surveillant général.
            </Alert>
          ) : user.role !== "surveillant_general" && user.role !== "admin" ? (
            <Alert variant="warning">
              <strong>🚫 Accès refusé</strong>
              <br />
              Cette page est réservée aux surveillants généraux et
              administrateurs.
            </Alert>
          ) : (
            <Alert variant="info">
              <strong>👤 Connecté en tant que:</strong> {user.name} ({user.role}
              )<br />
              <strong>📊 Classes assignées:</strong> {classes.length} classe(s)
            </Alert>
          )}
        </Col>
      </Row>

      {/* Messages de l'application */}
      {message && (
        <Row className="mb-3">
          <Col>
            <Alert
              variant={messageType}
              onClose={() => setMessage("")}
              dismissible
            >
              {message}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Filters School */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <Filter className="me-2" />
                Filtres de Recherche
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date de début</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.startDate}
                      onChange={(e) =>
                        handleFilterChange("startDate", e.target.value)
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date de fin</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.endDate}
                      onChange={(e) =>
                        handleFilterChange("endDate", e.target.value)
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Classe</Form.Label>
                    <Form.Select
                      value={filters.classId}
                      onChange={(e) =>
                        handleFilterChange("classId", e.target.value)
                      }
                    >
                      <option value="">Toutes les classes</option>
                      {classes.map((assignment) => (
                        <option
                          key={assignment.id}
                          value={assignment.school_class_id}
                        >
                          {assignment.school_class?.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Statut</Form.Label>
                    <Form.Select
                      value={filters.status}
                      onChange={(e) =>
                        handleFilterChange("status", e.target.value)
                      }
                    >
                      <option value="all">Tous</option>
                      <option value="present">Présents seulement</option>
                      <option value="absent">Absents seulement</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Type d'événement</Form.Label>
                    <Form.Select
                      value={filters.eventType}
                      onChange={(e) =>
                        handleFilterChange("eventType", e.target.value)
                      }
                    >
                      <option value="all">Tous les événements</option>
                      <option value="entry">Entrées seulement</option>
                      <option value="exit">Sorties seulement</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={5}>
                  <Form.Group className="mb-3">
                    <Form.Label>Rechercher un élève</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <Search />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Nom de l'élève..."
                        value={filters.searchTerm}
                        onChange={(e) =>
                          handleFilterChange("searchTerm", e.target.value)
                        }
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button
                    variant="outline-secondary"
                    onClick={resetFilters}
                    className="mb-3"
                  >
                    Réinitialiser
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Summary School */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="text-center border-primary">
            <Card.Body>
              <People size={28} className="text-primary mb-2" />
              <h5 className="mb-0">{summary.totalRecords}</h5>
              <small className="text-muted">Total</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-success">
            <Card.Body>
              <ArrowRightCircle size={28} className="text-success mb-2" />
              <h5 className="mb-0">{summary.entryCount}</h5>
              <small className="text-muted">Entrées</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-danger">
            <Card.Body>
              <ArrowLeftCircle size={28} className="text-danger mb-2" />
              <h5 className="mb-0">{summary.exitCount}</h5>
              <small className="text-muted">Sorties</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-success">
            <Card.Body>
              <CheckCircleFill size={28} className="text-success mb-2" />
              <h5 className="mb-0">{summary.presentCount}</h5>
              <small className="text-muted">Présents</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-warning">
            <Card.Body>
              <XCircleFill size={28} className="text-warning mb-2" />
              <h5 className="mb-0">{summary.absentCount}</h5>
              <small className="text-muted">Absents</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-info">
            <Card.Body>
              <CalendarRange size={28} className="text-info mb-2" />
              <h5 className="mb-0">{summary.presentPercentage}%</h5>
              <small className="text-muted">Taux</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Actions */}
      <Row className="mb-3">
        <Col className="d-flex justify-content-between align-items-center">
          {/* Bouton marquer absents */}
          <div>
            {filters.classId && (
              <Button
                variant="warning"
                onClick={markAbsentStudents}
                disabled={isMarkingAbsent || !filters.classId}
              >
                {isMarkingAbsent ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Marquage en cours...
                  </>
                ) : (
                  <>
                    <PersonXFill className="me-2" />
                    Marquer Absents du Jour
                  </>
                )}
              </Button>
            )}
            {!filters.classId && (
              <small className="text-muted">
                <PersonXFill className="me-1" />
                Sélectionnez une classe pour marquer les absents
              </small>
            )}
          </div>

          {/* Boutons d'export */}
          <ButtonGroup>
            <Button variant="outline-primary" onClick={printReport}>
              <Printer className="me-2" />
              Imprimer
            </Button>
            {/* <Button variant="outline-success" onClick={exportToPDF}>
              <Download className="me-2" />
              Exporter PDF
            </Button> */}
          </ButtonGroup>
        </Col>
      </Row>

      {/* Results Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <Calendar className="me-2" />
                Résultats
                <Badge bg="secondary" className="ms-2">
                  {filteredAttendances.length}
                </Badge>
              </h5>
            </Card.Header>
            <Card.Body>
              {isLoading ? (
                <div className="text-center py-4">
                  <Spinner />
                  <p className="mt-2 text-muted">Chargement en cours...</p>
                </div>
              ) : filteredAttendances.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Type</th>
                        <th>Heure</th>
                        <th>Statut</th>
                        <th>Surveillant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendances.map((attendance, index) => (
                        <tr key={index}>
                          <td>{formatDate(attendance.attendance_date)}</td>
                          <td>
                            <strong>
                              {attendance.student?.full_name || "N/A"}
                            </strong>
                          </td>
                          <td>
                            <Badge bg="light" text="dark">
                              {attendance.school_class?.name || "N/A"}
                            </Badge>
                          </td>
                          <td>
                            <Badge
                              bg={
                                attendance.event_type === "entry"
                                  ? "success"
                                  : "danger"
                              }
                            >
                              {attendance.event_type === "entry" ? (
                                <>
                                  <ArrowRightCircle
                                    size={12}
                                    className="me-1"
                                  />
                                  Entrée
                                </>
                              ) : (
                                <>
                                  <ArrowLeftCircle size={12} className="me-1" />
                                  Sortie
                                </>
                              )}
                            </Badge>
                          </td>
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
                          <td>
                            <small className="text-muted">
                              {attendance.supervisor?.name || "N/A"}
                            </small>
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
                    {attendances.length === 0
                      ? "Aucune donnée de présence pour la période sélectionnée"
                      : "Aucun résultat ne correspond aux filtres appliqués"}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AttendanceReports;
