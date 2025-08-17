import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Nav,
  Pagination,
  Row,
  Spinner,
  Tab,
  Table,
} from "react-bootstrap";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  BarChart,
  Building,
  Calendar,
  CashCoin,
  Download,
  FileEarmarkText,
  FileText,
  Search,
} from "react-bootstrap-icons";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { useSchool } from "../contexts/SchoolContext";
import { secureApiEndpoints } from "../utils/apiMigration";

const Reports = () => {
  const { schoolSettings, formatCurrency } = useSchool();
  const [activeTab, setActiveTab] = useState("insolvable");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);
  const [reportCache, setReportCache] = useState(new Map());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // États pour les filtres
  const [filters, setFilters] = useState({
    // Filtre principal
    filterType: "section", // section, class, series

    // Filtres spécifiques
    sectionId: "",
    classId: "",
    seriesId: "",

    // Filtres par dates
    startDate: "",
    endDate: "",
  });

  const [availableOptions, setAvailableOptions] = useState({
    sections: [],
    classes: [],
    series: [],
  });

  useEffect(() => {
    loadAvailableOptions();
  }, []);

  const loadAvailableOptions = async () => {
    try {
      // Charger les sections, classes disponibles
      const [sectionsRes, classesRes] = await Promise.all([
        secureApiEndpoints.sections.getAll(),
        secureApiEndpoints.schoolClasses.getAll(),
      ]);

      // S'assurer que les données sont des tableaux
      const sections =
        sectionsRes.success && Array.isArray(sectionsRes.data)
          ? sectionsRes.data
          : [];
      const classes =
        classesRes.success && Array.isArray(classesRes.data)
          ? classesRes.data
          : [];

      // Charger toutes les séries de toutes les classes
      let allSeries = [];
      if (classes.length > 0) {
        try {
          const seriesPromises = classes.map((schoolClass) =>
            secureApiEndpoints.accountant.getClassSeries(schoolClass.id)
          );
          const seriesResults = await Promise.all(seriesPromises);

          seriesResults.forEach((result, index) => {
            if (result.success && result.data) {
              // S'assurer que result.data est un tableau
              const seriesData = Array.isArray(result.data) ? result.data : [];
              allSeries = [...allSeries, ...seriesData];
            }
          });
        } catch (seriesError) {
          console.error("Error loading series:", seriesError);
        }
      }

      setAvailableOptions({
        sections,
        classes,
        series: allSeries,
      });
    } catch (error) {
      console.error("Error loading options:", error);
    }
  };

  // Fonction pour générer une clé de cache unique
  const generateCacheKey = useCallback((reportType, filters) => {
    return `${reportType}_${JSON.stringify(filters)}`;
  }, []);

  // Fonction pour vérifier si les données sont en cache
  const getCachedReport = useCallback(
    (cacheKey) => {
      const cached = reportCache.get(cacheKey);
      if (cached) {
        // Vérifier si le cache a moins de 5 minutes
        const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000;
        if (!isExpired) {
          return cached.data;
        } else {
          // Supprimer le cache expiré
          setReportCache((prev) => {
            const newCache = new Map(prev);
            newCache.delete(cacheKey);
            return newCache;
          });
        }
      }
      return null;
    },
    [reportCache]
  );

  // Fonction pour mettre en cache un rapport
  const cacheReport = useCallback((cacheKey, data) => {
    setReportCache((prev) => {
      const newCache = new Map(prev);
      newCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      return newCache;
    });
  }, []);

  // Fonction pour trier les données
  const sortData = useCallback((data, key, direction) => {
    if (!data || !Array.isArray(data)) return data;

    return [...data].sort((a, b) => {
      let aVal = key.split(".").reduce((obj, k) => obj?.[k], a);
      let bVal = key.split(".").reduce((obj, k) => obj?.[k], b);

      // Gérer les valeurs nulles/undefined
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      // Conversion automatique pour les nombres
      if (typeof aVal === "string" && !isNaN(parseFloat(aVal))) {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (direction === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }, []);

  // Fonction pour gérer le clic sur un en-tête de colonne
  const handleSort = useCallback(
    (key) => {
      let direction = "asc";
      if (sortConfig.key === key && sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.key === key && sortConfig.direction === "desc") {
        direction = null;
      }

      setSortConfig({ key, direction });
    },
    [sortConfig]
  );

  // Fonction pour obtenir l'icône de tri
  const getSortIcon = useCallback(
    (columnKey) => {
      if (sortConfig.key !== columnKey) {
        return <ArrowDownUp className="ms-1 text-muted" size={12} />;
      }
      if (sortConfig.direction === "asc") {
        return <ArrowUp className="ms-1 text-primary" size={12} />;
      }
      if (sortConfig.direction === "desc") {
        return <ArrowDown className="ms-1 text-primary" size={12} />;
      }
      return <ArrowDownUp className="ms-1 text-muted" size={12} />;
    },
    [sortConfig]
  );

  // Composant d'en-tête triable
  const SortableHeader = useCallback(
    ({ children, sortKey, className = "" }) => (
      <th
        className={`sortable-header ${className}`}
        onClick={() => handleSort(sortKey)}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        {children}
        {getSortIcon(sortKey)}
      </th>
    ),
    [handleSort, getSortIcon]
  );

  // Hook pour obtenir les données triées
  const sortedReportData = useMemo(() => {
    if (!reportData || !sortConfig.key || !sortConfig.direction) {
      return reportData;
    }

    const newData = { ...reportData };

    // Trier différents types de données selon le rapport
    if (newData.students && Array.isArray(newData.students)) {
      newData.students = sortData(
        newData.students,
        sortConfig.key,
        sortConfig.direction
      );
    }
    if (newData.classes && Array.isArray(newData.classes)) {
      newData.classes = sortData(
        newData.classes,
        sortConfig.key,
        sortConfig.direction
      );
    }
    if (newData.periods && Array.isArray(newData.periods)) {
      newData.periods = sortData(
        newData.periods,
        sortConfig.key,
        sortConfig.direction
      );
    }

    return newData;
  }, [reportData, sortConfig, sortData]);

  // Fonctions de pagination
  const paginateData = useCallback((data, page, perPage) => {
    if (!data || !Array.isArray(data)) return data;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return data.slice(startIndex, endIndex);
  }, []);

  // Hook pour obtenir les données paginées
  const paginatedReportData = useMemo(() => {
    if (!sortedReportData) return sortedReportData;

    const newData = { ...sortedReportData };

    // Paginer différents types de données selon le rapport
    if (newData.students && Array.isArray(newData.students)) {
      newData.students = paginateData(
        newData.students,
        currentPage,
        itemsPerPage
      );
      newData.totalStudents = sortedReportData.students.length;
    }
    if (newData.classes && Array.isArray(newData.classes)) {
      newData.classes = paginateData(
        newData.classes,
        currentPage,
        itemsPerPage
      );
      newData.totalClasses = sortedReportData.classes.length;
    }
    if (newData.periods && Array.isArray(newData.periods)) {
      newData.periods = paginateData(
        newData.periods,
        currentPage,
        itemsPerPage
      );
      newData.totalPeriods = sortedReportData.periods.length;
    }

    return newData;
  }, [sortedReportData, currentPage, itemsPerPage, paginateData]);

  // Fonction pour calculer le nombre total de pages
  const getTotalPages = useCallback(
    (dataArray) => {
      if (!dataArray || !Array.isArray(dataArray)) return 1;
      return Math.ceil(dataArray.length / itemsPerPage);
    },
    [itemsPerPage]
  );

  // Composant de pagination
  const PaginationControls = useCallback(
    ({ dataArray, dataType = "éléments" }) => {
      const totalPages = getTotalPages(dataArray);
      const totalItems = dataArray?.length || 0;

      if (totalPages <= 1) return null;

      const startItem = (currentPage - 1) * itemsPerPage + 1;
      const endItem = Math.min(currentPage * itemsPerPage, totalItems);

      return (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="d-flex align-items-center gap-3">
            <small className="text-muted">
              Affichage de {startItem} à {endItem} sur {totalItems} {dataType}
            </small>
            <Form.Select
              size="sm"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ width: "auto" }}
            >
              <option value={5}>5 par page</option>
              <option value={10}>10 par page</option>
              <option value={25}>25 par page</option>
              <option value={50}>50 par page</option>
              <option value={100}>100 par page</option>
            </Form.Select>
          </div>

          <Pagination size="sm" className="mb-0">
            <Pagination.First
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            />
            <Pagination.Prev
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            />

            {/* Pages numériques */}
            {[...Array(Math.min(5, totalPages))].map((_, index) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = index + 1;
              } else if (currentPage <= 3) {
                pageNumber = index + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + index;
              } else {
                pageNumber = currentPage - 2 + index;
              }

              return (
                <Pagination.Item
                  key={pageNumber}
                  active={pageNumber === currentPage}
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Pagination.Item>
              );
            })}

            <Pagination.Next
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
            />
            <Pagination.Last
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </div>
      );
    },
    [currentPage, itemsPerPage, getTotalPages]
  );

  // Reset pagination when changing tabs or filters
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filters]);

  // Fonctions d'export Excel
  const exportToExcel = useCallback((data, reportType) => {
    if (!data) {
      Swal.fire("Erreur", "Aucune donnée à exporter", "error");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const fileName = `rapport_${reportType}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    // Fonction pour nettoyer et convertir les données
    const cleanValue = (value) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return JSON.stringify(value);
      return value;
    };

    try {
      switch (reportType) {
        case "insolvable":
          if (data.students && Array.isArray(data.students)) {
            const studentsData = data.students.map((student) => ({
              Étudiant: cleanValue(student?.student?.full_name),
              "Classe/Série": cleanValue(student?.student?.class_series),
              "Total Requis": cleanValue(student?.total_required),
              "Total Payé": cleanValue(student?.total_paid),
              "Reste à Payer": cleanValue(student?.total_remaining),
              "Tranches Incomplètes":
                student?.incomplete_tranches
                  ?.map(
                    (t) =>
                      `${t?.tranche_name}: ${t?.paid_amount}/${t?.required_amount}`
                  )
                  .join(", ") || "",
            }));

            const worksheet = XLSX.utils.json_to_sheet(studentsData);
            XLSX.utils.book_append_sheet(
              workbook,
              worksheet,
              "Élèves Insolvables"
            );
          }
          break;

        case "payments":
          if (data.students && Array.isArray(data.students)) {
            const paymentsData = data.students.map((student) => ({
              Étudiant: cleanValue(student?.student?.full_name),
              "Classe/Série": cleanValue(student?.student?.class_series),
              "Total Requis": cleanValue(student?.total_required),
              "Total Payé": cleanValue(student?.total_paid),
              Statut: cleanValue(student?.status),
            }));

            const worksheet = XLSX.utils.json_to_sheet(paymentsData);
            XLSX.utils.book_append_sheet(workbook, worksheet, "Paiements");
          }
          break;

        case "rame":
          if (data.students && Array.isArray(data.students)) {
            const rameData = data.students.map((student) => ({
              Étudiant: cleanValue(student?.student?.full_name),
              "Classe/Série": cleanValue(student?.student?.class_series),
              "Statut RAME": cleanValue(student?.rame_status),
              "Date de Paiement": cleanValue(
                student?.rame_details?.payment_date
              ),
            }));

            const worksheet = XLSX.utils.json_to_sheet(rameData);
            XLSX.utils.book_append_sheet(workbook, worksheet, "État RAME");
          }
          break;

        case "scholarships_discounts":
          if (data.students && Array.isArray(data.students)) {
            const scholarshipsData = data.students.map((student) => ({
              Étudiant: cleanValue(student?.student?.full_name),
              "Classe/Série": cleanValue(student?.student?.class_series),
              "Type de Réduction": cleanValue(student?.discount_type),
              Montant: cleanValue(student?.discount_amount),
              Pourcentage: cleanValue(
                student?.discount_percentage
                  ? `${student.discount_percentage}%`
                  : ""
              ),
            }));

            const worksheet = XLSX.utils.json_to_sheet(scholarshipsData);
            XLSX.utils.book_append_sheet(
              workbook,
              worksheet,
              "Bourses et Rabais"
            );
          }
          break;

        case "collection_details":
          if (data.collections && Array.isArray(data.collections)) {
            const collectionsData = data.collections.map((collection) => ({
              Matricule: cleanValue(collection?.student?.matricule),
              Nom: cleanValue(collection?.student?.last_name),
              Prénom: cleanValue(collection?.student?.first_name),
              Classe: cleanValue(collection?.student?.class_name),
              "Date de Versement": cleanValue(collection?.payment_date),
              "Date de Validation": collection?.validated_at
                ? cleanValue(collection.validated_at)
                : "En attente",
              Montant: cleanValue(collection?.amount),
              "Nom du Comptable": cleanValue(collection?.validator_name),
              "N° Reçu": cleanValue(collection?.receipt_number),
              Rabais: collection?.has_reduction
                ? cleanValue(collection?.reduction_amount)
                : 0,
            }));

            const worksheet = XLSX.utils.json_to_sheet(collectionsData);
            XLSX.utils.book_append_sheet(
              workbook,
              worksheet,
              "Détail Encaissements"
            );

            // Ajouter une feuille de statistiques
            if (data.statistics) {
              const statsData = [];

              // Statistiques par méthode
              if (data.statistics.by_payment_method) {
                statsData.push(["STATISTIQUES PAR MÉTHODE DE PAIEMENT"]);
                statsData.push(["Méthode", "Nombre", "Montant"]);
                data.statistics.by_payment_method.forEach((method) => {
                  statsData.push([method.label, method.count, method.total]);
                });
                statsData.push([]);
              }

              // Statistiques par tranche
              if (data.statistics.by_payment_tranche) {
                statsData.push(["STATISTIQUES PAR TRANCHE"]);
                statsData.push(["Tranche", "Nombre", "Montant"]);
                data.statistics.by_payment_tranche.forEach((tranche) => {
                  statsData.push([
                    tranche.tranche_name,
                    tranche.count,
                    tranche.total,
                  ]);
                });
              }

              const statsWorksheet = XLSX.utils.aoa_to_sheet(statsData);
              XLSX.utils.book_append_sheet(
                workbook,
                statsWorksheet,
                "Statistiques"
              );
            }
          }
          break;

        default:
          throw new Error("Type de rapport non reconnu pour l'export Excel");
      }

      // Télécharger le fichier
      XLSX.writeFile(workbook, fileName);

      Swal.fire({
        title: "Export réussi !",
        text: `Le fichier ${fileName} a été téléchargé`,
        icon: "success",
        timer: 3000,
      });
    } catch (error) {
      console.error("Erreur lors de l'export Excel:", error);
      Swal.fire("Erreur", "Erreur lors de l'export Excel", "error");
    }
  }, []);

  const generateReport = async (reportType) => {
    const cacheKey = generateCacheKey(reportType, filters);

    // Vérifier le cache d'abord
    const cachedData = getCachedReport(cacheKey);
    if (cachedData) {
      setReportData(cachedData);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let response;

      switch (reportType) {
        case "insolvable":
          response = await secureApiEndpoints.reports.getInsolvableReport(
            filters
          );
          break;
        case "payments":
          response = await secureApiEndpoints.reports.getPaymentsReport(
            filters
          );
          break;
        case "rame":
          response = await secureApiEndpoints.reports.getRameReport(filters);
          break;
        case "scholarships_discounts":
          response =
            await secureApiEndpoints.reports.getScholarshipsDiscountsReport(
              filters
            );
          break;
        case "collection_details":
          response =
            await secureApiEndpoints.reports.getCollectionDetailsReport(
              filters
            );
          break;
        default:
          throw new Error("Type de rapport non reconnu");
      }

      if (response.success) {
        setReportData(response.data);
        // Mettre en cache les données
        cacheReport(cacheKey, response.data);
      } else {
        setError(response.message || "Erreur lors de la génération du rapport");
      }
    } catch (error) {
      setError("Erreur lors de la génération du rapport");
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format = "pdf") => {
    if (!reportData) {
      Swal.fire("Erreur", "Aucun rapport à exporter", "error");
      return;
    }

    try {
      Swal.fire({
        title: "Export en cours...",
        text: "Génération du fichier PDF",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        },
      });

      // Préparer les paramètres pour l'export
      const exportParams = {
        ...filters,
        report_type: activeTab,
      };

      // Appeler l'API d'export PDF
      const response = await secureApiEndpoints.reports.exportPdf(exportParams);

      if (response.success) {
        // Ouvrir le HTML dans une nouvelle fenêtre pour impression/sauvegarde PDF
        const printWindow = window.open("", "_blank");
        printWindow.document.write(response.data);
        printWindow.document.close();

        // Attendre un peu que le contenu se charge puis déclencher l'impression
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);

        Swal.fire(
          "Succès",
          "Rapport ouvert pour impression/sauvegarde PDF",
          "success"
        );
      } else {
        Swal.fire(
          "Erreur",
          response.message || "Erreur lors de l'export PDF",
          "error"
        );
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      Swal.fire("Erreur", "Erreur lors de l'export PDF", "error");
    }
  };

  const renderFilterSection = () => (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">
          <Search className="me-2" />
          Filtres
        </h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={3}>
            <Form.Group className="mb-3">
              <Form.Label>Filtrer par</Form.Label>
              <Form.Select
                value={filters.filterType}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    filterType: e.target.value,
                    sectionId: "",
                    classId: "",
                    seriesId: "",
                  });
                }}
              >
                <option value="section">Section</option>
                <option value="class">Classe</option>
                <option value="series">Série</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group className="mb-3">
              <Form.Label>
                {filters.filterType === "section"
                  ? "Section"
                  : filters.filterType === "class"
                  ? "Classe"
                  : "Série"}
              </Form.Label>
              <Form.Select
                value={
                  filters.filterType === "section"
                    ? filters.sectionId
                    : filters.filterType === "class"
                    ? filters.classId
                    : filters.seriesId
                }
                onChange={(e) => {
                  const newFilters = { ...filters };
                  if (filters.filterType === "section") {
                    newFilters.sectionId = e.target.value;
                  } else if (filters.filterType === "class") {
                    newFilters.classId = e.target.value;
                  } else {
                    newFilters.seriesId = e.target.value;
                  }
                  setFilters(newFilters);
                }}
              >
                <option value="">
                  {filters.filterType === "section"
                    ? "Toutes les sections"
                    : filters.filterType === "class"
                    ? "Toutes les classes"
                    : "Toutes les séries"}
                </option>
                {filters.filterType === "section" &&
                  availableOptions.sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                {filters.filterType === "class" &&
                  availableOptions.classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}
                    </option>
                  ))}
                {filters.filterType === "series" &&
                  availableOptions.series.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.name}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group className="mb-3">
              <Form.Label>Date de début</Form.Label>
              <Form.Control
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    startDate: e.target.value,
                  });
                }}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group className="mb-3">
              <Form.Label>Date de fin</Form.Label>
              <Form.Control
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    endDate: e.target.value,
                  });
                }}
              />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col className="d-flex gap-2">
            <Button
              variant="primary"
              onClick={() => generateReport(activeTab)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Génération...
                </>
              ) : (
                <>
                  <FileEarmarkText className="me-2" />
                  Générer le rapport
                </>
              )}
            </Button>
            {reportData && (
              <>
                <Button
                  variant="outline-success"
                  onClick={() => exportReport("pdf")}
                >
                  <Download className="me-2" />
                  Exporter PDF
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => exportToExcel(sortedReportData, activeTab)}
                >
                  <FileText className="me-2" />
                  Exporter Excel
                </Button>
              </>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  const renderInsolvableReport = () => (
    <Card>
      <Card.Header>
        <h5 className="mb-0">
          État Insolvable - Élèves n'ayant pas fini de payer
        </h5>
      </Card.Header>
      <Card.Body>
        {paginatedReportData ? (
          <>
            <div className="mb-3">
              <Badge bg="info">
                Total des élèves insolvables:{" "}
                {paginatedReportData?.total_insolvable_students || 0}
              </Badge>
            </div>
            <Table responsive striped size="sm">
              <thead>
                <tr>
                  <SortableHeader sortKey="student.full_name">
                    Étudiant
                  </SortableHeader>
                  <SortableHeader sortKey="student.class_series">
                    Classe/Série
                  </SortableHeader>
                  <SortableHeader sortKey="total_required">
                    Total Requis
                  </SortableHeader>
                  <SortableHeader sortKey="total_paid">
                    Total Payé
                  </SortableHeader>
                  <SortableHeader sortKey="total_remaining">
                    Reste à Payer
                  </SortableHeader>
                  <th>Tranches Incomplètes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReportData.students?.map(
                  (studentData, studentIndex) => (
                    <tr key={studentIndex}>
                      <td>{studentData?.student?.full_name}</td>
                      <td>{studentData?.student?.class_series}</td>
                      <td>
                        {formatCurrency(studentData?.total_required || 0)}
                      </td>
                      <td>{formatCurrency(studentData?.total_paid || 0)}</td>
                      <td className="text-danger">
                        {formatCurrency(studentData?.total_remaining || 0)}
                      </td>
                      <td>
                        {studentData.incomplete_tranches?.map(
                          (tranche, trancheIndex) => (
                            <div key={trancheIndex}>
                              <small className="text-muted">
                                <strong>{tranche?.tranche_name}:</strong>{" "}
                                {formatCurrency(tranche?.paid_amount || 0)}/
                                {formatCurrency(tranche?.required_amount || 0)}
                                <span className="text-danger">
                                  {" "}
                                  (reste:{" "}
                                  {formatCurrency(
                                    tranche?.remaining_amount || 0
                                  )}
                                  )
                                </span>
                              </small>
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </Table>
            <PaginationControls
              dataArray={sortedReportData?.students}
              dataType="élèves insolvables"
            />
          </>
        ) : (
          <p className="text-muted text-center">
            Générez un rapport pour voir les données
          </p>
        )}
      </Card.Body>
    </Card>
  );

  const renderPaymentsReport = () => (
    <Card>
      <Card.Header>
        <h5 className="mb-0">
          État des Paiements - Tous les élèves avec infos toutes tranches
        </h5>
      </Card.Header>
      <Card.Body>
        {reportData ? (
          <>
            <div className="mb-3">
              <Badge bg="info">
                Total des élèves: {reportData?.total_students || 0}
              </Badge>
            </div>
            {reportData.students?.map((studentData, studentIndex) => (
              <div key={studentIndex} className="mb-3 p-3 border rounded">
                <h6 className="mb-2">
                  {studentData?.student?.full_name} -{" "}
                  {studentData?.student?.class_series}
                </h6>
                <Table responsive striped size="sm">
                  <thead>
                    <tr>
                      <th>Tranche</th>
                      <th>Montant Requis</th>
                      <th>Montant Payé</th>
                      <th>Reste à Payer</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData?.tranches_details?.map(
                      (tranche, trancheIndex) => (
                        <tr key={trancheIndex}>
                          <td>{tranche?.tranche_name}</td>
                          <td>
                            {formatCurrency(tranche?.required_amount || 0)}
                          </td>
                          <td>{formatCurrency(tranche?.paid_amount || 0)}</td>
                          <td
                            className={
                              (tranche?.remaining_amount || 0) > 0
                                ? "text-danger"
                                : "text-success"
                            }
                          >
                            {formatCurrency(tranche?.remaining_amount || 0)}
                          </td>
                          <td>
                            <Badge
                              bg={
                                tranche?.status === "complete"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {tranche?.status === "complete"
                                ? "Complet"
                                : "Incomplet"}
                            </Badge>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </Table>
              </div>
            ))}
          </>
        ) : (
          <p className="text-muted text-center">
            Générez un rapport pour voir les données
          </p>
        )}
      </Card.Body>
    </Card>
  );

  const renderRameReport = () => (
    <Card>
      <Card.Header>
        <h5 className="mb-0">
          État des RAME - Détails par élève (espèces/physique/pas payé)
        </h5>
      </Card.Header>
      <Card.Body>
        {reportData ? (
          <>
            <div className="mb-3">
              <Row>
                <Col md={3}>
                  <Badge bg="info">
                    Total élèves: {reportData?.summary?.total_students || 0}
                  </Badge>
                </Col>
                <Col md={3}>
                  <Badge bg="success">
                    Payés: {reportData?.summary?.paid_count || 0}
                  </Badge>
                </Col>
                <Col md={3}>
                  <Badge bg="primary">
                    Banque: {reportData?.summary?.cash_count || 0}
                  </Badge>
                </Col>
                <Col md={3}>
                  <Badge bg="secondary">
                    Physique: {reportData?.summary?.physical_count || 0}
                  </Badge>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <Badge bg="info">
                    Quantité attendue:{" "}
                    {reportData?.summary?.total_quantity_expected || 0}
                  </Badge>
                </Col>
                <Col md={6}>
                  <Badge bg="success">
                    Quantité reçue:{" "}
                    {reportData?.summary?.total_quantity_received || 0}
                  </Badge>
                </Col>
              </Row>
            </div>
            <Table responsive striped size="sm">
              <thead>
                <tr>
                  <th>Étudiant</th>
                  <th>Classe/Série</th>
                  <th>Quantité</th>
                  <th>Statut</th>
                  <th>Date de Dépôt</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {reportData.students?.map((studentData, studentIndex) => (
                  <tr key={studentIndex}>
                    <td>{studentData?.student?.full_name}</td>
                    <td>{studentData?.student?.class_series}</td>
                    <td className="text-center">
                      <Badge
                        bg={
                          studentData?.rame_details?.quantity === 1
                            ? "success"
                            : "secondary"
                        }
                      >
                        {studentData?.rame_details?.quantity || 0}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        bg={
                          studentData?.rame_details?.payment_status === "paid"
                            ? "success"
                            : "warning"
                        }
                      >
                        {studentData?.rame_details?.payment_status === "paid"
                          ? "Payé"
                          : "En attente"}
                      </Badge>
                    </td>
                    <td>
                      {studentData?.rame_details?.deposit_date
                        ? new Date(
                            studentData.rame_details.deposit_date
                          ).toLocaleDateString("fr-FR")
                        : studentData?.rame_details?.marked_date
                        ? new Date(
                            studentData.rame_details.marked_date
                          ).toLocaleDateString("fr-FR")
                        : "-"}
                    </td>
                    <td>
                      <small className="text-muted">
                        {studentData?.rame_details?.notes || "-"}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : (
          <p className="text-muted text-center">
            Générez un rapport pour voir les données
          </p>
        )}
      </Card.Body>
    </Card>
  );

  // Fonction pour filtrer les données des bourses et rabais
  const getScholarshipsFilteredData = useCallback(() => {
    if (!reportData?.students) return [];

    return reportData.students.filter((student) => {
      const hasScholarship = student.scholarship_reason;
      const hasDiscount = student.discount_reason;

      return hasScholarship || hasDiscount; // Afficher tous les bénéficiaires
    });
  }, [reportData?.students]);

  // Données filtrées et triées pour les bourses et rabais
  const scholarshipsFilteredStudents = getScholarshipsFilteredData();

  const scholarshipsSortedStudents = useMemo(() => {
    if (
      activeTab === "scholarships_discounts" &&
      sortConfig.key &&
      sortConfig.direction
    ) {
      return sortData(
        scholarshipsFilteredStudents,
        sortConfig.key,
        sortConfig.direction
      );
    }
    return scholarshipsFilteredStudents;
  }, [scholarshipsFilteredStudents, sortConfig, sortData, activeTab]);

  const scholarshipsPaginatedStudents = useMemo(() => {
    if (activeTab !== "scholarships_discounts") return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return scholarshipsSortedStudents.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [scholarshipsSortedStudents, currentPage, itemsPerPage, activeTab]);

  const renderScholarshipsDiscountsReport = () => {
    return (
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">États Bourses et Rabais</h5>
              <small className="text-muted">
                Tous les avantages accordés aux élèves
              </small>
            </div>
            {reportData && (
              <Badge bg="primary">
                {scholarshipsSortedStudents.length} bénéficiaire(s)
              </Badge>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          {reportData ? (
            <>
              {/* Statistiques améliorées */}
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-center border-info h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        <CashCoin className="text-info me-2" size={24} />
                        <h4 className="text-info mb-0">
                          {formatCurrency(
                            reportData.summary?.total_scholarships || 0
                          )}
                        </h4>
                      </div>
                      <p className="text-muted mb-0">Total Bourses</p>
                      <small className="text-info">
                        {reportData.students?.filter(
                          (s) => s.scholarship_reason
                        ).length || 0}{" "}
                        bénéficiaires
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center border-warning h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        <BarChart className="text-warning me-2" size={24} />
                        <h4 className="text-warning mb-0">
                          {formatCurrency(
                            reportData.summary?.total_discounts || 0
                          )}
                        </h4>
                      </div>
                      <p className="text-muted mb-0">Total Rabais</p>
                      <small className="text-warning">
                        {reportData.students?.filter((s) => s.discount_reason)
                          .length || 0}{" "}
                        bénéficiaires
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center border-success h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        <Building className="text-success me-2" size={24} />
                        <h4 className="text-success mb-0">
                          {formatCurrency(
                            (reportData.summary?.total_scholarships || 0) +
                              (reportData.summary?.total_discounts || 0)
                          )}
                        </h4>
                      </div>
                      <p className="text-muted mb-0">Total Avantages</p>
                      <small className="text-success">
                        {reportData.summary?.beneficiary_count || 0}{" "}
                        bénéficiaires
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center border-primary h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        <Calendar className="text-primary me-2" size={24} />
                        <h4 className="text-primary mb-0">
                          {(
                            ((reportData.summary?.beneficiary_count || 0) /
                              Math.max(scholarshipsSortedStudents.length, 1)) *
                            100
                          ).toFixed(1)}
                          %
                        </h4>
                      </div>
                      <p className="text-muted mb-0">Taux Bénéficiaires</p>
                      <small className="text-primary">
                        Sur {scholarshipsSortedStudents.length} élèves
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Contrôles de pagination et affichage */}
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Éléments par page</Form.Label>
                    <Form.Select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{ width: "auto" }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6} className="text-end">
                  <small className="text-muted">
                    Affichage de {(currentPage - 1) * itemsPerPage + 1} à{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      scholarshipsSortedStudents.length
                    )}{" "}
                    sur {scholarshipsSortedStudents.length} bénéficiaires
                  </small>
                </Col>
              </Row>

              <Table responsive striped hover size="sm">
                <thead className="table-dark">
                  <tr>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("class_name")}
                    >
                      Classe {getSortIcon("class_name")}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("student_name")}
                    >
                      Nom & Prénoms {getSortIcon("student_name")}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("tuition_amount")}
                    >
                      Scolarité {getSortIcon("tuition_amount")}
                    </th>
                    <th>Type d'Avantage</th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("total_benefit_amount")}
                    >
                      Montant Avantage {getSortIcon("total_benefit_amount")}
                    </th>
                    <th>Économie (%)</th>
                    <th>Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {scholarshipsPaginatedStudents.map((student, index) => {
                    const savingsPercentage =
                      student.tuition_amount > 0
                        ? (
                            ((student.total_benefit_amount || 0) /
                              student.tuition_amount) *
                            100
                          ).toFixed(1)
                        : 0;

                    return (
                      <tr key={index}>
                        <td>
                          <Badge bg="secondary" className="me-1">
                            {student.class_name}
                          </Badge>
                        </td>
                        <td>
                          <strong>{student.student_name}</strong>
                        </td>
                        <td className="text-end">
                          {formatCurrency(student.tuition_amount)}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {student.scholarship_reason && (
                              <Badge bg="info" size="sm">
                                <CashCoin size={12} className="me-1" />
                                Bourse: {student.scholarship_reason}
                              </Badge>
                            )}
                            {student.discount_reason && (
                              <Badge bg="warning" size="sm">
                                <BarChart size={12} className="me-1" />
                                Rabais: {student.discount_reason}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-end">
                          <strong className="text-success">
                            {formatCurrency(student.total_benefit_amount)}
                          </strong>
                        </td>
                        <td className="text-center">
                          <Badge
                            bg={
                              savingsPercentage >= 50
                                ? "success"
                                : savingsPercentage >= 25
                                ? "warning"
                                : "info"
                            }
                            className="px-2"
                          >
                            {savingsPercentage}%
                          </Badge>
                        </td>
                        <td>
                          {student.observation && (
                            <small className="text-muted">
                              {student.observation}
                            </small>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              {/* Pagination */}
              {scholarshipsSortedStudents.length > itemsPerPage && (
                <Row className="mt-3">
                  <Col className="d-flex justify-content-center">
                    <Pagination>
                      <Pagination.First
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      />
                      <Pagination.Prev
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      />

                      {Array.from(
                        {
                          length: Math.ceil(
                            scholarshipsSortedStudents.length / itemsPerPage
                          ),
                        },
                        (_, i) => i + 1
                      )
                        .filter((page) => Math.abs(page - currentPage) <= 2)
                        .map((page) => (
                          <Pagination.Item
                            key={page}
                            active={page === currentPage}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Pagination.Item>
                        ))}

                      <Pagination.Next
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={
                          currentPage ===
                          Math.ceil(
                            scholarshipsSortedStudents.length / itemsPerPage
                          )
                        }
                      />
                      <Pagination.Last
                        onClick={() =>
                          setCurrentPage(
                            Math.ceil(
                              scholarshipsSortedStudents.length / itemsPerPage
                            )
                          )
                        }
                        disabled={
                          currentPage ===
                          Math.ceil(
                            scholarshipsSortedStudents.length / itemsPerPage
                          )
                        }
                      />
                    </Pagination>
                  </Col>
                </Row>
              )}

              {/* Récapitulatif par classe amélioré */}
              <Card className="mt-4">
                <Card.Header>
                  <h6 className="mb-0">
                    <Building className="me-2" />
                    Récapitulatif par Classe et Série
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Table responsive striped size="sm">
                    <thead className="table-light">
                      <tr>
                        <th>
                          <Building size={16} className="me-1" />
                          Classe - Série
                        </th>
                        <th className="text-center">
                          <CashCoin size={16} className="me-1" />
                          Bénéficiaires
                        </th>
                        <th className="text-end">
                          <BarChart size={16} className="me-1" />
                          Bourses
                        </th>
                        <th className="text-end">
                          <Calendar size={16} className="me-1" />
                          Rabais
                        </th>
                        <th className="text-end">
                          <FileText size={16} className="me-1" />
                          Total Avantages
                        </th>
                        <th className="text-center">Répartition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.class_summary?.map((classSummary, index) => {
                        const totalSchool =
                          (reportData.summary?.total_scholarships || 0) +
                          (reportData.summary?.total_discounts || 0);
                        const classPercentage =
                          totalSchool > 0
                            ? (
                                (classSummary.total_benefits / totalSchool) *
                                100
                              ).toFixed(1)
                            : 0;

                        return (
                          <tr key={index}>
                            <td>
                              <strong>{classSummary.class_name}</strong>
                              <small className="text-muted d-block">
                                {classSummary.series_name}
                              </small>
                            </td>
                            <td className="text-center">
                              <Badge bg="primary" className="px-3">
                                {classSummary.beneficiary_count}
                              </Badge>
                            </td>
                            <td className="text-end">
                              <span className="text-info">
                                {formatCurrency(
                                  classSummary.total_scholarships
                                )}
                              </span>
                            </td>
                            <td className="text-end">
                              <span className="text-warning">
                                {formatCurrency(classSummary.total_discounts)}
                              </span>
                            </td>
                            <td className="text-end">
                              <strong className="text-success">
                                {formatCurrency(classSummary.total_benefits)}
                              </strong>
                            </td>
                            <td className="text-center">
                              <Badge
                                bg={
                                  classPercentage >= 30
                                    ? "success"
                                    : classPercentage >= 15
                                    ? "warning"
                                    : "info"
                                }
                                className="px-2"
                              >
                                {classPercentage}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td>
                          <strong>TOTAL GÉNÉRAL</strong>
                        </td>
                        <td className="text-center">
                          <Badge bg="dark" className="px-3">
                            {reportData.summary?.beneficiary_count || 0}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <strong className="text-info">
                            {formatCurrency(
                              reportData.summary?.total_scholarships || 0
                            )}
                          </strong>
                        </td>
                        <td className="text-end">
                          <strong className="text-warning">
                            {formatCurrency(
                              reportData.summary?.total_discounts || 0
                            )}
                          </strong>
                        </td>
                        <td className="text-end">
                          <strong className="text-success fs-6">
                            {formatCurrency(
                              (reportData.summary?.total_scholarships || 0) +
                                (reportData.summary?.total_discounts || 0)
                            )}
                          </strong>
                        </td>
                        <td className="text-center">
                          <Badge bg="dark" className="px-2">
                            100%
                          </Badge>
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </Card.Body>
              </Card>
            </>
          ) : (
            <p className="text-muted text-center">
              Générez un rapport pour voir les données
            </p>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderCollectionDetailsReport = () => (
    <Card>
      <Card.Header>
        <div className="text-center">
          <div className="d-flex align-items-center justify-content-center mb-3">
            {paginatedReportData?.school_settings?.logo_url && (
              <img
                src={paginatedReportData.school_settings.logo_url}
                alt="Logo de l'école"
                style={{
                  height: "60px",
                  width: "auto",
                  marginRight: "20px",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <div>
              <h4 className="mb-1">
                {paginatedReportData?.school_settings?.school_name ||
                  "COLLEGE POLYVALENT BILINGUE DE DOUALA"}
              </h4>
              <h5 className="mb-0 text-primary">DÉTAIL DES ENCAISSEMENTS</h5>
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-6">
              <strong>Année Académique :</strong>{" "}
              {paginatedReportData?.school_year?.name || "N/A"}
            </div>
            <div className="col-md-6">
              <strong>Lieu de Dépôt :</strong>{" "}
              {paginatedReportData?.summary?.deposit_location || "BANQ"}
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <strong>Période:</strong>{" "}
              {paginatedReportData?.summary?.period_start
                ? new Date(
                    paginatedReportData.summary.period_start
                  ).toLocaleDateString("fr-FR")
                : "N/A"}
              au{" "}
              {paginatedReportData?.summary?.period_end
                ? new Date(
                    paginatedReportData.summary.period_end
                  ).toLocaleDateString("fr-FR")
                : "N/A"}
            </small>
            <small className="text-muted">
              <Badge bg="primary" className="me-2">
                {paginatedReportData?.summary?.total_collections || 0}{" "}
                encaissement(s)
              </Badge>
              <Badge bg="success">
                {formatCurrency(
                  paginatedReportData?.summary?.total_amount || 0
                )}
              </Badge>
            </small>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {paginatedReportData ? (
          <>
            <Table responsive striped size="sm" className="table-bordered">
              <thead className="table-dark">
                <tr>
                  <SortableHeader sortKey="student.matricule">
                    Matricule
                  </SortableHeader>
                  <SortableHeader sortKey="student.last_name">
                    Nom
                  </SortableHeader>
                  <SortableHeader sortKey="student.first_name">
                    Prénom
                  </SortableHeader>
                  <SortableHeader sortKey="student.class_name">
                    Classe
                  </SortableHeader>
                  <SortableHeader sortKey="payment_date">
                    Date de Versement
                  </SortableHeader>
                  <SortableHeader sortKey="validated_at">
                    Date de Validation
                  </SortableHeader>
                  <SortableHeader sortKey="amount">Montant</SortableHeader>
                  <th>Nom du Comptable</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReportData.collections?.map((collection, index) => (
                  <tr key={collection.payment_id || index}>
                    <td>
                      <code className="text-primary">
                        {collection.student?.matricule || "N/A"}
                      </code>
                    </td>
                    <td>
                      <strong>{collection.student?.last_name || "N/A"}</strong>
                    </td>
                    <td>
                      <strong>{collection.student?.first_name || "N/A"}</strong>
                    </td>
                    <td>
                      <Badge bg="info" size="sm">
                        {collection.student?.class_name || "N/A"}
                      </Badge>
                    </td>
                    <td>
                      <span className="fw-bold">
                        {collection.payment_date
                          ? new Date(
                              collection.payment_date
                            ).toLocaleDateString("fr-FR")
                          : "N/A"}
                      </span>
                      <br />
                      <small className="text-muted">
                        {collection.payment_time || ""}
                      </small>
                    </td>
                    <td>
                      {collection.validated_at ? (
                        <span className="text-success fw-bold">
                          {new Date(collection.validated_at).toLocaleDateString(
                            "fr-FR"
                          )}
                        </span>
                      ) : (
                        <Badge bg="warning" size="sm">
                          En attente
                        </Badge>
                      )}
                    </td>
                    <td className="text-end">
                      <strong className="text-success fs-6">
                        {formatCurrency(collection.amount || 0)}
                      </strong>
                      {collection.has_reduction && (
                        <div>
                          <small className="text-info">
                            (Rabais: -
                            {formatCurrency(collection.reduction_amount || 0)})
                          </small>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="fw-bold text-primary">
                        {collection.validator_name || "Système"}
                      </span>
                      <br />
                      <small className="text-muted">
                        Reçu N°: {collection.receipt_number || "N/A"}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <PaginationControls
              dataArray={sortedReportData?.collections}
              dataType="encaissements"
            />

            {/* Statistiques complémentaires */}
            {paginatedReportData?.statistics && (
              <Row className="mt-4">
                <Col md={6}>
                  <Card>
                    <Card.Header>
                      <h6 className="mb-0">Par Méthode de Paiement</h6>
                    </Card.Header>
                    <Card.Body>
                      <Table size="sm" responsive>
                        <thead>
                          <tr>
                            <th>Méthode</th>
                            <th className="text-center">Nombre</th>
                            <th className="text-end">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedReportData.statistics.by_payment_method?.map(
                            (method, idx) => (
                              <tr key={idx}>
                                <td>{method.label}</td>
                                <td className="text-center">
                                  <Badge bg="info">{method.count}</Badge>
                                </td>
                                <td className="text-end">
                                  {formatCurrency(method.total)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card>
                    <Card.Header>
                      <h6 className="mb-0">Par Tranche de Paiement</h6>
                    </Card.Header>
                    <Card.Body>
                      <Table size="sm" responsive>
                        <thead>
                          <tr>
                            <th>Tranche</th>
                            <th className="text-center">Nombre</th>
                            <th className="text-end">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedReportData.statistics.by_payment_tranche?.map(
                            (tranche, idx) => (
                              <tr key={idx}>
                                <td>{tranche.tranche_name}</td>
                                <td className="text-center">
                                  <Badge bg="warning">{tranche.count}</Badge>
                                </td>
                                <td className="text-end">
                                  {formatCurrency(tranche.total)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </>
        ) : (
          <p className="text-muted text-center">
            Générez un rapport pour voir les données
          </p>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <FileText className="me-3" />
            Rapports Financiers
          </h2>
          <p className="text-muted">
            Génération de rapports détaillés avec prise en compte des bourses et
            réductions
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {renderFilterSection()}

      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Row>
          <Col>
            <Nav variant="tabs" className="mb-4">
              <Nav.Item>
                <Nav.Link eventKey="insolvable">
                  <Building className="me-2" />
                  État Insolvable
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="payments">
                  <CashCoin className="me-2" />
                  Paiements
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="rame">
                  <FileEarmarkText className="me-2" />
                  État RAME
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="scholarships_discounts">
                  <Building className="me-2" />
                  Bourses & Rabais
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="collection_details">
                  <CashCoin className="me-2" />
                  Détail des Encaissements
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="insolvable">
                {renderInsolvableReport()}
              </Tab.Pane>
              <Tab.Pane eventKey="payments">{renderPaymentsReport()}</Tab.Pane>
              <Tab.Pane eventKey="rame">{renderRameReport()}</Tab.Pane>
              <Tab.Pane eventKey="scholarships_discounts">
                {renderScholarshipsDiscountsReport()}
              </Tab.Pane>
              <Tab.Pane eventKey="collection_details">
                {renderCollectionDetailsReport()}
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </Container>
  );
};

export default Reports;
