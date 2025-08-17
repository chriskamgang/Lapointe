/**
 * Hook personnalisé pour la gestion du mode offline
 * Fournit l'état réseau, synchronisation et stockage local
 */

import { useState, useEffect, useCallback } from 'react';
import offlineStorageService from '../services/OfflineStorageService';
import syncService from '../services/SyncService';

export const useOfflineMode = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStats, setSyncStats] = useState({
        pendingAttendances: 0,
        cachedStudents: 0,
        lastSync: null
    });
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error

    // Écouter les événements de synchronisation
    useEffect(() => {
        const unsubscribe = syncService.addListener((event) => {
            setIsOnline(event.isOnline);
            setIsSyncing(event.isSyncing);

            switch (event.event) {
                case 'online':
                    setSyncStatus('idle');
                    break;
                case 'offline':
                    setSyncStatus('offline');
                    break;
                case 'syncStart':
                    setSyncStatus('syncing');
                    break;
                case 'syncComplete':
                    setSyncStatus('success');
                    loadSyncStats();
                    break;
                case 'syncError':
                    setSyncStatus('error');
                    break;
                default:
                    break;
            }
        });

        return unsubscribe;
    }, []);

    // Charger les statistiques de synchronisation
    const loadSyncStats = useCallback(async () => {
        try {
            const stats = await syncService.getSyncStats();
            setSyncStats(stats);
        } catch (error) {
            console.error('Erreur lors du chargement des stats:', error);
        }
    }, []);

    // Initialisation
    useEffect(() => {
        const initialize = async () => {
            try {
                await offlineStorageService.init();
                await loadSyncStats();
                
                if (isOnline) {
                    syncService.startAutoSync();
                    // Précharger le cache si nécessaire
                    if (syncStats.cachedStudents === 0) {
                        await syncService.preloadCache();
                    }
                }
            } catch (error) {
                console.error('Erreur d\'initialisation offline mode:', error);
            }
        };

        initialize();
    }, [isOnline, loadSyncStats]);

    /**
     * Sauvegarder une présence offline
     */
    const saveAttendanceOffline = useCallback(async (attendanceData) => {
        try {
            const offlineRecord = {
                studentId: attendanceData.studentId,
                studentName: attendanceData.studentName,
                studentQrCode: attendanceData.studentQrCode,
                supervisorId: attendanceData.supervisorId,
                eventType: attendanceData.eventType || 'auto',
                scannedAt: new Date().toISOString(),
                isPresent: attendanceData.isPresent !== false,
                notes: attendanceData.notes || ''
            };

            const id = await offlineStorageService.savePendingAttendance(offlineRecord);
            await loadSyncStats();
            
            return { success: true, id, offline: true };
        } catch (error) {
            console.error('Erreur sauvegarde offline:', error);
            throw error;
        }
    }, [loadSyncStats]);

    /**
     * Obtenir un étudiant depuis le cache
     */
    const getStudentFromCache = useCallback(async (qrCode) => {
        try {
            return await offlineStorageService.getStudentFromCache(qrCode);
        } catch (error) {
            console.error('Erreur accès cache étudiant:', error);
            return null;
        }
    }, []);

    /**
     * Forcer la synchronisation
     */
    const forceSync = useCallback(async () => {
        try {
            if (!isOnline) {
                throw new Error('Synchronisation impossible en mode offline');
            }
            await syncService.forcSync();
        } catch (error) {
            console.error('Erreur synchronisation forcée:', error);
            throw error;
        }
    }, [isOnline]);

    /**
     * Précharger le cache manuellement
     */
    const preloadCache = useCallback(async () => {
        try {
            if (!isOnline) {
                throw new Error('Préchargement impossible en mode offline');
            }
            await syncService.preloadCache();
            await loadSyncStats();
        } catch (error) {
            console.error('Erreur préchargement cache:', error);
            throw error;
        }
    }, [isOnline, loadSyncStats]);

    /**
     * Nettoyer le stockage local
     */
    const cleanupStorage = useCallback(async () => {
        try {
            const deletedCount = await offlineStorageService.cleanup();
            await loadSyncStats();
            return deletedCount;
        } catch (error) {
            console.error('Erreur nettoyage stockage:', error);
            throw error;
        }
    }, [loadSyncStats]);

    /**
     * Obtenir les présences en attente
     */
    const getPendingAttendances = useCallback(async () => {
        try {
            return await offlineStorageService.getPendingAttendances();
        } catch (error) {
            console.error('Erreur récupération présences en attente:', error);
            return [];
        }
    }, []);

    return {
        // État
        isOnline,
        isSyncing,
        syncStats,
        syncStatus,
        
        // Actions
        saveAttendanceOffline,
        getStudentFromCache,
        forceSync,
        preloadCache,
        cleanupStorage,
        getPendingAttendances,
        
        // Utilitaires
        loadSyncStats
    };
};