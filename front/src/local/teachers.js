const teachers = {
    fr: {
        // Navigation
        teachers: "Enseignants",
        teacher_management: "Gestion des Enseignants",
        new_teacher: "Nouvel Enseignant",
        edit_teacher: "Modifier l'Enseignant",
        
        // Tabs
        personal_info: "Informations personnelles",
        professional_info: "Informations professionnelles",
        user_account: "Compte utilisateur",
        assignments: "Assignations",
        
        // Personal Fields
        first_name: "Prénom",
        last_name: "Nom de famille",
        phone_number: "Numéro de téléphone",
        email: "Email",
        address: "Adresse",
        date_of_birth: "Date de naissance",
        gender: "Genre",
        male: "Masculin",
        female: "Féminin",
        
        // Professional Fields
        qualification: "Qualification/Diplôme",
        hire_date: "Date d'embauche",
        status: "Statut",
        active: "Actif",
        inactive: "Inactif",
        
        // User Account
        create_user_account: "Créer un compte utilisateur pour cet enseignant",
        username: "Nom d'utilisateur",
        password: "Mot de passe",
        user_account_info: "Permet à l'enseignant de se connecter au système",
        has_user_account: "Compte utilisateur",
        
        // Actions
        create: "Créer",
        update: "Mettre à jour",
        delete: "Supprimer",
        activate: "Activer",
        deactivate: "Désactiver",
        assign_subjects: "Assigner des matières",
        view_stats: "Voir les statistiques",
        save: "Sauvegarder",
        cancel: "Annuler",
        
        // Messages
        teacher_created: "Enseignant créé avec succès",
        teacher_updated: "Enseignant mis à jour avec succès",
        teacher_deleted: "Enseignant supprimé avec succès",
        status_updated: "Statut mis à jour avec succès",
        assignments_updated: "Assignations mises à jour avec succès",
        
        // Errors
        teacher_is_main: "Cet enseignant ne peut pas être supprimé car il est professeur principal d'une ou plusieurs classes",
        phone_required: "Le numéro de téléphone est obligatoire",
        load_error: "Erreur lors du chargement des enseignants",
        
        // Search & Filters
        search_placeholder: "Rechercher par nom, prénom, téléphone ou email...",
        all_statuses: "Tous les statuts",
        active_only: "Actifs uniquement",
        inactive_only: "Inactifs uniquement",
        total_teachers: "enseignant(s)",
        
        // Statistics
        subjects_taught: "Matières enseignées",
        classes_taught: "Classes enseignées",
        is_main_teacher: "Professeur principal",
        main_classes: "Classes principales",
        
        // Validation
        first_name_required: "Le prénom est obligatoire",
        last_name_required: "Le nom de famille est obligatoire",
        phone_required: "Le téléphone est obligatoire",
        email_invalid: "Email invalide",
        username_required: "Le nom d'utilisateur est obligatoire",
        password_required: "Le mot de passe est obligatoire",
        password_min_length: "Le mot de passe doit contenir au moins 6 caractères",
        
        // Placeholders
        qualification_placeholder: "Ex: Licence en Mathématiques",
        
        // Table Headers
        full_name: "Nom complet",
        contact: "Contact",
        qualification_short: "Qualification",
        hire_date_short: "Date d'embauche",
        actions: "Actions",
        
        // Confirmation Messages
        confirm_activate: "Voulez-vous activer cet enseignant ?",
        confirm_deactivate: "Voulez-vous désactiver cet enseignant ?",
        confirm_delete: "Êtes-vous sûr de vouloir supprimer cet enseignant ? Cette action est irréversible.",
        yes: "Oui",
        no: "Non",
        
        // Empty States
        no_teachers: "Aucun enseignant trouvé",
        no_search_results: "Aucun enseignant ne correspond aux critères de recherche"
    },
    
    en: {
        // Navigation
        teachers: "Teachers",
        teacher_management: "Teacher Management",
        new_teacher: "New Teacher",
        edit_teacher: "Edit Teacher",
        
        // Tabs
        personal_info: "Personal information",
        professional_info: "Professional information",
        user_account: "User account",
        assignments: "Assignments",
        
        // Personal Fields
        first_name: "First name",
        last_name: "Last name",
        phone_number: "Phone number",
        email: "Email",
        address: "Address",
        date_of_birth: "Date of birth",
        gender: "Gender",
        male: "Male",
        female: "Female",
        
        // Professional Fields
        qualification: "Qualification/Degree",
        hire_date: "Hire date",
        status: "Status",
        active: "Active",
        inactive: "Inactive",
        
        // User Account
        create_user_account: "Create a user account for this teacher",
        username: "Username",
        password: "Password",
        user_account_info: "Allows the teacher to log into the system",
        has_user_account: "User account",
        
        // Actions
        create: "Create",
        update: "Update",
        delete: "Delete",
        activate: "Activate",
        deactivate: "Deactivate",
        assign_subjects: "Assign subjects",
        view_stats: "View statistics",
        save: "Save",
        cancel: "Cancel",
        
        // Messages
        teacher_created: "Teacher created successfully",
        teacher_updated: "Teacher updated successfully",
        teacher_deleted: "Teacher deleted successfully",
        status_updated: "Status updated successfully",
        assignments_updated: "Assignments updated successfully",
        
        // Errors
        teacher_is_main: "This teacher cannot be deleted because they are the main teacher of one or more classes",
        phone_required: "Phone number is required",
        load_error: "Error loading teachers",
        
        // Search & Filters
        search_placeholder: "Search by name, phone or email...",
        all_statuses: "All statuses",
        active_only: "Active only",
        inactive_only: "Inactive only",
        total_teachers: "teacher(s)",
        
        // Statistics
        subjects_taught: "Subjects taught",
        classes_taught: "Classes taught",
        is_main_teacher: "Main teacher",
        main_classes: "Main classes",
        
        // Validation
        first_name_required: "First name is required",
        last_name_required: "Last name is required",
        phone_required: "Phone is required",
        email_invalid: "Invalid email",
        username_required: "Username is required",
        password_required: "Password is required",
        password_min_length: "Password must be at least 6 characters",
        
        // Placeholders
        qualification_placeholder: "E.g.: Bachelor in Mathematics",
        
        // Table Headers
        full_name: "Full name",
        contact: "Contact",
        qualification_short: "Qualification",
        hire_date_short: "Hire date",
        actions: "Actions",
        
        // Confirmation Messages
        confirm_activate: "Do you want to activate this teacher?",
        confirm_deactivate: "Do you want to deactivate this teacher?",
        confirm_delete: "Are you sure you want to delete this teacher? This action is irreversible.",
        yes: "Yes",
        no: "No",
        
        // Empty States
        no_teachers: "No teachers found",
        no_search_results: "No teachers match the search criteria"
    }
};

export default teachers;