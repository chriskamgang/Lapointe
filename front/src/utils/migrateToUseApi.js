// Script d'aide pour migrer les fichiers utilisant fetch vers useApi

export const commonFetchPatterns = [
    {
        pattern: /fetch\(host\+['"](.*?)['"], {[^}]*headers: {[^}]*'Authorization': sessionStorage\.user[^}]*}[^}]*}\)/g,
        description: "Appel GET avec autorisation",
        useApiEquivalent: "await execute(() => apiEndpoints.ENDPOINT_NAME())"
    },
    {
        pattern: /fetch\(host\+['"](.*?)['"], {method: ['"]POST['"], body: JSON\.stringify\((.*?)\), headers: {[^}]*'Content-Type': ['"]application\/json['"], ['"]Authorization['"][^}]*}[^}]*}\)/g,
        description: "Appel POST avec données JSON",
        useApiEquivalent: "await execute(() => apiEndpoints.ENDPOINT_NAME(data))"
    },
    {
        pattern: /fetch\(host\+['"](.*?)['"], {method: ['"]PUT['"], body: JSON\.stringify\((.*?)\), headers: {[^}]*'Content-Type': ['"]application\/json['"], ['"]Authorization['"][^}]*}[^}]*}\)/g,
        description: "Appel PUT avec données JSON",
        useApiEquivalent: "await execute(() => apiEndpoints.ENDPOINT_NAME(id, data))"
    },
    {
        pattern: /fetch\(host\+['"](.*?)['"], {method: ['"]DELETE['"], headers: {[^}]*'Authorization': sessionStorage\.user[^}]*}[^}]*}\)/g,
        description: "Appel DELETE avec autorisation",
        useApiEquivalent: "await execute(() => apiEndpoints.ENDPOINT_NAME(id))"
    }
];

export const requiredImports = {
    useApi: "import { useApi } from '../../hooks/useApi';",
    apiEndpoints: "import { apiEndpoints } from '../../utils/api';"
};

export const migrationSteps = [
    "1. Ajouter les imports nécessaires (useApi et apiEndpoints)",
    "2. Remplacer useState(false) loading par const { execute, loading } = useApi()",
    "3. Convertir les appels fetch en appels execute(() => apiEndpoints.METHOD())",
    "4. Remplacer .then/.catch par try/catch avec async/await",
    "5. Supprimer les imports inutiles (host depuis utils/fetch)",
    "6. Tester la fonctionnalité"
];

export const getEndpointMapping = () => ({
    // Sections
    '/sections/all': 'getAllSections',
    '/sections/store': 'addSection',
    '/sections/:id': 'getOneSection', // GET
    '/sections/:id': 'updateSection', // PUT
    '/sections/:id': 'deleteSection', // DELETE
    
    // Classes
    '/class/getAll': 'getAllClasses',
    '/class/getOAll/:id': 'getClassesBySection',
    '/class/special/:id': 'getOneClassDetails',
    '/class/:id': 'getOneClass', // GET
    '/class/add': 'addClass',
    '/class/:id': 'updateClass', // PUT
    '/class/:id': 'deleteClass', // DELETE
    
    // Students
    '/students/getAll': 'getAllStudents',
    '/students/:id': 'getStudentsByClass',
    '/students/getOrdonnedStudents/:id': 'getOrderedStudents',
    '/students/one/:id': 'getOneStudent',
    '/students/add/:id': 'addStudent',
    '/students/:id': 'updateStudent', // PUT
    '/students/:id': 'deleteStudent', // DELETE
    '/students/transfert-to': 'transferStudent',
    '/students/payments/:id': 'getStudentPayments',
    
    // Teachers
    '/teachers/getAll': 'getAllTeachers',
    '/teachers/:id': 'getOneTeacher',
    '/teachers/add': 'addTeacher',
    '/teachers/:id': 'updateTeacher', // PUT
    '/teachers/:id': 'deleteTeacher', // DELETE
    
    // Sequences
    '/seq/getAll': 'getAllSequences',
    '/seq/:id': 'getOneSequence',
    '/seq/add': 'addSequence',
    '/seq/:id': 'updateSequence', // PUT
    '/seq/:id': 'deleteSequence', // DELETE
    
    // Trimesters
    '/trim/getAll': 'getAllTrimesters',
    '/trim/:id': 'getOneTrimester',
    '/trim/add': 'addTrimester',
    '/trim/:id': 'updateTrimester', // PUT
    '/trim/:id': 'deleteTrimester', // DELETE
    
    // Settings
    '/settings/getSettings': 'getAllSettings',
    '/settings/setSettings': 'updateSettings',
    
    // Subjects/Matières
    '/subjects/all': 'getAllSubjects',
    '/subjects/:id': 'getOneSubject',
    '/subjects/add': 'addSubject',
    '/subjects/:id': 'updateSubject', // PUT
    '/subjects/:id': 'deleteSubject', // DELETE
    
    // Domains
    '/domains/all': 'getAllDomains',
    '/domains/:id': 'getOneDomain',
    '/domains/add': 'addDomain',
    '/domains/:id': 'updateDomain', // PUT
    '/domains/:id': 'deleteDomain', // DELETE
});

export const generateMigrationGuide = (filePath, fileContent) => {
    const fetchMatches = fileContent.match(/fetch\([^)]+\)/g) || [];
    const guide = {
        filePath,
        totalFetchCalls: fetchMatches.length,
        patterns: [],
        suggestedChanges: []
    };
    
    commonFetchPatterns.forEach(pattern => {
        const matches = fileContent.match(pattern.pattern);
        if (matches) {
            guide.patterns.push({
                pattern: pattern.description,
                matches: matches.length,
                example: matches[0],
                useApiEquivalent: pattern.useApiEquivalent
            });
        }
    });
    
    // Vérifier si les imports nécessaires sont présents
    if (!fileContent.includes("useApi")) {
        guide.suggestedChanges.push("Ajouter: " + requiredImports.useApi);
    }
    if (!fileContent.includes("apiEndpoints")) {
        guide.suggestedChanges.push("Ajouter: " + requiredImports.apiEndpoints);
    }
    
    return guide;
};