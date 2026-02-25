-- =============================================================
-- SPARTAN DE BOLIVIA S.R.L. — Sistema de Control de Vacaciones
-- 01-schema.sql  |  Supabase / PostgreSQL
-- Ley General del Trabajo Bolivia: Arts. 33-36 LGT
--   Años 1-5  → 15 días hábiles/año
--   Años 6-10 → 20 días hábiles/año
--   Años 11+  → 30 días hábiles/año
-- Generado: 2026-02-20
-- =============================================================

-- ---------------------------------------------------------------
-- 0. LIMPIEZA (ejecutar solo en entornos de desarrollo / reset)
-- Las tablas se eliminan primero con CASCADE (eso borra triggers
-- automaticamente). Las funciones se eliminan despues.
-- ---------------------------------------------------------------
DROP VIEW  IF EXISTS resumen_vacaciones;
DROP TABLE IF EXISTS vacaciones_tomadas   CASCADE;
DROP TABLE IF EXISTS periodos_vacacion    CASCADE;
DROP TABLE IF EXISTS empleados            CASCADE;
DROP FUNCTION IF EXISTS update_updated_at()          CASCADE;
DROP FUNCTION IF EXISTS trg_fn_actualizar_dias_vacacion() CASCADE;
DROP FUNCTION IF EXISTS dias_vacacion_boliviana(INTEGER);
DROP FUNCTION IF EXISTS anios_completos_empleado(INTEGER);
DROP FUNCTION IF EXISTS calcular_siguiente_periodo(INTEGER);
DROP FUNCTION IF EXISTS sincronizar_periodos_empleado(INTEGER);
DROP FUNCTION IF EXISTS sincronizar_todos_empleados();

-- ---------------------------------------------------------------
-- TABLA 1: empleados
-- ---------------------------------------------------------------
CREATE TABLE empleados (
  id                   SERIAL PRIMARY KEY,
  numero               INTEGER,
  nombre_completo      TEXT NOT NULL,
  cargo                TEXT,
  departamento         TEXT CHECK (departamento IN ('ADMIN','COMERCIAL','FABRICA')),
  nro_cuenta           TEXT,
  fecha_ingreso        DATE,
  fecha_ingreso_cps    DATE,
  antiguedad_anios     INTEGER DEFAULT 0,
  dias_vacacion_anio   INTEGER DEFAULT 0,
  activo               BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA 2: periodos_vacacion
-- Un registro por cada anio de antiguedad completado.
-- ---------------------------------------------------------------
CREATE TABLE periodos_vacacion (
  id               SERIAL PRIMARY KEY,
  empleado_id      INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
  anio_label       TEXT,
  desde            DATE,
  hasta            DATE,
  dias_trabajados  INTEGER,
  derecho_dias     NUMERIC(5,1),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA 3: vacaciones_tomadas
-- ---------------------------------------------------------------
CREATE TABLE vacaciones_tomadas (
  id               SERIAL PRIMARY KEY,
  empleado_id      INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_desde      DATE NOT NULL,
  fecha_hasta      DATE,
  motivo           TEXT,
  dias_habiles     NUMERIC(6,1),
  autorizado_por   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- INDICES
-- ---------------------------------------------------------------
CREATE INDEX idx_periodos_empleado   ON periodos_vacacion(empleado_id);
CREATE INDEX idx_periodos_desde      ON periodos_vacacion(desde);
CREATE INDEX idx_vacaciones_empleado ON vacaciones_tomadas(empleado_id);
CREATE INDEX idx_vacaciones_fecha    ON vacaciones_tomadas(fecha_desde);
CREATE INDEX idx_empleados_activo    ON empleados(activo);
CREATE INDEX idx_empleados_depto     ON empleados(departamento);

-- ---------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) — Supabase
-- Solo usuarios autenticados pueden acceder a los datos.
-- ---------------------------------------------------------------
ALTER TABLE empleados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos_vacacion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacaciones_tomadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON empleados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON periodos_vacacion
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON vacaciones_tomadas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------
-- FUNCION: timestamp updated_at automatico
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_empleados_updated_at
  BEFORE UPDATE ON empleados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------
-- FUNCION: dias de vacacion segun Ley General del Trabajo Bolivia
--   Arts. 33-36 LGT
--   1-5 anios  → 15 dias habiles
--   6-10 anios → 20 dias habiles
--   11+ anios  → 30 dias habiles
--   0 anios    →  0 (aun no completo el primer anio)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION dias_vacacion_boliviana(p_anios INTEGER)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_anios IS NULL OR p_anios < 1 THEN RETURN 0;
  ELSIF p_anios <= 5  THEN RETURN 15;
  ELSIF p_anios <= 10 THEN RETURN 20;
  ELSE RETURN 30;
  END IF;
END;
$$;

-- ---------------------------------------------------------------
-- TRIGGER: actualiza dias_vacacion_anio automaticamente al
-- modificar antiguedad_anios (ley boliviana art. 33-36 LGT).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_actualizar_dias_vacacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.dias_vacacion_anio := dias_vacacion_boliviana(NEW.antiguedad_anios);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_empleados_antiguedad
  BEFORE INSERT OR UPDATE OF antiguedad_anios ON empleados
  FOR EACH ROW EXECUTE FUNCTION trg_fn_actualizar_dias_vacacion();

-- ---------------------------------------------------------------
-- FUNCION: anios completos trabajados calculados a CURRENT_DATE
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION anios_completos_empleado(p_emp_id INTEGER)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_fecha_ref DATE;
  v_anios     INTEGER;
BEGIN
  SELECT COALESCE(fecha_ingreso, fecha_ingreso_cps)
    INTO v_fecha_ref
    FROM empleados
   WHERE id = p_emp_id;

  IF v_fecha_ref IS NULL THEN RETURN 0; END IF;
  v_anios := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_fecha_ref))::INTEGER;
  RETURN GREATEST(v_anios, 0);
END;
$$;

-- ---------------------------------------------------------------
-- FUNCION: genera los periodos_vacacion faltantes hasta hoy para
-- un empleado dado, calculando derecho segun ley boliviana.
-- Rellena TODOS los huecos desde Año 1 hasta el ultimo anio
-- completo (no solo desde el ultimo registrado), de forma que
-- siempre existan registros desde el primer año de antiguedad.
-- Devuelve el numero de periodos generados.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION calcular_siguiente_periodo(p_emp_id INTEGER)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_fecha_ref      DATE;
  v_anios_totales  INTEGER;
  v_generados      INTEGER := 0;
  v_anio           INTEGER;
  v_desde          DATE;
  v_hasta          DATE;
  v_dias_trab      INTEGER;
  v_derecho        NUMERIC(5,1);
  v_existe         BOOLEAN;
BEGIN
  SELECT COALESCE(fecha_ingreso, fecha_ingreso_cps)
    INTO v_fecha_ref
    FROM empleados WHERE id = p_emp_id;

  IF v_fecha_ref IS NULL THEN RETURN 0; END IF;

  v_anios_totales := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_fecha_ref))::INTEGER;
  IF v_anios_totales < 1 THEN RETURN 0; END IF;

  -- Iterar desde Año 1 hasta el último año completo e insertar
  -- solo los que faltan (respeta registros manuales preexistentes).
  FOR v_anio IN 1..v_anios_totales LOOP
    SELECT EXISTS(
      SELECT 1 FROM periodos_vacacion
       WHERE empleado_id = p_emp_id
         AND anio_label  = 'Año ' || v_anio
    ) INTO v_existe;

    IF NOT v_existe THEN
      v_desde     := (v_fecha_ref + ((v_anio - 1) * INTERVAL '1 year'))::DATE;
      v_hasta     := (v_fecha_ref + (v_anio       * INTERVAL '1 year') - INTERVAL '1 day')::DATE;
      v_dias_trab := (v_hasta - v_desde + 1);
      v_derecho   := dias_vacacion_boliviana(v_anio)::NUMERIC(5,1);

      INSERT INTO periodos_vacacion
        (empleado_id, anio_label, desde, hasta, dias_trabajados, derecho_dias)
      VALUES
        (p_emp_id, 'Año ' || v_anio, v_desde, v_hasta, v_dias_trab, v_derecho);

      v_generados := v_generados + 1;
    END IF;
  END LOOP;

  RETURN v_generados;
END;
$$;

-- ---------------------------------------------------------------
-- FUNCION: sincronizar antiguedad + periodos para UN empleado.
-- Actualiza antiguedad_anios → trigger ajusta dias_vacacion_anio.
-- Genera periodos faltantes desde Año 1 hasta el ultimo completo.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION sincronizar_periodos_empleado(p_emp_id INTEGER)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_anios     INTEGER;
  v_generados INTEGER;
BEGIN
  v_anios := anios_completos_empleado(p_emp_id);

  UPDATE empleados
     SET antiguedad_anios = v_anios
   WHERE id = p_emp_id;

  v_generados := calcular_siguiente_periodo(p_emp_id);

  RETURN format('Empleado %s: %s anios, %s periodo(s) generado(s)',
                p_emp_id, v_anios, v_generados);
END;
$$;

-- ---------------------------------------------------------------
-- FUNCION: sincronizar TODOS los empleados activos de una vez.
-- Ejecutar mensualmente o como job programado en Supabase.
--   SELECT * FROM sincronizar_todos_empleados();
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION sincronizar_todos_empleados()
RETURNS TABLE(resultado TEXT) LANGUAGE plpgsql AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM empleados WHERE activo = TRUE LOOP
    resultado := sincronizar_periodos_empleado(rec.id);
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------
-- VISTA: resumen_vacaciones
-- Equivale a la hoja RESUMEN del Excel de Spartan.
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW resumen_vacaciones AS
SELECT
  e.id,
  e.numero,
  e.nombre_completo,
  e.cargo,
  e.departamento,
  COALESCE(e.fecha_ingreso, e.fecha_ingreso_cps) AS fecha_ingreso_efectiva,
  e.antiguedad_anios,
  e.dias_vacacion_anio,
  COALESCE(
    (SELECT SUM(p.derecho_dias) FROM periodos_vacacion p WHERE p.empleado_id = e.id), 0
  ) AS dias_acumulados,
  COALESCE(
    (SELECT SUM(v.dias_habiles) FROM vacaciones_tomadas v WHERE v.empleado_id = e.id), 0
  ) AS dias_tomados,
  COALESCE(
    (SELECT SUM(p.derecho_dias) FROM periodos_vacacion p WHERE p.empleado_id = e.id), 0
  ) - COALESCE(
    (SELECT SUM(v.dias_habiles) FROM vacaciones_tomadas v WHERE v.empleado_id = e.id), 0
  ) AS saldo
FROM empleados e
WHERE e.activo = TRUE
ORDER BY e.departamento, e.numero, e.nombre_completo;
