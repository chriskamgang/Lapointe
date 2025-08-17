import { secureApi } from '../utils/fetch';

// Service API pour la gestion des documents
export const documentsApi = {
    // Dossiers
    folders: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/documents/folders${queryString ? '?' + queryString : ''}`);
        },
        getTree: () => {
            return secureApi.get('/documents/folders/tree');
        },
        getTypes: () => {
            return secureApi.get('/documents/folders/types');
        },
        search: (query) => {
            return secureApi.get(`/documents/folders/search?query=${encodeURIComponent(query)}`);
        },
        getById: (id) => {
            return secureApi.get(`/documents/folders/${id}`);
        },
        create: (data) => {
            return secureApi.post('/documents/folders', data);
        },
        update: (id, data) => {
            return secureApi.put(`/documents/folders/${id}`, data);
        },
        delete: (id) => {
            return secureApi.delete(`/documents/folders/${id}`);
        }
    },

    // Documents
    documents: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/documents${queryString ? '?' + queryString : ''}`);
        },
        getStatistics: () => {
            return secureApi.get('/documents/statistics');
        },
        getTypes: () => {
            return secureApi.get('/documents/types');
        },
        getVisibilityTypes: () => {
            return secureApi.get('/documents/visibility-types');
        },
        getById: (id) => {
            return secureApi.get(`/documents/${id}`);
        },
        upload: (formData) => {
            return secureApi.post('/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
        },
        update: (id, data) => {
            return secureApi.put(`/documents/${id}`, data);
        },
        delete: (id) => {
            return secureApi.delete(`/documents/${id}`);
        },
        download: (id) => {
            return secureApi.get(`/documents/${id}/download`, {
                responseType: 'blob'
            });
        },
        toggleArchive: (id) => {
            return secureApi.post(`/documents/${id}/toggle-archive`);
        }
    }
};

export default documentsApi;