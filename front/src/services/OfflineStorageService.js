/**
 * Service de stockage offline pour les présences
 * Utilise IndexedDB pour persister les données localement
 */

class OfflineStorageService {
    constructor() {
        this.dbName = 'AttendanceOfflineDB';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * Initialiser la base de données IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Erreur lors de l\'ouverture d\'IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialisé avec succès');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Store pour les scans de présence en attente de sync
                if (!db.objectStoreNames.contains('pendingAttendances')) {
                    const attendanceStore = db.createObjectStore('pendingAttendances', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    attendanceStore.createIndex('timestamp', 'timestamp', { unique: false });
                    attendanceStore.createIndex('studentId', 'studentId', { unique: false });
                    attendanceStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Store pour les données d'étudiants (cache)
                if (!db.objectStoreNames.contains('studentsCache')) {
                    const studentsStore = db.createObjectStore('studentsCache', {
                        keyPath: 'id'
                    });
                    studentsStore.createIndex('qrCode', 'qrCode', { unique: false });
                    studentsStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
                }

                // Store pour les paramètres offline
                if (!db.objectStoreNames.contains('offlineSettings')) {
                    db.createObjectStore('offlineSettings', {
                        keyPath: 'key'
                    });
                }

                console.log('🔄 Schéma IndexedDB créé/mis à jour');
            };
        });
    }

    /**
     * Sauvegarder un scan de présence offline
     */
    async savePendingAttendance(attendanceData) {
        await this.init();
        
        const transaction = this.db.transaction(['pendingAttendances'], 'readwrite');
        const store = transaction.objectStore('pendingAttendances');

        const pendingRecord = {
            ...attendanceData,
            timestamp: new Date().toISOString(),
            syncStatus: 'pending', // pending, syncing, synced, error
            retryCount: 0,
            lastError: null
        };

        return new Promise((resolve, reject) => {
            const request = store.add(pendingRecord);
            
            request.onsuccess = () => {
                console.log('📱 Présence sauvegardée offline:', pendingRecord);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('❌ Erreur sauvegarde offline:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Récupérer les présences en attente de synchronisation
     */
    async getPendingAttendances() {
        await this.init();
        
        const transaction = this.db.transaction(['pendingAttendances'], 'readonly');
        const store = transaction.objectStore('pendingAttendances');
        const index = store.index('syncStatus');

        return new Promise((resolve, reject) => {
            const request = index.getAll('pending');
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Mettre à jour le statut de synchronisation
     */
    async updateSyncStatus(attendanceId, status, error = null) {
        await this.init();
        
        const transaction = this.db.transaction(['pendingAttendances'], 'readwrite');
        const store = transaction.objectStore('pendingAttendances');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(attendanceId);
            
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.syncStatus = status;
                    record.lastError = error;
                    record.retryCount = (record.retryCount || 0) + (status === 'error' ? 1 : 0);
                    record.lastSyncAttempt = new Date().toISOString();

                    const putRequest = store.put(record);
                    putRequest.onsuccess = () => resolve(record);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Record not found'));
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Supprimer une présence synchronisée
     */
    async deleteSyncedAttendance(attendanceId) {
        await this.init();
        
        const transaction = this.db.transaction(['pendingAttendances'], 'readwrite');
        const store = transaction.objectStore('pendingAttendances');

        return new Promise((resolve, reject) => {
            const request = store.delete(attendanceId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Mettre en cache les données d'étudiants
     */
    async cacheStudents(students) {
        await this.init();
        
        const transaction = this.db.transaction(['studentsCache'], 'readwrite');
        const store = transaction.objectStore('studentsCache');

        const promises = students.map(student => {
            const cacheRecord = {
                ...student,
                lastUpdated: new Date().toISOString()
            };

            return new Promise((resolve, reject) => {
                const request = store.put(cacheRecord);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });

        await Promise.all(promises);
        console.log(`📦 ${students.length} étudiants mis en cache`);
    }

    /**
     * Récupérer un étudiant depuis le cache
     */
    async getStudentFromCache(qrCode) {
        await this.init();
        
        const transaction = this.db.transaction(['studentsCache'], 'readonly');
        const store = transaction.objectStore('studentsCache');
        const index = store.index('qrCode');

        return new Promise((resolve, reject) => {
            const request = index.get(qrCode);
            
            request.onsuccess = () => {
                const student = request.result;
                if (student) {
                    // Vérifier si le cache n'est pas trop ancien (24h)
                    const cacheAge = Date.now() - new Date(student.lastUpdated).getTime();
                    const maxAge = 24 * 60 * 60 * 1000; // 24 heures
                    
                    if (cacheAge < maxAge) {
                        resolve(student);
                    } else {
                        resolve(null); // Cache expiré
                    }
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Sauvegarder les paramètres offline
     */
    async saveSetting(key, value) {
        await this.init();
        
        const transaction = this.db.transaction(['offlineSettings'], 'readwrite');
        const store = transaction.objectStore('offlineSettings');

        const setting = { key, value, timestamp: new Date().toISOString() };

        return new Promise((resolve, reject) => {
            const request = store.put(setting);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Récupérer un paramètre offline
     */
    async getSetting(key) {
        await this.init();
        
        const transaction = this.db.transaction(['offlineSettings'], 'readonly');
        const store = transaction.objectStore('offlineSettings');

        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtenir les statistiques de stockage offline
     */
    async getStorageStats() {
        await this.init();
        
        const pendingCount = await this.getPendingAttendances().then(data => data.length);
        const cacheSize = await new Promise((resolve) => {
            const transaction = this.db.transaction(['studentsCache'], 'readonly');
            const store = transaction.objectStore('studentsCache');
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
        });

        return {
            pendingAttendances: pendingCount,
            cachedStudents: cacheSize,
            isOnline: navigator.onLine,
            dbVersion: this.dbVersion
        };
    }

    /**
     * Nettoyer le stockage offline
     */
    async cleanup() {
        await this.init();
        
        // Supprimer les enregistrements synchronisés depuis plus de 7 jours
        const transaction = this.db.transaction(['pendingAttendances'], 'readwrite');
        const store = transaction.objectStore('pendingAttendances');
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        return new Promise((resolve, reject) => {
            const request = store.openCursor();
            let deletedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const record = cursor.value;
                    if (record.syncStatus === 'synced' && 
                        new Date(record.timestamp) < cutoffDate) {
                        cursor.delete();
                        deletedCount++;
                    }
                    cursor.continue();
                } else {
                    console.log(`🧹 Nettoyage terminé: ${deletedCount} enregistrements supprimés`);
                    resolve(deletedCount);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
}

// Singleton instance
const offlineStorageService = new OfflineStorageService();

export default offlineStorageService;