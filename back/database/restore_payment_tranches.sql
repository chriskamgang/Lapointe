-- Script pour restaurer les tranches de paiement de base
-- À exécuter après avoir vidé la base de données

-- Insérer les tranches de paiement de base
INSERT INTO payment_tranches (name, description, `order`, is_active, default_amount, use_default_amount, deadline, created_at, updated_at) VALUES
('Inscription', 'Frais d\'inscription pour la nouvelle année scolaire', 1, 1, NULL, 0, NULL, NOW(), NOW()),
('1ère Tranche', 'Première tranche des frais de scolarité', 2, 1, NULL, 0, NULL, NOW(), NOW()),
('2ème Tranche', 'Deuxième tranche des frais de scolarité', 3, 1, NULL, 0, NULL, NOW(), NOW()),
('3ème Tranche', 'Troisième tranche des frais de scolarité', 4, 1, NULL, 0, NULL, NOW(), NOW()),
('Examen', 'Frais d\'examen', 5, 1, NULL, 0, NULL, NOW(), NOW()),
('RAME', 'Frais RAME (Restaurant et Matériel Éducatif)', 6, 1, 25000, 1, NULL, NOW(), NOW());

-- Afficher un message de confirmation
SELECT 'Tranches de paiement restaurées avec succès !' AS message;