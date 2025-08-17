import React, { useState } from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';
import { Palette, Check } from 'react-bootstrap-icons';
import { useTheme } from '../contexts/ThemeContext';

const ColorPicker = ({ value, onChange, label = "Couleur primaire" }) => {
    const { colorPresets } = useTheme();
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customColor, setCustomColor] = useState(value || '#007bff');

    // Vérifier si la couleur actuelle correspond à un preset
    const currentPreset = colorPresets.find(preset => preset.value === value);

    const handlePresetSelect = (color) => {
        onChange(color);
        setCustomColor(color);
        setShowCustomInput(false);
    };

    const handleCustomColorChange = (e) => {
        const newColor = e.target.value;
        setCustomColor(newColor);
        onChange(newColor);
    };

    const toggleCustomInput = () => {
        setShowCustomInput(!showCustomInput);
        if (!showCustomInput) {
            setCustomColor(value || '#007bff');
        }
    };

    return (
        <div className="color-picker-component">
            <Form.Label className="d-flex align-items-center mb-3">
                <Palette className="me-2" size={16} />
                {label}
            </Form.Label>

            {/* Couleurs prédéfinies */}
            <div className="mb-3">
                <small className="text-muted d-block mb-2">Couleurs prédéfinies</small>
                <Row className="g-2">
                    {colorPresets.map((preset) => (
                        <Col key={preset.value} xs={4} sm={3} md={2}>
                            <div
                                className={`color-preset ${value === preset.value ? 'selected' : ''}`}
                                onClick={() => handlePresetSelect(preset.value)}
                                style={{
                                    backgroundColor: preset.value,
                                    height: '50px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    border: value === preset.value ? '3px solid #fff' : '2px solid #dee2e6',
                                    boxShadow: value === preset.value 
                                        ? `0 0 0 2px ${preset.value}` 
                                        : '0 1px 3px rgba(0,0,0,0.1)',
                                    position: 'relative',
                                    transition: 'all 0.2s ease'
                                }}
                                title={`${preset.name} - ${preset.value}`}
                            >
                                {value === preset.value && (
                                    <div className="d-flex align-items-center justify-content-center h-100">
                                        <Check 
                                            size={20} 
                                            className="text-white" 
                                            style={{ 
                                                textShadow: '0 0 3px rgba(0,0,0,0.5)' 
                                            }} 
                                        />
                                    </div>
                                )}
                            </div>
                            <small 
                                className="d-block text-center mt-1 text-muted" 
                                style={{ fontSize: '10px' }}
                            >
                                {preset.name}
                            </small>
                        </Col>
                    ))}
                </Row>
            </div>

            {/* Couleur personnalisée */}
            <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <small className="text-muted">Couleur personnalisée</small>
                    <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={toggleCustomInput}
                    >
                        {showCustomInput ? 'Masquer' : 'Personnaliser'}
                    </Button>
                </div>

                {showCustomInput && (
                    <div className="d-flex align-items-center gap-2">
                        <div 
                            className="color-preview"
                            style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: customColor,
                                border: '2px solid #dee2e6',
                                borderRadius: '6px'
                            }}
                        />
                        <Form.Control
                            type="color"
                            value={customColor}
                            onChange={handleCustomColorChange}
                            style={{ width: '60px', height: '40px', padding: '2px' }}
                        />
                        <Form.Control
                            type="text"
                            value={customColor}
                            onChange={(e) => {
                                const newColor = e.target.value;
                                if (/^#[0-9A-Fa-f]{0,6}$/.test(newColor)) {
                                    setCustomColor(newColor);
                                    if (newColor.length === 7) {
                                        onChange(newColor);
                                    }
                                }
                            }}
                            placeholder="#007bff"
                            pattern="^#[0-9A-Fa-f]{6}$"
                            maxLength={7}
                            style={{ fontFamily: 'monospace' }}
                        />
                    </div>
                )}
            </div>

            {/* Aperçu */}
            <div className="mt-3 p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                <small className="text-muted d-block mb-2">Aperçu :</small>
                <div className="d-flex gap-2 align-items-center">
                    <Button 
                        style={{ backgroundColor: value, borderColor: value }}
                        size="sm"
                    >
                        Bouton primaire
                    </Button>
                    <span 
                        className="badge"
                        style={{ backgroundColor: value }}
                    >
                        Badge
                    </span>
                    <div 
                        className="border rounded px-2 py-1"
                        style={{ color: value, borderColor: value }}
                    >
                        Texte coloré
                    </div>
                </div>
                <small className="text-muted mt-2 d-block">
                    {currentPreset 
                        ? `${currentPreset.name} (${currentPreset.value})` 
                        : `Couleur personnalisée (${value})`
                    }
                </small>
            </div>

            <style jsx>{`
                .color-preset:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
                }
                
                .color-preset.selected {
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};

export default ColorPicker;