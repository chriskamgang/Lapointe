import { useState, useCallback, useEffect } from 'react';
import { apiEndpoints, handleApiError } from '../utils/api';

/**
 * Hook personnalisé pour gérer les appels API avec état de chargement et gestion d'erreurs
 */
export const useApi = (apiFunction, dependencies = [], options = {}) => {
    const {
        immediate = true,
        showErrorMessage = true,
        onSuccess,
        onError
    } = options;

    // 🔥 Ajoutez cette vérification
    useEffect(() => {
        if (immediate && (!apiFunction || typeof apiFunction !== 'function')) {
            console.error('❌ apiFunction doit être une fonction, reçu :', apiFunction);
        }
    }, [apiFunction, immediate]);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (...args) => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await apiFunction(...args);
            setData(result);
            
            if (onSuccess) {
                onSuccess(result);
            }
            
            return result;
        } catch (err) {
            setError(err);
            
            if (onError) {
                onError(err);
            } else {
                handleApiError(err, showErrorMessage);
            }
            
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiFunction, onSuccess, onError, showErrorMessage]);

    useEffect(() => {
        if (immediate && apiFunction) {
            execute();
        }
    }, [dependencies, execute, immediate, apiFunction]);

    const refetch = useCallback(() => execute(), [execute]);

    return {
        data,
        loading,
        error,
        execute,
        refetch
    };
};

/**
 * Hook pour les opérations CRUD avec gestion automatique des états
 */
export const useCrudApi = (entityName, apiMethods) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [operationLoading, setOperationLoading] = useState({});

    // Charger tous les éléments
    const loadItems = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiMethods.getAll();
            setItems(Array.isArray(result) ? result : []);
        } catch (err) {
            setError(err);
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    }, [apiMethods]);

    // Ajouter un élément
    const addItem = useCallback(async (data) => {
        try {
            setOperationLoading(prev => ({ ...prev, add: true }));
            setError(null);
            
            const newItem = await apiMethods.add(data);
            setItems(prev => [...prev, newItem]);
            
            if (window.Swal) {
                window.Swal.fire({
                    title: 'Succès',
                    text: `${entityName} ajouté(e) avec succès`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
            
            return newItem;
        } catch (err) {
            setError(err);
            handleApiError(err);
            throw err;
        } finally {
            setOperationLoading(prev => ({ ...prev, add: false }));
        }
    }, [apiMethods, entityName]);

    // Mettre à jour un élément
    const updateItem = useCallback(async (id, data) => {
        try {
            setOperationLoading(prev => ({ ...prev, [`update_${id}`]: true }));
            setError(null);
            
            const updatedItem = await apiMethods.update(id, data);
            setItems(prev => prev.map(item => 
                item.id === id ? { ...item, ...updatedItem } : item
            ));
            
            if (window.Swal) {
                window.Swal.fire({
                    title: 'Succès',
                    text: `${entityName} modifié(e) avec succès`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
            
            return updatedItem;
        } catch (err) {
            setError(err);
            handleApiError(err);
            throw err;
        } finally {
            setOperationLoading(prev => ({ ...prev, [`update_${id}`]: false }));
        }
    }, [apiMethods, entityName]);

    // Supprimer un élément avec confirmation
    const deleteItem = useCallback(async (id) => {
        if (!window.Swal) {
            if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ce ${entityName} ?`)) {
                return;
            }
        } else {
            const result = await window.Swal.fire({
                title: 'Confirmation',
                text: `Êtes-vous sûr de vouloir supprimer ce ${entityName} ?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Oui, supprimer',
                cancelButtonText: 'Annuler'
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        try {
            setOperationLoading(prev => ({ ...prev, [`delete_${id}`]: true }));
            setError(null);
            
            await apiMethods.delete(id);
            setItems(prev => prev.filter(item => item.id !== id));
            
            if (window.Swal) {
                window.Swal.fire({
                    title: 'Supprimé',
                    text: `${entityName} supprimé(e) avec succès`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            setError(err);
            handleApiError(err);
            throw err;
        } finally {
            setOperationLoading(prev => ({ ...prev, [`delete_${id}`]: false }));
        }
    }, [apiMethods, entityName]);

    // Charger les données au montage
    useEffect(() => {
        loadItems();
    }, [loadItems]);

    return {
        items,
        loading,
        error,
        operationLoading,
        loadItems,
        addItem,
        updateItem,
        deleteItem,
        refetch: loadItems
    };
};

/**
 * Hooks spécifiques pour chaque entité
 */
export const useTeachers = () => {
    return useCrudApi('enseignant', {
        getAll: apiEndpoints.getAllTeachers,
        add: apiEndpoints.addTeacher,
        update: apiEndpoints.updateTeacher,
        delete: apiEndpoints.deleteTeacher
    });
};

export const useStudents = (classId) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOrdered, setIsOrdered] = useState(
        localStorage.getItem('isOrdonned') === 'true'
    );

    const loadStudents = useCallback(async () => {
        if (!classId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const result = isOrdered 
                ? await apiEndpoints.getOrderedStudents(classId)
                : await apiEndpoints.getStudentsByClass(classId);
                
            setStudents(Array.isArray(result) ? result : []);
        } catch (err) {
            setError(err);
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    }, [classId, isOrdered]);

    const toggleOrder = useCallback(() => {
        const newValue = !isOrdered;
        setIsOrdered(newValue);
        localStorage.setItem('isOrdonned', newValue.toString());
    }, [isOrdered]);

    const deleteStudent = useCallback(async (id) => {
        if (!window.Swal) {
            if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet étudiant ?')) {
                return;
            }
        } else {
            const result = await window.Swal.fire({
                title: 'Confirmation',
                text: 'Êtes-vous sûr de vouloir supprimer cet étudiant ?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Oui, supprimer',
                cancelButtonText: 'Annuler'
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        try {
            await apiEndpoints.deleteStudent(id);
            setStudents(prev => prev.filter(student => student.id !== id));
            
            if (window.Swal) {
                window.Swal.fire({
                    title: 'Supprimé',
                    text: 'Étudiant supprimé avec succès',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            handleApiError(err);
        }
    }, []);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    return {
        students,
        loading,
        error,
        isOrdered,
        loadStudents,
        toggleOrder,
        deleteStudent,
        refetch: loadStudents
    };
};

export const useClasses = () => {
    return useCrudApi('classe', {
        getAll: apiEndpoints.getAllClasses,
        add: apiEndpoints.addClass,
        update: apiEndpoints.updateClass,
        delete: apiEndpoints.deleteClass
    });
};

export const useSchools = () => {
    return useCrudApi('school', {
        getAll: apiEndpoints.getAllSchools,
        add: apiEndpoints.addSection,
        update: apiEndpoints.updateSection,
        delete: apiEndpoints.deleteSection
    });
};

export const useSequences = () => {
    return useCrudApi('séquence', {
        getAll: apiEndpoints.getAllSequences,
        add: apiEndpoints.addSequence,
        update: apiEndpoints.updateSequence,
        delete: apiEndpoints.deleteSequence
    });
};

export const useTrimesters = () => {
    return useCrudApi('trimestre', {
        getAll: apiEndpoints.getAllTrimesters,
        add: apiEndpoints.addTrimester,
        update: apiEndpoints.updateTrimester,
        delete: apiEndpoints.deleteTrimester
    });
};

export default useApi;