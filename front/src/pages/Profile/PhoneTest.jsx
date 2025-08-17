import React, { useState } from 'react';
import PhoneInput from '../../components/PhoneInput';
import { usePhoneValidation } from '../../hooks/usePhoneValidation';

/**
 * Composant de test pour les fonctionnalités de téléphone
 * Utile pour tester et documenter le comportement
 */
const PhoneTest = () => {
    const [testPhone, setTestPhone] = useState('');
    const { validatePhone, formatPhone, detectCountry, getSuggestions } = usePhoneValidation();

    const testCases = [
        '671234567',           // Numéro camerounais sans indicatif
        '237671234567',        // Numéro camerounais avec indicatif sans +
        '+237671234567',       // Numéro camerounais complet
        '+237 671 234 567',    // Numéro camerounais formaté
        '+33123456789',        // Numéro français
        '+1234567890',         // Numéro américain
        '123456',              // Trop court
        '+237812345678',       // Cameroun avec mauvais préfixe
        '',                    // Vide
        'abc123',              // Caractères invalides
    ];

    const testValidation = (phone) => {
        const validation = validatePhone(phone);
        const formatted = formatPhone(phone);
        const country = detectCountry(phone);
        const suggestions = getSuggestions(phone);

        return {
            original: phone,
            validation,
            formatted,
            country,
            suggestions
        };
    };

    return (
        <div className="container py-4">
            <div className="row">
                <div className="col-12">
                    <h2 className="mb-4">🧪 Test des fonctionnalités de téléphone</h2>
                </div>
            </div>

            {/* Test interactif */}
            <div className="row mb-5">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h4 className="mb-0">Test interactif</h4>
                        </div>
                        <div className="card-body">
                            <PhoneInput
                                label="Numéro de test"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                showSuggestions={true}
                            />
                            
                            {testPhone && (
                                <div className="mt-3">
                                    <h6>Résultats :</h6>
                                    {(() => {
                                        const result = testValidation(testPhone);
                                        return (
                                            <div className="bg-light p-3 rounded">
                                                <div><strong>Original :</strong> <code>{result.original}</code></div>
                                                <div><strong>Valide :</strong> 
                                                    <span className={`badge ms-2 ${result.validation.isValid ? 'bg-success' : 'bg-danger'}`}>
                                                        {result.validation.isValid ? 'Oui' : 'Non'}
                                                    </span>
                                                </div>
                                                {!result.validation.isValid && (
                                                    <div><strong>Erreur :</strong> <span className="text-danger">{result.validation.message}</span></div>
                                                )}
                                                <div><strong>Formaté :</strong> <code>{result.formatted}</code></div>
                                                <div><strong>Pays :</strong> {result.country.flag} {result.country.country} ({result.country.code})</div>
                                                {result.suggestions.length > 0 && (
                                                    <div>
                                                        <strong>Suggestions :</strong>
                                                        <ul className="mb-0 mt-1">
                                                            {result.suggestions.map((s, i) => (
                                                                <li key={i}>
                                                                    <code>{s.formatted}</code> - {s.description}
                                                                    <button 
                                                                        className="btn btn-sm btn-outline-primary ms-2"
                                                                        onClick={() => setTestPhone(s.formatted)}
                                                                    >
                                                                        Utiliser
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h4 className="mb-0">Tests rapides</h4>
                        </div>
                        <div className="card-body">
                            <div className="d-flex flex-wrap gap-2">
                                {testCases.map((testCase, index) => (
                                    <button
                                        key={index}
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => setTestPhone(testCase)}
                                        title={`Test: ${testCase || 'Vide'}`}
                                    >
                                        {testCase || '(vide)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tableau de tous les tests */}
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h4 className="mb-0">Résultats de tous les tests</h4>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Original</th>
                                            <th>Valide</th>
                                            <th>Formaté</th>
                                            <th>Pays</th>
                                            <th>Suggestions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {testCases.map((testCase, index) => {
                                            const result = testValidation(testCase);
                                            return (
                                                <tr key={index}>
                                                    <td><code>{testCase || '(vide)'}</code></td>
                                                    <td>
                                                        <span className={`badge ${result.validation.isValid ? 'bg-success' : 'bg-danger'}`}>
                                                            {result.validation.isValid ? '✓' : '✗'}
                                                        </span>
                                                        {!result.validation.isValid && (
                                                            <small className="text-muted d-block">
                                                                {result.validation.message}
                                                            </small>
                                                        )}
                                                    </td>
                                                    <td><code>{result.formatted}</code></td>
                                                    <td>
                                                        {result.country.flag} {result.country.country}
                                                        <small className="text-muted d-block">{result.country.code}</small>
                                                    </td>
                                                    <td>
                                                        {result.suggestions.length > 0 && (
                                                            <div>
                                                                {result.suggestions.map((s, i) => (
                                                                    <div key={i} className="small">
                                                                        <code>{s.formatted}</code>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Documentation des formats */}
            <div className="row mt-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h4 className="mb-0">Formats supportés</h4>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-4">
                                    <h6>🇨🇲 Cameroun</h6>
                                    <ul className="list-unstyled">
                                        <li><code>+237 671 234 567</code> ✅</li>
                                        <li><code>237 671 234 567</code> ✅</li>
                                        <li><code>671 234 567</code> ✅</li>
                                        <li><code>6 71 23 45 67</code> ✅</li>
                                    </ul>
                                </div>
                                <div className="col-md-4">
                                    <h6>🌍 International</h6>
                                    <ul className="list-unstyled">
                                        <li><code>+33 1 23 45 67 89</code> ✅</li>
                                        <li><code>+1 555 123 4567</code> ✅</li>
                                        <li><code>+234 801 234 5678</code> ✅</li>
                                    </ul>
                                </div>
                                <div className="col-md-4">
                                    <h6>❌ Formats invalides</h6>
                                    <ul className="list-unstyled">
                                        <li><code>123456</code> (trop court)</li>
                                        <li><code>+237 812 345 678</code> (mauvais préfixe)</li>
                                        <li><code>abc123</code> (caractères)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhoneTest;