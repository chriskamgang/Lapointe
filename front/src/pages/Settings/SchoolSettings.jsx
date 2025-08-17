import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Image,
  Row,
  Spinner,
} from "react-bootstrap";
import {
  Building,
  Calendar,
  Check2Circle,
  CurrencyDollar,
  Envelope,
  GeoAlt,
  Globe,
  Palette,
  Percent,
  Save,
  Telephone,
  Upload,
  Whatsapp,
} from "react-bootstrap-icons";
import Swal from "sweetalert2";
import ColorPicker from "../../components/ColorPicker";
import { useTheme } from "../../contexts/ThemeContext";
import { secureApiEndpoints } from "../../utils/apiMigration";

const SchoolSettings = () => {
  const { changePrimaryColor } = useTheme();

  const [settings, setSettings] = useState({
    school_name: "",
    school_motto: "",
    school_address: "",
    school_phone: "",
    school_email: "",
    school_website: "",
    school_logo: "",
    currency: "FCFA",
    bank_name: "",
    country: "",
    city: "",
    footer_text: "",
    scholarship_deadline: "",
    reduction_percentage: 10,
    primary_color: "#007bff",
    whatsapp_notification_number: "",
    whatsapp_notifications_enabled: false,
    whatsapp_api_url: "",
    whatsapp_instance_id: "",
    whatsapp_token: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await secureApiEndpoints.schoolSettings.get();

      if (response.success) {
        // Convertir la date au format requis pour l'input date
        const settingsData = { ...response.data };
        if (settingsData.scholarship_deadline) {
          // Convertir de '2025-08-15T00:00:00.000000Z' vers '2025-08-15'
          settingsData.scholarship_deadline =
            settingsData.scholarship_deadline.split("T")[0];
        }

        setSettings(settingsData);

        // Synchroniser le thème avec la couleur primaire chargée
        if (response.data.primary_color) {
          changePrimaryColor(response.data.primary_color);
        }

        // Charger le logo si disponible
        if (response.data.school_logo) {
          try {
            const logoResponse =
              await secureApiEndpoints.schoolSettings.getLogo();
            if (logoResponse.success) {
              setLogoPreview(logoResponse.data.logo_url);
            }
          } catch (error) {
            console.log("Logo non disponible");
          }
        }
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError("Erreur lors du chargement des paramètres");
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Si c'est la couleur primaire, l'appliquer immédiatement
    if (field === "primary_color") {
      changePrimaryColor(value);
    }
  };

  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError("Le logo ne peut pas dépasser 5MB");
        return;
      }

      // Vérifier le type de fichier
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Format de fichier non supporté. Utilisez JPG, PNG ou GIF.");
        return;
      }

      setLogoFile(file);

      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Validation côté frontend
      if (!settings.school_name || settings.school_name.trim() === "") {
        setError("Le nom de l'établissement est requis");
        setSaving(false);
        return;
      }

      // Préparer les données avec des valeurs par défaut
      const cleanedSettings = {
        ...settings,
        school_name: settings.school_name || "",
        school_motto: settings.school_motto || "",
        school_address: settings.school_address || "",
        school_phone: settings.school_phone || "",
        school_email: settings.school_email || "",
        school_website: settings.school_website || "",
        currency: settings.currency || "FCFA",
        bank_name: settings.bank_name || "",
        country: settings.country || "",
        city: settings.city || "",
        footer_text: settings.footer_text || "",
        scholarship_deadline: settings.scholarship_deadline || "",
        reduction_percentage: settings.reduction_percentage || 10,
      };

      // Préparer les données
      let formData;

      if (logoFile) {
        // Si un nouveau logo est uploadé, utiliser FormData
        formData = new FormData();
        Object.keys(cleanedSettings).forEach((key) => {
          if (key !== "school_logo") {
            formData.append(key, cleanedSettings[key] || "");
          }
        });
        formData.append("school_logo", logoFile);

        // Débogage temporaire
        console.log(
          "Sending FormData with logo:",
          logoFile.name,
          logoFile.size,
          logoFile.type
        );
        for (let [key, value] of formData.entries()) {
          console.log(
            "FormData entry:",
            key,
            typeof value === "object" ? value.name : value
          );
        }
      } else {
        // Sinon, utiliser les données JSON normales
        formData = { ...cleanedSettings };
        delete formData.school_logo; // Ne pas envoyer le chemin du logo existant
      }

      const response = await secureApiEndpoints.schoolSettings.update(formData);

      if (response.success) {
        setSuccess("Paramètres mis à jour avec succès");
        setSettings(response.data);
        setLogoFile(null);

        // Recharger le logo si nécessaire
        if (logoFile && response.data.school_logo) {
          try {
            const logoResponse =
              await secureApiEndpoints.schoolSettings.getLogo();
            if (logoResponse.success) {
              setLogoPreview(logoResponse.data.logo_url);
            }
          } catch (error) {
            console.log("Erreur lors du rechargement du logo");
          }
        }

        // Notification de succès
        Swal.fire({
          title: "Succès !",
          text: "Les paramètres de l'établissement ont été mis à jour.",
          icon: "success",
          confirmButtonText: "OK",
        });
      } else {
        setError(response.message || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      setError("Erreur lors de la mise à jour des paramètres");
      console.error("Error updating settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const testWhatsApp = async () => {
    try {
      setTestingWhatsApp(true);
      setError("");
      setSuccess("");

      const response = await secureApiEndpoints.schoolSettings.testWhatsApp();

      if (response.success) {
        setSuccess(response.message);
        Swal.fire({
          title: "Test réussi !",
          text: response.message,
          icon: "success",
          confirmButtonText: "OK",
        });
      } else {
        setError(response.message);
        Swal.fire({
          title: "Test échoué",
          text: response.message,
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      const errorMessage = "Erreur lors du test WhatsApp";
      setError(errorMessage);
      Swal.fire({
        title: "Erreur",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Chargement...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2>Paramètres de l'Établissement</h2>
          <p className="text-muted">
            Configurez les informations générales de votre établissement
          </p>
        </Col>
      </Row>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Row>
          {/* Informations générales */}
          <Col lg={8}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0 d-flex align-items-center gap-1">
                  <Building className="me-2" />
                  Informations Générales
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nom de l'établissement *</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.school_name}
                        onChange={(e) =>
                          handleInputChange("school_name", e.target.value)
                        }
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Devise</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.school_motto}
                        onChange={(e) =>
                          handleInputChange("school_motto", e.target.value)
                        }
                        placeholder="Ex: Excellence et Discipline"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label className=" d-flex align-items-center gap-1">
                    <GeoAlt className="me-1" />
                    Adresse complète
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={settings.school_address}
                    onChange={(e) =>
                      handleInputChange("school_address", e.target.value)
                    }
                    placeholder="Adresse complète de l'établissement"
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                  <Form.Label className=" d-flex align-items-center gap-1">
                        <Telephone className="me-1" />
                        Téléphone
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.school_phone}
                        onChange={(e) =>
                          handleInputChange("school_phone", e.target.value)
                        }
                        placeholder="Ex: 233 43 25 47"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                  <Form.Label className=" d-flex align-items-center gap-1">
                        <Envelope className="me-1" />
                        Email
                      </Form.Label>
                      <Form.Control
                        type="email"
                        value={settings.school_email}
                        onChange={(e) =>
                          handleInputChange("school_email", e.target.value)
                        }
                        placeholder="contact@ecole.com"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                    <Form.Label className=" d-flex align-items-center gap-1">
                        <Globe className="me-1" />
                        Site Web
                      </Form.Label>
                      <Form.Control
                        type="url"
                        value={settings.school_website}
                        onChange={(e) =>
                          handleInputChange("school_website", e.target.value)
                        }
                        placeholder="www.ecole.com"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                    <Form.Label className=" d-flex align-items-center gap-1">
                        <CurrencyDollar className="me-1" />
                        Monnaie
                      </Form.Label>
                      <Form.Select
                        value={settings.currency}
                        onChange={(e) =>
                          handleInputChange("currency", e.target.value)
                        }
                      >
                        <option value="FCFA">FCFA</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="XAF">XAF</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nom de la banque</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.bank_name}
                        onChange={(e) =>
                          handleInputChange("bank_name", e.target.value)
                        }
                        placeholder="Ex: FIGEC"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pays</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.country}
                        onChange={(e) =>
                          handleInputChange("country", e.target.value)
                        }
                        placeholder="Ex: Cameroun"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ville</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.city}
                        onChange={(e) =>
                          handleInputChange("city", e.target.value)
                        }
                        placeholder="Ex: Douala"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Paramètres financiers */}
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0 d-flex align-items-center gap-1">
                  <CurrencyDollar className="me-2" />
                  Paramètres Financiers
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                    <Form.Label className=" d-flex align-items-center gap-1">
                        <Calendar className="me-1" />
                        Date limite pour bourses/réductions
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={settings.scholarship_deadline}
                        onChange={(e) =>
                          handleInputChange(
                            "scholarship_deadline",
                            e.target.value
                          )
                        }
                      />
                      <Form.Text className="text-muted">
                        Les étudiants doivent payer avant cette date pour
                        bénéficier des bourses et réductions
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className=" d-flex align-items-center gap-1">
                        <Percent className="me-1" />
                        Pourcentage de réduction (%)
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settings.reduction_percentage}
                        onChange={(e) =>
                          handleInputChange(
                            "reduction_percentage",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                      <Form.Text className="text-muted">
                        Réduction appliquée aux anciens élèves et aux nouveaux
                        payant avant délai
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Configuration WhatsApp */}
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0 d-flex align-items-center gap-1">
                  <Whatsapp className="me-2" />
                  Notifications WhatsApp
                </h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className=" d-flex align-items-center gap-1">
                        <Telephone className="me-1" />
                        Numéro WhatsApp pour notifications
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.whatsapp_notification_number}
                        onChange={(e) =>
                          handleInputChange(
                            "whatsapp_notification_number",
                            e.target.value
                          )
                        }
                        placeholder="Ex: +237 6XX XX XX XX"
                      />
                      <Form.Text className="text-muted">
                        Ce numéro recevra les notifications
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>État des notifications</Form.Label>
                      <div>
                        <Form.Check
                          type="switch"
                          id="whatsapp-notifications-switch"
                          label={
                            settings.whatsapp_notifications_enabled
                              ? "Activées"
                              : "Désactivées"
                          }
                          checked={settings.whatsapp_notifications_enabled}
                          onChange={(e) =>
                            handleInputChange(
                              "whatsapp_notifications_enabled",
                              e.target.checked
                            )
                          }
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="border-top pt-3 mb-3">
                  <h6 className="text-muted mb-3">
                    Configuration API UltraMsg
                  </h6>
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>URL de l'API UltraMsg</Form.Label>
                        <Form.Control
                          type="url"
                          value={settings.whatsapp_api_url}
                          onChange={(e) =>
                            handleInputChange(
                              "whatsapp_api_url",
                              e.target.value
                            )
                          }
                          placeholder="https://api.ultramsg.com"
                        />
                        <Form.Text className="text-muted">
                          URL de base de l'API UltraMsg
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Instance ID</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.whatsapp_instance_id}
                          onChange={(e) =>
                            handleInputChange(
                              "whatsapp_instance_id",
                              e.target.value
                            )
                          }
                          placeholder="instanceXXXXX"
                        />
                        <Form.Text className="text-muted">
                          ID de votre instance UltraMsg
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Token API</Form.Label>
                        <Form.Control
                          type="password"
                          value={settings.whatsapp_token}
                          onChange={(e) =>
                            handleInputChange("whatsapp_token", e.target.value)
                          }
                          placeholder="Votre token UltraMsg"
                        />
                        <Form.Text className="text-muted">
                          Token d'authentification UltraMsg
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {settings.whatsapp_notifications_enabled &&
                  settings.whatsapp_notification_number &&
                  settings.whatsapp_api_url &&
                  settings.whatsapp_instance_id &&
                  settings.whatsapp_token && (
                    <div className="bg-light p-3 rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong className="text-success">
                            ✅ Configuration complète
                          </strong>
                          <div className="text-muted small">
                            Tous les paramètres requis sont configurés
                          </div>
                        </div>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={testWhatsApp}
                          disabled={testingWhatsApp}
                        >
                          {testingWhatsApp ? (
                            <>
                              <Spinner
                                animation="border"
                                size="sm"
                                className="me-2"
                              />
                              Test en cours...
                            </>
                          ) : (
                            <>
                              <Check2Circle className="me-2" />
                              Tester UltraMsg
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                {settings.whatsapp_notifications_enabled &&
                  (!settings.whatsapp_notification_number ||
                    !settings.whatsapp_api_url ||
                    !settings.whatsapp_instance_id ||
                    !settings.whatsapp_token) && (
                    <div className="alert alert-warning">
                      <strong>⚠️ Configuration incomplète</strong>
                      <div>
                        Veuillez remplir tous les champs pour activer les
                        notifications WhatsApp.
                      </div>
                    </div>
                  )}
              </Card.Body>
            </Card>

            {/* Texte de pied de page */}
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Texte de Pied de Page (Reçus)</h5>
              </Card.Header>
              <Card.Body>
                <Form.Group>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={settings.footer_text}
                    onChange={(e) =>
                      handleInputChange("footer_text", e.target.value)
                    }
                    placeholder="Texte qui apparaîtra au bas des reçus de paiement..."
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>

          {/* Logo */}
          <Col lg={4}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0 d-flex align-items-center gap-1">
                  <Upload className="me-2" />
                  Logo de l'Établissement
                </h5>
              </Card.Header>
              <Card.Body className="text-center">
                {logoPreview && (
                  <div className="mb-3">
                    <Image
                      src={logoPreview}
                      alt="Logo"
                      thumbnail
                      style={{ maxWidth: "200px", maxHeight: "200px" }}
                    />
                  </div>
                )}

                <Form.Group>
                  <Form.Label>Choisir un nouveau logo</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                  <Form.Text className="text-muted">
                    Formats acceptés: JPG, PNG, GIF. Taille max: 5MB
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Couleur primaire */}
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">
                  <Palette className="me-2" />
                  Thème de l'Application
                </h5>
              </Card.Header>
              <Card.Body>
                <ColorPicker
                  value={settings.primary_color}
                  onChange={(color) =>
                    handleInputChange("primary_color", color)
                  }
                  label="Couleur principale de l'interface"
                />
                <small className="text-muted">
                  Cette couleur sera appliquée aux boutons, liens et éléments
                  principaux de l'interface.
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Boutons d'action */}
        <Row>
          <Col>
            <div className="d-flex justify-content-end">
              <Button
                variant="primary"
                type="submit"
                disabled={saving}
                size="lg"
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="me-2" />
                    Sauvegarder les Paramètres
                  </>
                )}
              </Button>
            </div>
          </Col>
        </Row>
      </Form>
    </Container>
  );
};

export default SchoolSettings;
