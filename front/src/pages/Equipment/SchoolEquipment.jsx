import React, { useState, useEffect } from 'react';
import EquipmentList from '../../components/Equipment/EquipmentList';
import { schoolEquipmentApi } from '../../services/schoolEquipmentApi';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import Alert from '../../components/UI/Alert';

/**
 * Page de gestion des équipements par école
 */
const SchoolEquipment = () => {
    const [selectedSchool, setSelectedSchool] = useState('');
    const [equipmentData, setEquipmentData] = useState(null);
    const [clothingData, setClothingData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Liste des écoles disponibles
    const schools = [
        { code: 'INSSAS', name: 'Institut National Supérieur des Sciences de la Santé', type: 'Santé' },
        { code: 'ESGIT', name: 'École Supérieure de Génie Informatique et Télécommunications', type: 'Informatique' },
        { code: 'ESJEC', name: 'École Supérieure de Jurisprudence et d\'Économie Commerciale', type: 'Droit/Commerce' },
        { code: 'ESSIT', name: 'École Supérieure des Sciences et Techniques Industrielles', type: 'BTP/Industrie' },
        { code: 'ISTPM', name: 'Institut Supérieur de Technologies et Perfectionnement des Métiers', type: 'Formation Pro' },
        { code: 'ISTMS', name: 'Institut Supérieur de Technologies Médico-Sanitaires', type: 'Médico-Sanitaire' }
    ];

    const loadEquipmentData = async (schoolCode) => {
        if (!schoolCode) return;

        setLoading(true);
        setError(null);

        try {
            console.log(`🔍 Chargement des équipements pour l'école: ${schoolCode}`);
            
            // Charger les équipements et vêtements en parallèle
            const [equipmentResponse, clothingResponse] = await Promise.all([
                schoolEquipmentApi.getEquipmentBySchoolCode(schoolCode),
                schoolEquipmentApi.getRequiredClothing(schoolCode)
            ]);

            console.log('📦 Réponse équipements:', equipmentResponse);
            console.log('👕 Réponse vêtements:', clothingResponse);
            
            // Debug détaillé de la structure
            console.log('🔍 Success equipments:', equipmentResponse?.success);
            console.log('🔍 Equipment data:', equipmentResponse?.data);
            console.log('🔍 Equipment by type:', equipmentResponse?.data?.equipment_by_type);
            
            console.log('🔍 Success clothing:', clothingResponse?.success);
            console.log('🔍 Clothing data:', clothingResponse?.data);
            
            // Log détaillé de la structure exacte
            console.log('🔬 STRUCTURE DÉTAILLÉE Equipment Response:');
            console.log('  - Type:', typeof equipmentResponse);
            console.log('  - Keys:', Object.keys(equipmentResponse || {}));
            if (equipmentResponse?.data) {
                console.log('  - Data keys:', Object.keys(equipmentResponse.data));
                console.log('  - Equipment by type exists:', !!equipmentResponse.data.equipment_by_type);
                if (equipmentResponse.data.equipment_by_type) {
                    console.log('  - Types disponibles:', Object.keys(equipmentResponse.data.equipment_by_type));
                    Object.keys(equipmentResponse.data.equipment_by_type).forEach(type => {
                        console.log(`    - ${type}:`, equipmentResponse.data.equipment_by_type[type].length, 'items');
                    });
                }
            }
            
            console.log('🔬 PASSING TO EQUIPMENTLIST:');
            console.log('  - equipmentData:', equipmentResponse);
            console.log('  - loading:', loading);

            setEquipmentData(equipmentResponse);
            setClothingData(clothingResponse);
        } catch (err) {
            console.error('❌ Erreur lors du chargement des équipements:', err);
            setError('Impossible de charger les équipements de cette école. Veuillez réessayer.');
            setEquipmentData(null);
            setClothingData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedSchool) {
            loadEquipmentData(selectedSchool);
        }
    }, [selectedSchool]);

    const getSchoolColor = (schoolCode) => {
        const colors = {
            'INSSAS': 'text-green-600 bg-green-50 border-green-200',
            'ESGIT': 'text-blue-600 bg-blue-50 border-blue-200',
            'ESJEC': 'text-amber-600 bg-amber-50 border-amber-200',
            'ESSIT': 'text-orange-600 bg-orange-50 border-orange-200',
            'ISTPM': 'text-purple-600 bg-purple-50 border-purple-200',
            'ISTMS': 'text-teal-600 bg-teal-50 border-teal-200'
        };
        return colors[schoolCode] || 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const getUniformBadge = (uniformType) => {
        if (uniformType === 'blouse') {
            return <Badge className="bg-green-100 text-green-800">🧥 Blouse médicale</Badge>;
        }
        if (uniformType === 'polo') {
            return <Badge className="bg-blue-100 text-blue-800">👔 Polo école</Badge>;
        }
        return null;
    };

    const calculatePricing = (data) => {
        if (!data?.success || !data.data?.equipment_by_type) return null;

        let mandatory = 0;
        let optional = 0;

        Object.values(data.data.equipment_by_type).flat().forEach(item => {
            const price = parseFloat(item.price || 0);
            if (item.is_mandatory) {
                mandatory += price;
            } else {
                optional += price;
            }
        });

        return { mandatory, optional, total: mandatory + optional };
    };

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Équipements par École
                </h1>
                <p className="text-gray-600">
                    Consultez les équipements requis (vêtements, matériel médical, équipements de sécurité) 
                    pour chaque école de l'Institut Universitaire de la Pointe.
                </p>
            </div>

            {/* Sélecteur d'école */}
            <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sélectionnez une école</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schools.map(school => (
                        <button
                            key={school.code}
                            onClick={() => setSelectedSchool(school.code)}
                            className={`text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                                selectedSchool === school.code
                                    ? getSchoolColor(school.code) + ' shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                            <div className="font-semibold text-sm mb-1">{school.code}</div>
                            <div className="text-sm font-medium mb-2">{school.name}</div>
                            <Badge size="sm" variant="secondary">{school.type}</Badge>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Affichage des erreurs */}
            {error && (
                <Alert variant="danger">
                    {error}
                </Alert>
            )}

            {/* Informations sur l'école sélectionnée */}
            {selectedSchool && clothingData?.success && (
                <Card className={getSchoolColor(selectedSchool)}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-lg">
                                {schools.find(s => s.code === selectedSchool)?.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm">Uniforme requis:</span>
                                {getUniformBadge(clothingData.data.uniform_type)}
                            </div>
                        </div>
                        
                        {equipmentData && (() => {
                            const pricing = calculatePricing(equipmentData);
                            return pricing && (
                                <div className="text-right">
                                    <div className="text-sm text-gray-600">Coût total des équipements</div>
                                    <div className="text-2xl font-bold">
                                        {new Intl.NumberFormat('fr-FR').format(pricing.total)} FCFA
                                    </div>
                                    <div className="text-xs">
                                        Obligatoire: {new Intl.NumberFormat('fr-FR').format(pricing.mandatory)} FCFA
                                        {pricing.optional > 0 && ` • Optionnel: ${new Intl.NumberFormat('fr-FR').format(pricing.optional)} FCFA`}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </Card>
            )}

            {/* Liste des équipements */}
            {selectedSchool && (
                <EquipmentList
                    equipmentData={equipmentData}
                    loading={loading}
                    showFilters={true}
                    showPricing={true}
                    title={`Équipements requis - ${selectedSchool}`}
                />
            )}

            {/* Message si aucune école sélectionnée */}
            {!selectedSchool && (
                <Card>
                    <div className="text-center text-gray-500 py-12">
                        <div className="text-6xl mb-4">🏫</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Sélectionnez une école
                        </h3>
                        <p className="text-sm">
                            Choisissez une école ci-dessus pour voir ses équipements requis
                        </p>
                    </div>
                </Card>
            )}

            {/* Légende */}
            <Card className="bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-3">Légende des équipements</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                        <span>👕</span>
                        <span>Vêtements</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span>🏥</span>
                        <span>Médical</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span>💻</span>
                        <span>Technique</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span>🦺</span>
                        <span>Sécurité</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span>📚</span>
                        <span>Académique</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SchoolEquipment;