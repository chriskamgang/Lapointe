import React, { useState } from 'react';
import { Modal, Button, Form, Alert, ProgressBar, Row, Col } from 'react-bootstrap';
import { Download, Upload, FileText, FileSpreadsheet, FilePdf } from 'react-bootstrap-icons';
import { api } from '../utils/api';
import { authService } from '../services/authService';
import { host } from '../utils/fetch';

const ImportExportModal = ({ 
    show, 
    onHide, 
    title, 
    apiBasePath, 
    onImportSuccess,
    filters = {},
    templateFileName = "template.csv",
    seriesId = null // Nouveau paramètre pour l'ID de série
}) => {
    const [activeTab, setActiveTab] = useState('export');
    const [exportFormat, setExportFormat] = useState('excel');
    const [importFile, setImportFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [importProgress, setImportProgress] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleExport = async () => {
        setIsLoading(true);
        try {
            const token = authService.getToken();
            if (!token) {
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }

            const queryParams = new URLSearchParams(filters);
            const url = `${host}${apiBasePath}/export/${exportFormat}?${queryParams}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Erreur lors de l\'export');
            }

            // Créer un blob avec la réponse
            const blob = await response.blob();
            
            // Créer un lien de téléchargement
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            // Déterminer l'extension du fichier
            const extensions = {
                'excel': 'xlsx',
                'csv': 'csv',
                'pdf': 'pdf'
            };
            
            link.download = `${title.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.${extensions[exportFormat]}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            showAlert('success', `Export ${exportFormat.toUpperCase()} réussi`);
        } catch (error) {
            console.error('Export error:', error);
            showAlert('danger', `Erreur lors de l'export: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (!importFile) {
            showAlert('warning', 'Veuillez sélectionner un fichier');
            return;
        }

        setIsLoading(true);
        setImportProgress({ current: 0, total: 100 });

        try {
            const formData = new FormData();
            formData.append('file', importFile);

            const token = authService.getToken();
            if (!token) {
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }

            // Utiliser la nouvelle route si seriesId est fourni
            const importUrl = seriesId 
                ? `${host}/api/students/series/${seriesId}/import`
                : `${host}${apiBasePath}/import/csv`;
                
            const response = await fetch(importUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Erreur lors de l\'import');
            }

            setImportProgress({ current: 100, total: 100 });

            const { created = 0, updated = 0, errors = [] } = result.data;
            
            let message = `Import terminé: ${created} créé(s), ${updated} mis à jour`;
            if (errors.length > 0) {
                message += `, ${errors.length} erreur(s)`;
                console.warn('Import errors:', errors);
            }

            showAlert(errors.length > 0 ? 'warning' : 'success', message);
            
            // Réinitialiser le formulaire
            setImportFile(null);
            const fileInput = document.getElementById('importFile');
            if (fileInput) fileInput.value = '';

            // Notifier le parent du succès
            if (onImportSuccess) {
                onImportSuccess(result.data);
            }

        } catch (error) {
            console.error('Import error:', error);
            showAlert('danger', `Erreur lors de l'import: ${error.message}`);
        } finally {
            setIsLoading(false);
            setImportProgress(null);
        }
    };

    const downloadTemplate = async () => {
        try {
            const token = authService.getToken();
            if (!token) {
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }

            const response = await fetch(`${host}${apiBasePath}/template/download`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Erreur lors du téléchargement du template');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = templateFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            showAlert('success', 'Template téléchargé avec succès');
        } catch (error) {
            console.error('Template download error:', error);
            showAlert('danger', `Erreur lors du téléchargement: ${error.message}`);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Vérifier le type de fichier
            if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
                showAlert('warning', 'Veuillez sélectionner un fichier CSV');
                return;
            }
            setImportFile(file);
        }
    };

    const formatIcons = {
        excel: <FileSpreadsheet className="me-2" />,
        csv: <FileText className="me-2" />,
        pdf: <FilePdf className="me-2" />
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    {activeTab === 'export' ? 'Exporter' : 'Importer'} {title}
                </Modal.Title>
            </Modal.Header>
            
            <Modal.Body>
                {alert && (
                    <Alert variant={alert.type} className="mb-3">
                        {alert.message}
                    </Alert>
                )}

                {/* Onglets */}
                <div className="btn-group w-100 mb-4" role="group">
                    <Button 
                        variant={activeTab === 'export' ? 'primary' : 'outline-primary'}
                        onClick={() => setActiveTab('export')}
                        disabled={isLoading}
                    >
                        <Download className="me-2" />
                        Exporter
                    </Button>
                    <Button 
                        variant={activeTab === 'import' ? 'primary' : 'outline-primary'}
                        onClick={() => setActiveTab('import')}
                        disabled={isLoading}
                    >
                        <Upload className="me-2" />
                        Importer
                    </Button>
                </div>

                {/* Contenu Export */}
                {activeTab === 'export' && (
                    <div>
                        <Form.Group className="mb-3">
                            <Form.Label>Format d'export</Form.Label>
                            <div className="d-flex gap-2">
                                {['excel', 'csv', 'pdf'].map(format => (
                                    <Form.Check
                                        key={format}
                                        type="radio"
                                        id={`format-${format}`}
                                        name="exportFormat"
                                        label={
                                            <span>
                                                {formatIcons[format]}
                                                {format.toUpperCase()}
                                            </span>
                                        }
                                        checked={exportFormat === format}
                                        onChange={() => setExportFormat(format)}
                                        disabled={isLoading}
                                    />
                                ))}
                            </div>
                        </Form.Group>

                        <div className="d-grid">
                            <Button 
                                variant="success" 
                                size="lg"
                                onClick={handleExport}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Export en cours...
                                    </>
                                ) : (
                                    <>
                                        <Download className="me-2" />
                                        Exporter en {exportFormat.toUpperCase()}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Contenu Import */}
                {activeTab === 'import' && (
                    <div>
                        <Row className="mb-3">
                            <Col>
                                <Button 
                                    variant="outline-info" 
                                    onClick={downloadTemplate}
                                    className="w-100"
                                >
                                    <Download className="me-2" />
                                    Télécharger le template CSV
                                </Button>
                                <small className="text-muted d-block mt-1">
                                    Téléchargez d'abord le template pour voir le format attendu
                                </small>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Fichier CSV à importer</Form.Label>
                            <Form.Control
                                type="file"
                                id="importFile"
                                accept=".csv,text/csv"
                                onChange={handleFileChange}
                                disabled={isLoading}
                            />
                            <Form.Text className="text-muted">
                                Formats acceptés: .csv (taille max: 2MB)
                            </Form.Text>
                        </Form.Group>

                        {importFile && (
                            <Alert variant="info" className="mb-3">
                                <strong>Fichier sélectionné:</strong> {importFile.name}
                                <br />
                                <strong>Taille:</strong> {(importFile.size / 1024).toFixed(2)} KB
                            </Alert>
                        )}

                        {importProgress && (
                            <div className="mb-3">
                                <ProgressBar 
                                    now={importProgress.current} 
                                    max={importProgress.total}
                                    label={`${Math.round((importProgress.current / importProgress.total) * 100)}%`}
                                    animated
                                />
                            </div>
                        )}

                        <div className="d-grid">
                            <Button 
                                variant="primary" 
                                size="lg"
                                onClick={handleImport}
                                disabled={isLoading || !importFile}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Import en cours...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="me-2" />
                                        Importer le fichier CSV
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={isLoading}>
                    Fermer
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ImportExportModal;