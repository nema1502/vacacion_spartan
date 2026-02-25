-- =============================================================
-- SPARTAN DE BOLIVIA S.R.L. — Sistema de Control de Vacaciones
-- 02-seed-empleados.sql  |  Supabase / PostgreSQL
-- Insertar DESPUÉS de ejecutar 01-schema.sql
-- 42 empleados activos con datos originales Spartan
-- Generado: 2026-02-20
-- =============================================================
-- NOTA: el trigger trg_empleados_antiguedad ajustará
-- dias_vacacion_anio automáticamente según la ley boliviana
-- (Arts. 33-36 LGT) al insertar / actualizar antiguedad_anios.
-- =============================================================

INSERT INTO empleados
  (id, numero, nombre_completo, cargo, departamento, nro_cuenta,
   fecha_ingreso, fecha_ingreso_cps, antiguedad_anios, dias_vacacion_anio, activo)
VALUES
  -- ── ADMINISTRATIVO ──────────────────────────────────────────
  ( 1,  1, 'HORACIO d''ARRUDA',                   'PRESIDENTE',                   'ADMIN', '4308392',      '1990-06-06', '1991-07-01', 35, 30, true),
  ( 2,  2, 'JUAN CARLOS SERRANO ARREDONDO',        'GERENTE ADM.Y FINANCIERO',     'ADMIN', '2169984011',   '1991-01-05', '1991-01-05', 35, 30, true),
  ( 3,  3, 'KATHERINE SANCHEZ TOMINAGA',           'CONTADORA GENERAL',            'ADMIN', '2169704018',   '2000-12-01', '2001-02-01', 25, 30, true),
  ( 4,  4, 'CLAUDIA GIOVANNA ARDAYA CORTEZ',       'SECRETARIA DE VENTAS',         'ADMIN', '2169804012',   '2000-02-10', '2000-04-01', 26, 30, true),
  ( 5,  5, 'WILBER SAUCEDO MEJIA',                 'MENSAJERO',                    'ADMIN', '2169924018',   '2023-05-02', '2023-05-02',  2, 15, true),
  ( 6,  6, 'LIZONDO SANDERS ELENI',                'AUXILIAR DE CONTABILIDAD',     'ADMIN', '6470914015',   '2022-02-01', '2022-02-01',  4, 15, true),
  ( 7,  7, 'MORON ROJAS NADIA MALENA',             'ASISTENTE DE VENTAS',          'ADMIN', '1077779401',   '2025-10-01', '2025-10-01',  0,  0, true),
  ( 8,  8, 'PEDRO ROMAN BARBA',                    'CASERO SPARTANA',              'ADMIN', '114733146',    '2009-04-01', '2009-04-01', 16, 30, true),
  ( 9,  9, 'ALFREDO GUZMAN APONTE',                'ENCARGADO CAMPO',              'ADMIN', '111023730',    '1999-07-18', '2000-01-20', 26, 30, true),
  (10, 10, 'JOSE MARIO PEÑA AGUILERA',             'JARDINERO',                    'ADMIN', '111023938',    '2009-04-01', '2009-04-01', 16, 30, true),

  -- ── COMERCIAL ───────────────────────────────────────────────
  (11,  1, 'JOSE IGNACIO d''ARRUDA ESPAÑA',        'GERENTE COMERCIAL',         'COMERCIAL', '4145434012',  '2023-05-02', '2023-05-02',  2, 15, true),
  (12,  2, 'DANIEL HALLENS CORDOVA',               'JEFE COMERCIAL NACIONAL',   'COMERCIAL', '2008924018',  '2022-06-06', '2022-06-06',  3, 15, true),
  (13,  3, 'DENISSE NAZARENO RIVERO',              'SECRETARIA COMERCIAL',      'COMERCIAL', '2363574010',  '2011-01-21', '2011-03-01', 15, 30, true),
  (14,  4, 'LUIS GUZMAN VARGAS',                   'EJECUTIVO DE VENTAS',       'COMERCIAL', '2169644015',  '2000-12-01', '2001-09-01', 25, 30, true),
  (15,  5, 'MIGUEL ANGEL TARDIO AÑEZ',             'EJECUTIVO DE VENTAS',       'COMERCIAL', '1787424020',  '2005-09-01', '2005-09-01', 20, 30, true),
  (16,  6, 'OSCAR MARTIN BARRON RAPU',             'EJECUTIVO DE VENTAS',       'COMERCIAL', '2169754015',  '2007-07-01', '2007-07-01', 18, 30, true),
  (17,  7, 'SERGIO ALFREDO APONTE',                'EJECUTIVO DE VENTAS',       'COMERCIAL', '1909704011',  '2016-05-03', '2016-05-03',  9, 20, true),
  (18,  8, 'OSCAR ANDRES BARRON ROCA',             'EJECUTIVO DE VENTAS',       'COMERCIAL', '7808764011',  '2021-04-12', '2021-04-12',  4, 15, true),
  (19,  9, 'JUAN VEGA LAIME',                      'AUXILIAR DE FABRICA',       'COMERCIAL', '2169654011',  '2023-04-03', '2023-04-03',  2, 15, true),
  (20, 10, 'SERGIO ANDRES LLADO GIL',              'COBRADOR',                  'COMERCIAL', '2169854010',  '1996-05-01', '1996-05-01', 29, 30, true),
  (21, 11, 'HANS MILKOS MENDEZ MENDEZ',            'SOPORTE TECNICO A CLIENTES','COMERCIAL', '6675364018',  '2018-12-01', '2018-12-01',  7, 20, true),
  (22, 12, 'LUIS ALBERTO VARGAS ALCOVER',          'VENTAS DIV. LECHERIA',      'COMERCIAL', '2171334015',  '2023-05-02', '2023-05-02',  2, 15, true),
  (23, 13, 'GROVER FLORES QUISPE',                 'SOPORTE TECNICO II',        'COMERCIAL', '2696344020',  NULL,         '2025-07-01',  0,  0, true),
  (24, 14, 'NICOLAS EMIR MEJIA AGREDA',            'ANALISTA WEB',              'COMERCIAL', '9826503',     NULL,         '2025-08-04',  0,  0, true),
  (25, 15, 'PRISCILA RIBERA MELGAR',               'ENCARGADA DE MARKETING',    'COMERCIAL', '2378584011',  NULL,         '2025-11-04',  0,  0, true),

  -- ── FÁBRICA ─────────────────────────────────────────────────
  (26,  1, 'PERCY CANDIA BURTON',                  'JEFE DE PRODUCCION',          'FABRICA', '2585454012',  '2011-10-12', '2011-10-12', 14, 30, true),
  (27,  2, 'ARIEL RAMALLO RIVA',                   'CONTROL DE CALIDAD',          'FABRICA', '4148994019',  '2017-11-01', '2017-11-01',  8, 20, true),
  (28,  3, 'LUIS ALBERTO MENDOZA ROJAS',           'AUXILIAR DE LABORATORIO',     'FABRICA', '5087644016',  '2016-05-03', '2016-05-03',  9, 20, true),
  (29,  4, 'MARIA EUGENIA SAUCEDO',                'ENCARGADA DE LIMPIEZA',       'FABRICA', '3233354014',  '2023-04-03', '2023-04-03',  2, 15, true),
  (30,  5, 'PEDRO MIGUEL SANCHEZ GARCIA',          'AYUDANTE DE FABRICA',         'FABRICA', '2626764013',  '2011-11-10', '2011-11-10', 14, 30, true),
  (31,  6, 'WILLMER SOLIZ CUELLAR',                'AYUDANTE DE FABRICA',         'FABRICA', '2169524010',  '2023-05-02', '2023-05-02',  2, 15, true),
  (32,  7, 'ERNESTO PEÑA',                         'JARDINERO',                   'FABRICA', '3455904012',  '2011-04-06', '2011-04-06', 14, 30, true),
  (33,  8, 'IBERT JORGE CESPEDES',                 'AYUDANTE DE FABRICA',         'FABRICA', '2798484012',  '2015-05-07', '2015-05-07', 10, 30, true),
  (34,  9, 'HERMAN PEÑA AGUILAR',                  'AYUDANTE DE FABRICA',         'FABRICA', '7325194019',  '2020-01-02', '2020-01-02',  6, 20, true),
  (35, 10, 'BRUNO PEÑA AGUILAR',                   'ENC. DE LOGISTICA',           'FABRICA', '2598374018',  '2020-10-01', '2020-10-01',  5, 20, true),
  (36, 11, 'MONDAQUE AYALA FRAN JHIMI',            'AYUDANTE DE FABRICA 3',       'FABRICA', '7564944011',  '2020-10-01', '2020-10-01',  5, 20, true),
  (37, 12, 'VACA JIMENEZ JOSE EDUARDO',            'AYUDANTE DE FABRICA',         'FABRICA', '4953954015',  '2021-02-17', '2021-02-17',  5, 20, true),
  (38, 13, 'CUTIPA FLORES YEISON',                 'AUXILIAR DE REGISTROS',       'FABRICA', '8211224011',  '2023-03-06', '2023-03-06',  2, 15, true),
  (39, 14, 'PARADA PEREZ JOSE',                    'AYUD. DE FABRICA',            'FABRICA', '5873740',     '2024-05-06', '2024-05-06',  1, 15, true),
  (40, 15, 'MORALES FERREIRA WALTER HUMBERTO',     'AYUD. DE FABRICA',            'FABRICA', '2171514013',  '2025-01-13', '2025-01-13',  1, 15, true),
  (41, 16, 'ISSA SAUCEDO ROSA GRACIELA',           'ENC. GESTION DE CALIDAD',     'FABRICA', '1048577401',  '2025-04-07', '2025-04-07',  0,  0, true),
  (42, 17, 'OJEDA TERRAZA JOSE GABRIEL',           'AYUDANTE DE FABRICA',         'FABRICA', '1056999401',  NULL,         '2025-06-09',  0,  0, true);

SELECT setval('empleados_id_seq', 42);
