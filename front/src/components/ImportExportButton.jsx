import React, { useState } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { Download, Upload, FileEarmark } from 'react-bootstrap-icons';
import ImportExportModal from './ImportExportModal';

const ImportExportButton = ({ 
    title, 
    apiBasePath, 
    onImportSuccess,
    filters = {},
    templateFileName = "template.csv",
    className = "",
    size = "sm",
    seriesId = null // Nouveau paramètre pour l'ID de série
}) => {
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('export');

    const openExportModal = () => {
        setModalMode('export');
        setShowModal(true);
    };

    const openImportModal = () => {
        setModalMode('import');
        setShowModal(true);
    };

    return (
        <>
            <Dropdown className={className}>
                <Dropdown.Toggle 
                    variant="outline-secondary" 
                    size={size}
                    className="d-flex align-items-center"
                >
                    <FileEarmark className="me-1" />
                    Import/Export
                </Dropdown.Toggle>

                <Dropdown.Menu>
                    <Dropdown.Item onClick={openExportModal}>
                        <Download className="me-2" />
                        Exporter les données
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={openImportModal}>
                        <Upload className="me-2" />
                        Importer des données
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>

            <ImportExportModal
                show={showModal}
                onHide={() => setShowModal(false)}
                title={title}
                apiBasePath={apiBasePath}
                onImportSuccess={onImportSuccess}
                filters={filters}
                templateFileName={templateFileName}
                seriesId={seriesId}
            />
        </>
    );
};

export default ImportExportButton;