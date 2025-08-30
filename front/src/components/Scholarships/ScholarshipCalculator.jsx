import React, { useState, useEffect } from 'react';
import { scholarshipUtils } from '../../services/scholarshipApi';
import Card from '../UI/Card';
import Badge from '../UI/Badge';
import Button from '../UI/Button';

/**
 * Calculateur de bourse selon l'école et la mention
 */
const ScholarshipCalculator = ({ 
    schoolCode, 
    levelType, 
    onCalculated,
    showDetails = true,
    compact = false 
}) => {
    const [mentionBTS, setMentionBTS] = useState('');
    const [calculation, setCalculation] = useState(null);
    const [showCalculator, setShowCalculator] = useState(false);

    const mentions = scholarshipUtils.getBTSMentions();

    useEffect(() => {
        if (schoolCode) {
            calculateScholarship();
        }
    }, [schoolCode, levelType, mentionBTS]);

    const calculateScholarship = () => {
        const result = scholarshipUtils.calculateAmount(schoolCode, levelType, mentionBTS);
        const totalBenefits = scholarshipUtils.calculateTotalBenefits(schoolCode, levelType, mentionBTS);
        
        const fullCalculation = {
            ...result,
            totalBenefits,
            schoolCode,
            levelType,
            mentionBTS
        };
        
        setCalculation(fullCalculation);
        
        if (onCalculated) {
            onCalculated(fullCalculation);
        }
    };

    const getSchoolName = (code) => {
        const schools = {
            'INSSAS': 'Institut Supérieur Des Sciences Appliquées À La Santé',
            'ESGIT': 'École Supérieure de Génie Informatique et de Télécommunication',
            'ESJEC': 'École Supérieure de Jurisprudence et d\'Économie Commerciale',
            'ESSIT': 'École Supérieure des Sciences et Techniques Industrielles',
            'ISTPM': 'Institut Supérieur de Technologies et Perfectionnement des Métiers',
            'ISTMS': 'Institut Supérieur de Technologies Médico-Sanitaires'
        };
        return schools[code] || code;
    };

    const getScholarshipColor = (amount) => {
        if (amount >= 150000) return 'text-green-600 bg-green-50 border-green-200';
        if (amount >= 100000) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (amount >= 50000) return 'text-orange-600 bg-orange-50 border-orange-200';
        if (amount > 0) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    if (!schoolCode) {
        return (
            <Card className="p-4">
                <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">🎓</div>
                    <p>Sélectionnez une école pour voir les bourses disponibles</p>
                </div>
            </Card>
        );
    }

    if (compact && calculation) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-green-600">
                        {scholarshipUtils.formatAmount(calculation.amount)}
                    </span>
                    {calculation.laptop && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                            💻 Laptop
                        </Badge>
                    )}
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowCalculator(!showCalculator)}
                >
                    Détails
                </Button>
            </div>
        );
    }

    return (
        <Card className={`p-4 ${calculation ? getScholarshipColor(calculation.amount) : ''}`}>
            {/* En-tête */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        🎓 Bourses disponibles
                    </h3>
                    <p className="text-sm text-gray-600">
                        {getSchoolName(schoolCode)}
                    </p>
                </div>
                {schoolCode === 'ESGIT' && levelType === 'BTS' && (
                    <Badge variant="info" size="sm">
                        Mention requise
                    </Badge>
                )}
            </div>

            {/* Sélecteur de mention pour ESGIT BTS */}
            {schoolCode === 'ESGIT' && levelType === 'BTS' && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mention obtenue au BTS :
                    </label>
                    <select
                        value={mentionBTS}
                        onChange={(e) => setMentionBTS(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Sélectionnez une mention</option>
                        {mentions.map(mention => (
                            <option key={mention.value} value={mention.value}>
                                {mention.label} ({scholarshipUtils.formatAmount(mention.amount)}
                                {mention.laptop ? ' + Laptop' : ''})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Résultats du calcul */}
            {calculation && (
                <div className="space-y-4">
                    {/* Montant principal */}
                    <div className="text-center p-4 bg-white rounded-lg border">
                        <div className="text-3xl font-bold mb-1">
                            {scholarshipUtils.formatAmount(calculation.amount)}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                            {calculation.description}
                        </div>
                        
                        {/* Badges des avantages */}
                        <div className="flex justify-center gap-2 flex-wrap">
                            {calculation.amount > 0 && (
                                <Badge className="bg-green-100 text-green-800">
                                    💰 Bourse financière
                                </Badge>
                            )}
                            {calculation.laptop && (
                                <Badge className="bg-blue-100 text-blue-800">
                                    💻 Laptop offert
                                </Badge>
                            )}
                        </div>
                    </div>

                    {showDetails && (
                        <>
                            {/* Détail des avantages */}
                            {calculation.totalBenefits.details.length > 0 && (
                                <div className="bg-white rounded-lg border p-3">
                                    <h4 className="font-medium text-gray-900 mb-2">Détail des avantages :</h4>
                                    <ul className="space-y-1">
                                        {calculation.totalBenefits.details.map((detail, index) => (
                                            <li key={index} className="text-sm flex items-center gap-2">
                                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                {detail}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-2 pt-2 border-t">
                                        <div className="text-sm font-medium">
                                            Valeur totale : {scholarshipUtils.formatAmount(calculation.totalBenefits.totalValue)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Conditions d'attribution */}
                            {calculation.conditions.length > 0 && (
                                <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                                    <h4 className="font-medium text-blue-900 mb-2">Conditions requises :</h4>
                                    <ul className="space-y-1">
                                        {calculation.conditions.map((condition, index) => (
                                            <li key={index} className="text-sm text-blue-800 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                                {condition}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}

                    {/* Actions */}
                    {!compact && onCalculated && (
                        <div className="flex justify-end">
                            <Button 
                                onClick={() => onCalculated(calculation)}
                                disabled={schoolCode === 'ESGIT' && levelType === 'BTS' && !mentionBTS}
                            >
                                Appliquer cette bourse
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Cas où aucune bourse n'est disponible */}
            {calculation && calculation.amount === 0 && !calculation.laptop && (
                <div className="text-center py-4">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-gray-600">
                        Aucune bourse financière disponible pour cette formation
                    </p>
                    {schoolCode === 'ESGIT' && levelType === 'BTS' && !mentionBTS && (
                        <p className="text-sm text-orange-600 mt-1">
                            Sélectionnez votre mention BTS pour voir les bourses disponibles
                        </p>
                    )}
                </div>
            )}
        </Card>
    );
};

export default ScholarshipCalculator;