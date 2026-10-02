-- =============================================================================
-- Sample data — SAMPLE prices, locations and hours. Edit everything from /admin.
-- Mirrors lib/data/demo-seed.ts (used by the local demo mode).
-- =============================================================================

insert into public.locations (slug, name, address, city, maps_url, sort_order) values
  ('tennis-club-hammam-sousse', 'Tennis Club Hammam Sousse', 'Hammam Sousse', 'Sousse, Tunisia', 'https://maps.app.goo.gl/ZFQmQ9ox8x2ovXM58', 1)
on conflict (slug) do nothing;

update public.coach_settings set timezone = 'Africa/Tunis' where id = 1;

insert into public.services
  (slug, name, short_description, description, best_for, includes, duration_min, price_cents, currency, pricing_unit, min_players, max_players, sort_order)
values
  ('private-lesson', 'Private Tennis Lesson',
   'One-to-one coaching built entirely around your game.',
   'The fastest way to improve. Every minute of the session is focused on you — your technique, your tactics and your goals.',
   'Players looking for individualized coaching.',
   array['Technical corrections', 'Tactical coaching', 'Personalized drills', 'Match preparation'],
   60, 6000, 'USD', 'per_session', 1, 1, 1),

  ('semi-private-lesson', 'Semi-Private Lesson',
   'Train with a partner — personal attention, shared cost.',
   'Ideal for friends, couples or doubles partners of a similar level who want focused coaching and live-ball rallies.',
   'Two players of a similar level.',
   array['Technical work for both players', 'Live-ball drills', 'Doubles & singles patterns', 'Shared cost'],
   60, 4000, 'USD', 'per_player', 2, 2, 2),

  ('group-training', 'Group Training',
   'Small-group sessions with match-like intensity.',
   'Dynamic sessions for 3–4 players combining drills, situational play and competitive games.',
   'Small groups of 3–4 players.',
   array['Drills & situational play', 'Point play & games', 'Consistency & movement', 'Best value per player'],
   90, 3000, 'USD', 'per_player', 3, 4, 3),

  ('competition-training', 'Competition Training',
   'Performance training for competitive players.',
   'High-intensity sessions for tournament and ranked players, with tactical planning and match analysis.',
   'Competitive and tournament players.',
   array['High-intensity drills', 'Match-play scenarios', 'Tactical game plans', 'Mental & tournament preparation'],
   90, 9000, 'USD', 'per_session', 1, 2, 4),

  ('junior-development', 'Junior Development',
   'Age-appropriate coaching for young players.',
   'Fun, structured sessions that build strong fundamentals, coordination and a lasting love for the game.',
   'Juniors of all levels.',
   array['Fundamentals & coordination', 'Age-appropriate progressions', 'Movement & agility', 'Match introduction'],
   60, 5000, 'USD', 'per_session', 1, 1, 5),

  ('padel-coaching', 'Padel Coaching',
   'Technical and tactical coaching for padel.',
   'Learn the specific techniques and positioning of padel, from the basics to advanced wall play.',
   'Padel players of every level.',
   array['Padel technique', 'Wall play', 'Positioning & tactics', 'Doubles strategy'],
   60, 6000, 'USD', 'per_session', 1, 4, 6)
on conflict (slug) do nothing;

-- No service_locations rows: every service is offered at every active location.

update public.coach_settings set currency = 'USD' where id = 1;

-- Booking window: online booking from 24 h to 7 days before the lesson (Admin → Settings)
update public.coach_settings set min_notice_hours = 24, max_advance_days = 7 where id = 1;

-- Lesson packs (apply to every service; edit from Admin → Services)
insert into public.packages (name, description, lessons_count, discount_percent, validity_days, sort_order) values
  ('5-Lesson Pack', '5 lessons to use within a month.', 5, 5, 30, 1),
  ('10-Lesson Pack', '10 lessons to use within a month — best value.', 10, 10, 30, 2);

-- French versions (Admin → Services)
update public.services set name_fr = 'Cours de tennis particulier',
  short_description_fr = 'Un coaching individuel entièrement construit autour de votre jeu.',
  description_fr = 'La façon la plus rapide de progresser. Chaque minute de la séance est consacrée à vous — votre technique, votre tactique et vos objectifs.',
  best_for_fr = 'Les joueurs qui veulent un coaching individualisé.',
  includes_fr = array['Corrections techniques', 'Coaching tactique', 'Exercices personnalisés', 'Préparation au match']
  where slug = 'private-lesson';
update public.services set name_fr = 'Cours semi-privé',
  short_description_fr = 'Entraînez-vous à deux — une attention personnelle, un coût partagé.',
  description_fr = 'Idéal pour des amis, un couple ou des partenaires de double de niveau proche qui veulent un coaching ciblé et des échanges en balle réelle.',
  best_for_fr = 'Deux joueurs de niveau proche.',
  includes_fr = array['Travail technique pour les deux joueurs', 'Exercices en balle réelle', 'Schémas de jeu en simple et double', 'Coût partagé']
  where slug = 'semi-private-lesson';
update public.services set name_fr = 'Entraînement en groupe',
  short_description_fr = 'Des séances en petit groupe, avec l''intensité d''un match.',
  description_fr = 'Des séances dynamiques pour 3 à 4 joueurs, mêlant exercices, situations de jeu et matchs à thème.',
  best_for_fr = 'Petits groupes de 3 à 4 joueurs.',
  includes_fr = array['Exercices & situations de jeu', 'Jeu au point & matchs', 'Régularité & déplacements', 'Le meilleur prix par joueur']
  where slug = 'group-training';
update public.services set name_fr = 'Entraînement compétition',
  short_description_fr = 'Un entraînement de performance pour les compétiteurs.',
  description_fr = 'Des séances intenses pour les joueurs classés et de tournoi, avec planification tactique et analyse de match.',
  best_for_fr = 'Joueurs de compétition et de tournoi.',
  includes_fr = array['Exercices à haute intensité', 'Situations de match', 'Plans de jeu tactiques', 'Préparation mentale & tournois']
  where slug = 'competition-training';
update public.services set name_fr = 'Développement jeunes',
  short_description_fr = 'Un coaching adapté à l''âge des jeunes joueurs.',
  description_fr = 'Des séances ludiques et structurées pour construire des bases solides, la coordination et le goût durable du jeu.',
  best_for_fr = 'Les jeunes de tous niveaux.',
  includes_fr = array['Fondamentaux & coordination', 'Progressions adaptées à l''âge', 'Motricité & agilité', 'Initiation au match']
  where slug = 'junior-development';
update public.services set name_fr = 'Coaching padel',
  short_description_fr = 'Un coaching technique et tactique pour le padel.',
  description_fr = 'Apprenez les techniques et le placement propres au padel, des bases jusqu''au jeu avancé avec les vitres.',
  best_for_fr = 'Les joueurs de padel de tous niveaux.',
  includes_fr = array['Technique padel', 'Jeu avec les vitres', 'Placement & tactique', 'Stratégie en double']
  where slug = 'padel-coaching';

update public.packages set name_fr = 'Forfait 5 cours', description_fr = '5 cours à utiliser dans le mois.' where lessons_count = 5;
update public.packages set name_fr = 'Forfait 10 cours', description_fr = '10 cours à utiliser dans le mois — le meilleur prix.' where lessons_count = 10;

-- Weekly hours: Mon–Fri 08:00–12:00 & 16:00–20:00, Sat 09:00–13:00
insert into public.availability_rules (weekday, start_time, end_time)
select d, '08:00'::time, '12:00'::time from generate_series(1, 5) d
union all
select d, '16:00'::time, '20:00'::time from generate_series(1, 5) d
union all
select 6, '09:00'::time, '13:00'::time;
