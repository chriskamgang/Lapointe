const subjects = {
    fr: {
        // Navigation
        subjects: "Matières",
        subject_management: "Gestion des Matières",
        new_subject: "Nouvelle Matière",
        edit_subject: "Modifier la Matière",
        
        // Fields
        subject_name: "Nom de la matière",
        subject_code: "Code",
        description: "Description",
        status: "Statut",
        active: "Active",
        inactive: "Inactive",
        coefficient: "Coefficient",
        
        // Actions
        create: "Créer",
        update: "Mettre à jour",
        delete: "Supprimer",
        activate: "Activer",
        deactivate: "Désactiver",
        configure: "Configurer",
        save: "Sauvegarder",
        cancel: "Annuler",
        
        // Messages
        subject_created: "Matière créée avec succès",
        subject_updated: "Matière mise à jour avec succès",
        subject_deleted: "Matière supprimée avec succès",
        status_updated: "Statut mis à jour avec succès",
        configuration_saved: "Configuration sauvegardée avec succès",
        
        // Errors
        subject_in_use: "Cette matière ne peut pas être supprimée car elle est utilisée dans des séries de classe",
        load_error: "Erreur lors du chargement des matières",
        
        // Placeholders
        search_placeholder: "Rechercher par nom ou code...",
        name_placeholder: "Ex: Mathématiques",
        code_placeholder: "Ex: MATH",
        description_placeholder: "Description optionnelle de la matière...",
        
        // Validation
        name_required: "Le nom de la matière est obligatoire",
        code_required: "Le code est obligatoire",
        code_unique: "Ce code est déjà utilisé",
        
        // Configuration
        subject_configuration: "Configuration des Matières",
        selected_subjects: "Matières sélectionnées",
        total_coefficient: "Total des coefficients",
        available_subjects: "Matières disponibles",
        new_subject_badge: "Nouvelle",
        existing_subject_badge: "Existante",
        
        // Info messages
        configuration_info: [
            "Sélectionnez les matières que vous souhaitez enseigner dans cette série",
            "Le coefficient détermine l'importance de la matière dans le calcul des moyennes",
            "Un coefficient plus élevé donne plus de poids à la matière",
            "Les coefficients doivent être compris entre 0.1 et 10"
        ]
    },
    
    en: {
        // Navigation
        subjects: "Subjects",
        subject_management: "Subject Management",
        new_subject: "New Subject",
        edit_subject: "Edit Subject",
        
        // Fields
        subject_name: "Subject name",
        subject_code: "Code",
        description: "Description",
        status: "Status",
        active: "Active",
        inactive: "Inactive",
        coefficient: "Coefficient",
        
        // Actions
        create: "Create",
        update: "Update",
        delete: "Delete",
        activate: "Activate",
        deactivate: "Deactivate",
        configure: "Configure",
        save: "Save",
        cancel: "Cancel",
        
        // Messages
        subject_created: "Subject created successfully",
        subject_updated: "Subject updated successfully",
        subject_deleted: "Subject deleted successfully",
        status_updated: "Status updated successfully",
        configuration_saved: "Configuration saved successfully",
        
        // Errors
        subject_in_use: "This subject cannot be deleted because it is used in class series",
        load_error: "Error loading subjects",
        
        // Placeholders
        search_placeholder: "Search by name or code...",
        name_placeholder: "E.g.: Mathematics",
        code_placeholder: "E.g.: MATH",
        description_placeholder: "Optional subject description...",
        
        // Validation
        name_required: "Subject name is required",
        code_required: "Code is required",
        code_unique: "This code is already in use",
        
        // Configuration
        subject_configuration: "Subject Configuration",
        selected_subjects: "Selected subjects",
        total_coefficient: "Total coefficients",
        available_subjects: "Available subjects",
        new_subject_badge: "New",
        existing_subject_badge: "Existing",
        
        // Info messages
        configuration_info: [
            "Select the subjects you want to teach in this series",
            "The coefficient determines the importance of the subject in grade calculations",
            "A higher coefficient gives more weight to the subject",
            "Coefficients must be between 0.1 and 10"
        ]
    }
};

export default subjects;