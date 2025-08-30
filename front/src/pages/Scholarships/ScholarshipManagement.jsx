import React, { useState, useEffect } from 'react';
import { scholarshipApi, scholarshipUtils } from '../../services/scholarshipApi';
import ScholarshipCalculator from '../../components/Scholarships/ScholarshipCalculator';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { Search, Filter, Download, Calculator, Award, Laptop } from 'react-bootstrap-icons';

const ScholarshipManagement = () => {
    const [scholarships, setScholarships] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCalculator, setShowCalculator] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [filters, setFilters] = useState({
        school_code: '',
        level_type: '',
        status: 'active',
        search: ''
    });

    const schools = [
        { code: 'INSSAS', name: 'Sciences de la Santé', color: 'bg-green-50 text-green-700' },
        { code: 'ESGIT', name: 'Informatique & Télécoms', color: 'bg-blue-50 text-blue-700' },
        { code: 'ESJEC', name: 'Commerce & Juridique', color: 'bg-yellow-50 text-yellow-700' },
        { code: 'ESSIT', name: 'Sciences Industrielles', color: 'bg-orange-50 text-orange-700' },
        { code: 'ISTPM', name: 'Formations Professionnelles', color: 'bg-purple-50 text-purple-700' },
        { code: 'ISTMS', name: 'Médico-Sanitaires', color: 'bg-teal-50 text-teal-700' }
    ];

    const levelTypes = ['BTS', 'HND', 'LICENCE_ACA', 'LICENCE_PRO', 'PROFESSIONAL_LICENSE', 'BACHELOR', 'MASTER'];

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [scholarshipsResponse, statsResponse] = await Promise.all([
                scholarshipApi.getAllScholarships(filters),
                scholarshipApi.getScholarshipStats()
            ]);

            if (scholarshipsResponse.success) {
                setScholarships(scholarshipsResponse.data || []);
            }

            if (statsResponse.success) {
                setStats(statsResponse.data);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des bourses:', err);
            setError('Impossible de charger les données des bourses.');
        } finally {
            setLoading(false);
        }
    };

    const generateScholarshipReport = () => {
        // Logique d'export des bourses
        console.log('Génération du rapport des bourses...');
    };

    const SchoolScholarshipCard = ({ school }) => {
        const scholarship = scholarshipUtils.calculateAmount(school.code, 'BTS');
        const totalBenefits = scholarshipUtils.calculateTotalBenefits(school.code, 'BTS');

        return (
            <Card className={`p-4 ${school.color} border-l-4 border-l-blue-500`}>
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-lg">{school.code}</h3>
                        <p className="text-sm opacity-80">{school.name}</p>
                    </div>
                    <Badge variant={scholarship.amount > 0 ? "success" : "secondary"} size="sm">
                        {scholarship.amount > 0 ? 'Bourses actives' : 'Laptops seulement'}
                    </Badge>
                </div>

                <div className="space-y-2">
                    {/* Bourse financière */}
                    <div className="flex justify-between items-center">
                        <span className="text-sm">💰 Bourse max:</span>
                        <span className="font-medium">
                            {scholarshipUtils.formatAmount(scholarship.amount)}
                        </span>
                    </div>

                    {/* Laptop */}
                    <div className="flex justify-between items-center">
                        <span className="text-sm">💻 Laptop:</span>
                        <span className="font-medium">
                            {scholarship.laptop || school.code !== 'ISTMS' ? '🎁 Gratuit' : 'Non inclus'}
                        </span>
                    </div>

                    {/* Conditions spéciales */}
                    {school.code === 'ESGIT' && (
                        <div className="text-xs bg-white bg-opacity-50 p-2 rounded mt-2">
                            <strong>ESGIT:</strong> Bourses pour diplômés BTS (50,000 à 150,000 FCFA selon mention obtenue)
                        </div>
                    )}

                    {school.code === 'ISTPM' && (
                        <div className="text-xs bg-white bg-opacity-50 p-2 rounded mt-2">
                            <strong>ISTPM:</strong> 25,000 FCFA fixe pour tous
                        </div>
                    )}

                    {school.code === 'INSSAS' && (
                        <div className="text-xs bg-white bg-opacity-50 p-2 rounded mt-2">
                            <strong>INSSAS:</strong> 150,000 FCFA + laptop automatique
                        </div>
                    )}
                </div>

                <div className="mt-3 pt-3 border-t border-white border-opacity-30">
                    <div className="flex justify-between items-center text-sm">
                        <span>Bourse max:</span>
                        <span className="font-bold">
                            {scholarshipUtils.formatAmount(totalBenefits.totalFinancialValue)}
                        </span>
                    </div>
                    {totalBenefits.laptopOffered && (
                        <div className="flex justify-between items-center text-xs mt-1">
                            <span>+ Laptop:</span>
                            <span className="font-medium text-blue-800">🎁 Gratuit</span>
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestion des Bourses IUP</h1>
                    <p className="text-gray-600 mt-1">
                        Système de bourses et avantages de l'Institut Universitaire de la Pointe
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => setShowCalculator(true)}
                        className="flex items-center gap-2"
                    >
                        <Calculator size={16} />
                        Calculateur
                    </Button>
                    <Button 
                        onClick={generateScholarshipReport}
                        className="flex items-center gap-2"
                    >
                        <Download size={16} />
                        Rapport
                    </Button>
                </div>
            </div>

            {/* Statistiques générales */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">{stats.total_students || 0}</div>
                        <div className="text-sm text-gray-600">Étudiants éligibles</div>
                    </Card>
                    <Card className="p-4 text-center">
                        <div className="text-3xl font-bold text-blue-600">{stats.total_amount || 0}</div>
                        <div className="text-sm text-gray-600">Total bourses (MFCFA)</div>
                    </Card>
                    <Card className="p-4 text-center">
                        <div className="text-3xl font-bold text-purple-600">{stats.laptops_distributed || 0}</div>
                        <div className="text-sm text-gray-600">Laptops distribués</div>
                    </Card>
                    <Card className="p-4 text-center">
                        <div className="text-3xl font-bold text-orange-600">6</div>
                        <div className="text-sm text-gray-600">Écoles participantes</div>
                    </Card>
                </div>
            )}

            {/* Aperçu des bourses par école */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Bourses par École</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schools.map(school => (
                        <SchoolScholarshipCard key={school.code} school={school} />
                    ))}
                </div>
            </div>

            {/* Règles et critères */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="text-yellow-500" />
                    Règles d'Attribution des Bourses IUP
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3">💰 Bourses Financières</h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full mt-2"></span>
                                <div>
                                    <strong>INSSAS:</strong> 150,000 FCFA automatique pour toutes les formations santé
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2"></span>
                                <div>
                                    <strong>ESGIT:</strong> 50,000 à 150,000 FCFA pour diplômés BTS selon mention obtenue (poursuite d'études)
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-2 h-2 bg-purple-400 rounded-full mt-2"></span>
                                <div>
                                    <strong>ISTPM:</strong> 25,000 FCFA fixe pour toutes les formations courtes
                                </div>
                            </li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3">💻 Laptops Offerts Gratuitement</h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full mt-2"></span>
                                <div>
                                    <strong>INSSAS:</strong> Laptop gratuit automatiquement avec inscription
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2"></span>
                                <div>
                                    <strong>ESGIT:</strong> Laptop gratuit pour mention BTS "Très Bien" uniquement
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></span>
                                <div>
                                    <strong>ESJEC/ESSIT:</strong> Laptop gratuit pour toutes les formations
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2"></span>
                                <div>
                                    <strong>ISTPM/ISTMS:</strong> Pas de laptop inclus
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </Card>

            {/* Erreurs */}
            {error && (
                <Alert variant="danger">
                    {error}
                </Alert>
            )}

            {/* Calculateur modal */}
            {showCalculator && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Calculateur de Bourses</h2>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setShowCalculator(false)}
                                >
                                    ✕ Fermer
                                </Button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            École
                                        </label>
                                        <select
                                            value={selectedSchool}
                                            onChange={(e) => setSelectedSchool(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Sélectionnez une école</option>
                                            {schools.map(school => (
                                                <option key={school.code} value={school.code}>
                                                    {school.code} - {school.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Niveau
                                        </label>
                                        <select
                                            value={selectedLevel}
                                            onChange={(e) => setSelectedLevel(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Sélectionnez un niveau</option>
                                            {levelTypes.map(level => (
                                                <option key={level} value={level}>
                                                    {level}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <ScholarshipCalculator 
                                    schoolCode={selectedSchool}
                                    levelType={selectedLevel}
                                    onCalculated={(result) => {
                                        console.log('Bourse calculée:', result);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScholarshipManagement;