import React from 'react';
import { scholarshipUtils } from '../../services/scholarshipApi';
import Card from '../UI/Card';
import Badge from '../UI/Badge';

/**
 * Carte d'affichage des bourses d'un étudiant
 */
const StudentScholarshipCard = ({ student, compact = false }) => {
    if (!student) return null;

    const schoolCode = student.school?.code || student.school_code;
    const levelType = student.level?.level_type || student.level_type;
    const mentionBTS = student.mention_bts || student.bts_mention;
    
    // Calculer la bourse de l'étudiant
    const scholarship = scholarshipUtils.calculateAmount(schoolCode, levelType, mentionBTS);
    const totalBenefits = scholarshipUtils.calculateTotalBenefits(schoolCode, levelType, mentionBTS);

    const getSchoolName = (code) => {
        const schools = {
            'INSSAS': 'INSSAS - Sciences de la Santé',
            'ESGIT': 'ESGIT - Informatique & Télécoms',
            'ESJEC': 'ESJEC - Commerce & Juridique',
            'ESSIT': 'ESSIT - Sciences Industrielles',
            'ISTPM': 'ISTPM - Formations Professionnelles',
            'ISTMS': 'ISTMS - Médico-Sanitaires'
        };
        return schools[code] || code;
    };

    const getScholarshipBadgeColor = (amount) => {
        if (amount >= 150000) return 'success';
        if (amount >= 100000) return 'primary';
        if (amount >= 50000) return 'warning';
        if (amount > 0) return 'info';
        return 'secondary';
    };

    if (compact) {
        return (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                <div>
                    <div className="font-medium text-gray-900">Bourses & Avantages</div>
                    <div className="text-sm text-gray-600">{getSchoolName(schoolCode)}</div>
                </div>
                <div className="flex items-center gap-2">
                    {scholarship.amount > 0 && (
                        <Badge variant={getScholarshipBadgeColor(scholarship.amount)}>
                            💰 {scholarshipUtils.formatAmount(scholarship.amount)}
                        </Badge>
                    )}
                    {scholarship.laptop && (
                        <Badge variant="info">
                            💻 Laptop
                        </Badge>
                    )}
                    {scholarship.amount === 0 && !scholarship.laptop && (
                        <Badge variant="secondary">
                            Aucune bourse
                        </Badge>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Card className="p-4">
            {/* En-tête */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        🎓 Bourses et Avantages
                        {scholarship.amount > 0 || scholarship.laptop ? (
                            <Badge variant="success" size="sm">Éligible</Badge>
                        ) : (
                            <Badge variant="secondary" size="sm">Non éligible</Badge>
                        )}
                    </h3>
                    <p className="text-sm text-gray-600">
                        {getSchoolName(schoolCode)} - {levelType}
                        {mentionBTS && ` (Mention: ${mentionBTS})`}
                    </p>
                </div>
            </div>

            {/* Détails des avantages */}
            <div className="space-y-4">
                {scholarship.amount > 0 || scholarship.laptop ? (
                    <>
                        {/* Bourse financière */}
                        {scholarship.amount > 0 && (
                            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-green-900">Bourse financière</h4>
                                        <p className="text-sm text-green-700">{scholarship.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-green-600">
                                            {scholarshipUtils.formatAmount(scholarship.amount)}
                                        </div>
                                        {schoolCode === 'ESGIT' && mentionBTS && (
                                            <div className="text-xs text-green-600">
                                                Basé sur mention BTS
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Laptop */}
                        {scholarship.laptop && (
                            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-blue-900">💻 Laptop offert</h4>
                                        <p className="text-sm text-blue-700">
                                            Ordinateur portable gratuit pour vos études
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-semibold text-blue-600">
                                            🎁 GRATUIT
                                        </div>
                                        <div className="text-xs text-blue-600">
                                            Remise lors de l'inscription
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Récapitulatif */}
                        <div className="bg-gray-50 rounded-lg border p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Récapitulatif des avantages</h4>
                            <div className="space-y-2">
                                {totalBenefits.details.map((detail, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                        <span>{detail}</span>
                                    </div>
                                ))}
                                <div className="border-t pt-2">
                                    <div className="flex justify-between font-semibold">
                                        <span>Total bourse financière:</span>
                                        <span className="text-green-600">
                                            {scholarshipUtils.formatAmount(totalBenefits.totalFinancialValue)}
                                        </span>
                                    </div>
                                    {totalBenefits.laptopOffered && (
                                        <div className="flex justify-between text-sm mt-1">
                                            <span>+ Laptop offert:</span>
                                            <span className="text-blue-600 font-medium">🎁 GRATUIT</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Conditions */}
                        {scholarship.conditions.length > 0 && (
                            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                                <h4 className="font-medium text-yellow-900 mb-2">⚠️ Conditions à respecter</h4>
                                <ul className="space-y-1">
                                    {scholarship.conditions.map((condition, index) => (
                                        <li key={index} className="text-sm text-yellow-800 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                                            {condition}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                    /* Aucune bourse disponible */
                    <div className="text-center py-8">
                        <div className="text-4xl mb-3">💼</div>
                        <h4 className="font-medium text-gray-900 mb-2">
                            Aucune bourse disponible
                        </h4>
                        <p className="text-sm text-gray-600">
                            Cette formation ne donne pas droit aux bourses IUP.
                        </p>
                        {schoolCode === 'ESGIT' && levelType === 'BTS' && !mentionBTS && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                    💡 <strong>Info ESGIT:</strong> Les étudiants BTS peuvent bénéficier de bourses 
                                    selon leur mention (50,000 à 150,000 FCFA + laptop possible).
                                    Ajoutez votre mention BTS dans votre profil.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions selon l'école */}
            {(scholarship.amount > 0 || scholarship.laptop) && (
                <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                            Bourses IUP - {new Date().getFullYear()}
                        </div>
                        <div className="flex gap-2">
                            {schoolCode === 'ESGIT' && levelType === 'BTS' && (
                                <Badge variant="info" size="sm">
                                    Mention: {mentionBTS || 'Non renseignée'}
                                </Badge>
                            )}
                            <Badge variant="success" size="sm">
                                ✅ Éligible
                            </Badge>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default StudentScholarshipCard;