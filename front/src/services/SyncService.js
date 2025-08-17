/**
 * Service de synchronisation automatique pour les présences offline
 * Gère la synchronisation intelligente avec retry et gestion d'erreurs
 */

import offlineStorageService from './OfflineStorageService';
import { secureApiEndpoints } from '../utils/apiMigration';

class SyncService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.syncInterval = null;
        this.retryTimeout = null;
        this.listeners = new Set();
        
        // Configuration
        this.config = {
            syncIntervalMs: 30000, // 30 secondes
            maxRetryAttempts: 5,
            retryDelayMs: 5000, // 5 secondes
            batchSize: 10 // Nombre de présences à synchroniser en une fois
        };

        this.setupNetworkListeners();
    }

    /**
     * Écouter les changements de statut réseau
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 Connexion réseau restaurée');
            this.isOnline = true;
            this.notifyListeners('online');
            this.startAutoSync();
        });

        window.addEventListener('offline', () => {
            console.log('📱 Mode offline activé');
            this.isOnline = false;
            this.notifyListeners('offline');
            this.stopAutoSync();
        });
    }

    /**
     * Ajouter un listener pour les événements de sync
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notifier tous les listeners
     */
    notifyListeners(event, data = null) {
        this.listeners.forEach(callback => {
            try {
                callback({ event, data, isOnline: this.isOnline, isSyncing: this.isSyncing });
            } catch (error) {
                console.error('Erreur dans listener sync:', error);
            }
        });
    }

    /**
     * Démarrer la synchronisation automatique
     */
    startAutoSync() {
        if (!this.isOnline || this.syncInterval) {
            return;
        }

        // Sync immédiate
        this.syncPendingAttendances();

        // Puis sync périodique
        this.syncInterval = setInterval(() => {
            this.syncPendingAttendances();
        }, this.config.syncIntervalMs);

        console.log('🔄 Synchronisation automatique démarrée');
    }

    /**
     * Arrêter la synchronisation automatique
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }

        console.log('⏸️ Synchronisation automatique arrêtée');
    }

    /**
     * Synchroniser les présences en attente
     */
    async syncPendingAttendances() {
        if (!this.isOnline || this.isSyncing) {
            return;
        }

        try {
            this.isSyncing = true;
            this.notifyListeners('syncStart');

            const pendingAttendances = await offlineStorageService.getPendingAttendances();
            
            if (pendingAttendances.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`🔄 Synchronisation de ${pendingAttendances.length} présences...`);

            let syncedCount = 0;
            let errorCount = 0;

            // Traiter par batch pour éviter la surcharge
            const batches = this.chunkArray(pendingAttendances, this.config.batchSize);

            for (const batch of batches) {
                const results = await Promise.allSettled(
                    batch.map(attendance => this.syncSingleAttendance(attendance))
                );

                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        syncedCount++;
                    } else {
                        errorCount++;
                        console.error('Erreur sync:', result.reason);
                    }
                });

                // Pause entre les batches
                if (batches.length > 1) {
                    await this.delay(1000);
                }
            }

            const syncResult = {
                total: pendingAttendances.length,
                synced: syncedCount,
                errors: errorCount
            };

            this.notifyListeners('syncComplete', syncResult);
            console.log('✅ Synchronisation terminée:', syncResult);

            // Programmer un retry si il y a eu des erreurs
            if (errorCount > 0) {
                this.scheduleRetry();
            }

        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation:', error);
            this.notifyListeners('syncError', error);
            this.scheduleRetry();
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Synchroniser une présence individuelle
     */
    async syncSingleAttendance(attendance) {
        try {
            // Marquer comme en cours de sync
            await offlineStorageService.updateSyncStatus(attendance.id, 'syncing');

            // Préparer les données pour l'API
            const apiData = {
                student_qr_code: attendance.studentQrCode || attendance.studentId,
                supervisor_id: attendance.supervisorId,
                event_type: attendance.eventType || 'auto'
            };

            // Appel API
            const response = await secureApiEndpoints.supervisors.scanQR(apiData);

            if (response.success) {
                // Marquer comme synchronisé et supprimer
                await offlineStorageService.updateSyncStatus(attendance.id, 'synced');
                await offlineStorageService.deleteSyncedAttendance(attendance.id);
                
                // Si la réponse contient des infos sur l'étudiant, les ajouter au cache
                if (response.data && response.data.student) {
                    const studentToCache = {
                        id: response.data.student.id,
                        full_name: response.data.student.full_name,
                        qrCode: attendance.studentQrCode,
                        class_name: response.data.student.class_name || 'N/A'
                    };
                    await offlineStorageService.cacheStudents([studentToCache]);
                }
                
                console.log(`✅ Présence synchronisée: ${attendance.studentName || attendance.studentId}`);
                return { success: true, attendance };
            } else {
                throw new Error(response.message || 'Échec de synchronisation');
            }

        } catch (error) {
            // Marquer comme erreur avec retry si possible
            const shouldRetry = attendance.retryCount < this.config.maxRetryAttempts;
            
            await offlineStorageService.updateSyncStatus(
                attendance.id, 
                shouldRetry ? 'pending' : 'error',
                error.message
            );

            if (!shouldRetry) {
                console.error(`❌ Présence abandonnée après ${this.config.maxRetryAttempts} tentatives:`, attendance);
            }

            throw error;
        }
    }

    /**
     * Programmer un retry de synchronisation
     */
    scheduleRetry() {
        if (this.retryTimeout) {
            return;
        }

        this.retryTimeout = setTimeout(() => {
            this.retryTimeout = null;
            if (this.isOnline) {
                console.log('🔄 Retry de synchronisation...');
                this.syncPendingAttendances();
            }
        }, this.config.retryDelayMs);
    }

    /**
     * Synchronisation manuelle forcée
     */
    async forcSync() {
        if (!this.isOnline) {
            throw new Error('Synchronisation impossible: mode offline');
        }

        console.log('🔄 Synchronisation manuelle déclenchée');
        await this.syncPendingAttendances();
    }

    /**
     * Précharger les données critiques en cache
     */
    async preloadCache() {
        if (!this.isOnline) {
            console.log('📱 Mode offline: impossible de précharger le cache');
            return;
        }

        try {
            console.log('📦 Préchargement du cache...');

            // Pour l'instant, nous utilisons un cache progressif
            // Les étudiants seront ajoutés au cache au fur et à mesure des scans
            // TODO: Implémenter l'API pour récupérer la liste des étudiants actifs
            
            // Simuler un préchargement avec quelques étudiants d'exemple
            const mockStudents = [
                {
                    id: 1,
                    full_name: 'Jean Dupont',
                    qrCode: 'STUDENT_001',
                    class_name: 'CP'
                },
                {
                    id: 2,
                    full_name: 'Marie Martin',
                    qrCode: 'STUDENT_002', 
                    class_name: 'CE1'
                },
                {
                    id: 3,
                    full_name: 'Pierre Durand',
                    qrCode: 'STUDENT_003',
                    class_name: 'CE2'
                }
            ];

            await offlineStorageService.cacheStudents(mockStudents);

            console.log('✅ Cache préchargé avec des données d\'exemple');
            this.notifyListeners('cachePreloaded');

        } catch (error) {
            console.error('❌ Erreur lors du préchargement:', error);
        }
    }

    /**
     * Obtenir les statistiques de synchronisation
     */
    async getSyncStats() {
        const storageStats = await offlineStorageService.getStorageStats();
        
        return {
            ...storageStats,
            isSyncing: this.isSyncing,
            autoSyncActive: !!this.syncInterval,
            config: this.config
        };
    }

    /**
     * Utilitaire: diviser un tableau en chunks
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Utilitaire: délai async
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Nettoyer le service
     */
    destroy() {
        this.stopAutoSync();
        this.listeners.clear();
        window.removeEventListener('online', this.setupNetworkListeners);
        window.removeEventListener('offline', this.setupNetworkListeners);
    }
}

// Instance singleton
const syncService = new SyncService();

export default syncService;