-- Script pour vider la base de données en gardant seulement les utilisateurs
-- À exécuter avec précaution !

-- Désactiver les contraintes de clés étrangères temporairement
SET FOREIGN_KEY_CHECKS = 0;

-- Vider les tables de paiements
TRUNCATE TABLE payment_details;
TRUNCATE TABLE payments;

-- Vider les tables d'étudiants et relations
TRUNCATE TABLE attendances;
TRUNCATE TABLE supervisor_class_assignments;
TRUNCATE TABLE students;

-- Vider les tables de classes et structure académique
TRUNCATE TABLE class_scholarships;
TRUNCATE TABLE class_payment_amounts;
TRUNCATE TABLE series_subjects;
TRUNCATE TABLE teacher_assignments;
TRUNCATE TABLE main_teachers;
TRUNCATE TABLE class_series;
TRUNCATE TABLE school_classes;
TRUNCATE TABLE subjects;

-- Vider les tables de configuration scolaire (garder school_settings)
-- TRUNCATE TABLE school_settings; -- COMMENTÉ pour garder les paramètres

-- Vider les autres tables de données
TRUNCATE TABLE needs;
TRUNCATE TABLE sections;
TRUNCATE TABLE levels;
TRUNCATE TABLE payment_tranches;

-- Garder les années scolaires mais réinitialiser les flags
UPDATE school_years SET is_current = 0, is_active = 1;

-- Réactiver les contraintes de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;

-- Afficher un message de confirmation
SELECT 'Base de données vidée avec succès. Seuls les utilisateurs et paramètres de base ont été conservés.' AS message;