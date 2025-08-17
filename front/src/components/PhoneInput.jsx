import React, { useState, useEffect } from 'react';
import { Check, X, Telephone, QuestionCircle } from 'react-bootstrap-icons';
import { usePhoneValidation } from '../hooks/usePhoneValidation';
import { paramsTraductions } from '../local/params';
import { getLang } from '../utils/lang';

/**
 * Composant d'input pour numéros de téléphone avec validation intégrée
 */
const PhoneInput = ({ 
    value = '', 
    onChange, 
    onBlur,
    label,
    placeholder = '+237 6XX XXX XXX',
    required = false,
    disabled = false,
    showSuggestions = true,
    className = '',
    id,
    name 
}) => {
    const { validatePhone, formatPhone, detectCountry, getSuggestions } = usePhoneValidation();
    const [localValue, setLocalValue] = useState(value);
    const [showHelp, setShowHelp] = useState(false);
    const [validation, setValidation] = useState({ isValid: true, message: '' });
    const [country, setCountry] = useState({ country: 'Unknown', flag: '🌍', code: '' });
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        setLocalValue(value);
        const validation = validatePhone(value);
        setValidation(validation);
        setCountry(detectCountry(value));
        
        if (!validation.isValid && showSuggestions) {
            setSuggestions(getSuggestions(value));
        } else {
            setSuggestions([]);
        }
    }, [value, validatePhone, detectCountry, getSuggestions, showSuggestions]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        
        // Valider en temps réel
        const validation = validatePhone(newValue);
        setValidation(validation);
        setCountry(detectCountry(newValue));
        
        // Mettre à jour la validité HTML5
        if (validation.isValid || newValue === '') {
            e.target.setCustomValidity('');
        } else {
            e.target.setCustomValidity(validation.message);
        }
        
        if (onChange) {
            onChange(e);
        }
    };

    const handleBlur = (e) => {
        const formatted = formatPhone(e.target.value);
        const finalValidation = validatePhone(formatted || e.target.value);
        
        // Mettre à jour la validation finale
        setValidation(finalValidation);
        
        // Mettre à jour la validité HTML5
        if (finalValidation.isValid || e.target.value === '') {
            e.target.setCustomValidity('');
        } else {
            e.target.setCustomValidity(finalValidation.message);
        }
        
        if (formatted !== e.target.value && finalValidation.isValid) {
            setLocalValue(formatted);
            
            // Create a synthetic event with the formatted value
            const syntheticEvent = {
                ...e,
                target: { ...e.target, value: formatted }
            };
            
            if (onChange) {
                onChange(syntheticEvent);
            }
        }
        
        if (onBlur) {
            onBlur(e);
        }
    };

    const applySuggestion = (suggestion) => {
        setLocalValue(suggestion.formatted);
        setSuggestions([]);
        
        const syntheticEvent = {
            target: { value: suggestion.formatted }
        };
        
        if (onChange) {
            onChange(syntheticEvent);
        }
    };

    return (
        <div className={`phone-input-container ${className}`}>
            {label && (
                <label htmlFor={id} className="form-label d-flex align-items-center">
                    <Telephone size={16} className="me-1" />
                    {label}
                    {required && <span className="text-danger ms-1">*</span>}
                    <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-2"
                        onClick={() => setShowHelp(!showHelp)}
                        title="Aide sur le format"
                    >
                        <QuestionCircle size={14} className="text-muted" />
                    </button>
                </label>
            )}
            
            <div className="input-group">
                <span className="input-group-text bg-light border-end-0" style={{ minWidth: '60px' }}>
                    <span className="me-1" title={country.country}>{country.flag}</span>
                    <small className="text-muted">{country.code}</small>
                </span>
                <input
                    type="tel"
                    id={id}
                    name={name}
                    className={`form-control border-start-0 ${
                        validation.isValid ? '' : 'is-invalid'
                    } ${
                        localValue && validation.isValid ? 'is-valid' : ''
                    }`}
                    value={localValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    noValidate={true}
                    title={paramsTraductions[getLang()].phoneInputTitle || "Entrez un numéro de téléphone valide"}
                    onInvalid={(e) => {
                        e.preventDefault();
                        // Utiliser notre validation personnalisée au lieu de la validation HTML5
                        if (!validation.isValid) {
                            e.target.setCustomValidity(validation.message);
                        } else {
                            e.target.setCustomValidity('');
                        }
                    }}
                />
                <span className="input-group-text bg-light">
                    {localValue && validation.isValid && (
                        <Check size={16} className="text-success" title="Format valide" />
                    )}
                    {localValue && !validation.isValid && (
                        <X size={16} className="text-danger" title="Format invalide" />
                    )}
                </span>
            </div>
            
            {/* Messages d'aide et d'erreur */}
            {showHelp && (
                <div className="alert alert-info alert-dismissible fade show mt-2" role="alert">
                    <strong>{paramsTraductions[getLang()].phoneFormatHelp || 'Formats acceptés :'}</strong>
                    <ul className="mb-1 mt-1">
                        <li><code>+237 6XX XXX XXX</code> - Format international (recommandé)</li>
                        <li><code>237 6XX XXX XXX</code> - Avec indicatif pays</li>
                        <li><code>6XX XXX XXX</code> - Format local (Cameroun)</li>
                    </ul>
                    <button 
                        type="button" 
                        className="btn-close" 
                        onClick={() => setShowHelp(false)}
                        aria-label="Close"
                    ></button>
                </div>
            )}
            
            {!validation.isValid && validation.message && (
                <div className="invalid-feedback d-block">
                    {validation.message}
                </div>
            )}
            
            {/* Suggestions de correction */}
            {suggestions.length > 0 && (
                <div className="mt-2">
                    <small className="text-muted">
                        {paramsTraductions[getLang()].phoneSuggestions || 'Suggestions :'}
                    </small>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => applySuggestion(suggestion)}
                                title={suggestion.description}
                            >
                                {suggestion.formatted}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Indicateur de format */}
            <div className="form-text d-flex align-items-center justify-content-between">
                <span>
                    {paramsTraductions[getLang()].phoneFormatExample || 'Exemple : +237 671 234 567'}
                </span>
                {localValue && (
                    <span className={`badge ${
                        validation.isValid ? 'bg-success' : 'bg-danger'
                    }`}>
                        {validation.isValid ? 
                            (paramsTraductions[getLang()].validFormat || 'Format valide') : 
                            (paramsTraductions[getLang()].invalidFormat || 'Format invalide')
                        }
                    </span>
                )}
            </div>
        </div>
    );
};

export default PhoneInput;