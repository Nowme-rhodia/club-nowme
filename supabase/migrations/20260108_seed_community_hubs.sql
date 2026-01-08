-- Migration: Seed Community Hubs
-- Created at: 2026-01-08

INSERT INTO public.community_hubs (name, description, city, whatsapp_announcement_link)
VALUES 
-- GEOGRAPHIC HUBS
('Paris & Proche Banlieue', '75, 92, 93, 94', 'Paris', 'https://chat.whatsapp.com/placeholder_paris'),
('Team Est Francilien', '77, 91', 'Est', 'https://chat.whatsapp.com/placeholder_est'),
('Team Ouest & Nord', '78, 95', 'Ouest', 'https://chat.whatsapp.com/placeholder_ouest'),

-- THEMATIC HUBS
('Culture & Sorties', 'Expos, théâtre et concerts entre copines 🎭', NULL, 'https://chat.whatsapp.com/placeholder_culture'),
('Carrière & Réseau', 'Ambition, networking et entraide pro 💼', NULL, 'https://chat.whatsapp.com/placeholder_career'),
('Sport & Bien-être', 'Yoga, running, motivation et équilibre 🧘‍♀️', NULL, 'https://chat.whatsapp.com/placeholder_wellness'),
('Book Club', 'Lectures & Débats 📚', NULL, 'https://chat.whatsapp.com/placeholder_book'),
('Délires & Fun', 'Juste pour rire 😂', NULL, 'https://chat.whatsapp.com/placeholder_fun'),
('Voyages & Escapades', 'Bons plans week-end et aventures 🌍', NULL, 'https://chat.whatsapp.com/placeholder_travel');
