-- =====================================================
-- MODELO DE BASE DE DATOS - SISTEMA DE EMISIONES
-- PostgreSQL 12+
-- Versión: 3.0 (Canvas-based, Sin roles)
-- =====================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: USUARIOS
-- =====================================================
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    uuid_usuario UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL, -- Hash bcrypt
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    intentos_login_fallidos INTEGER DEFAULT 0,
    ultimo_intento_login TIMESTAMP,
    bloqueado_hasta TIMESTAMP,
    last_login TIMESTAMP,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_uuid ON usuarios(uuid_usuario);
CREATE INDEX idx_usuarios_active ON usuarios(is_active, is_deleted);

COMMENT ON TABLE usuarios IS 'Usuarios del sistema - todos con permisos de administrador';

-- =====================================================
-- TABLA: IDENTIFICADOR_PADRON
-- =====================================================
CREATE TABLE identificador_padron (
    uuid_padron UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre_padron VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_identificador_padron_nombre ON identificador_padron(nombre_padron);

-- Insertar los 5 padrones
INSERT INTO identificador_padron (nombre_padron, descripcion) VALUES 
    ('TLAJOMULCO_APA', 'Padrón de Agua Potable y Alcantarillado de Tlajomulco'),
    ('TLAJOMULCO_PREDIAL', 'Padrón Predial de Tlajomulco'),
    ('GUADALAJARA_PREDIAL', 'Padrón Predial de Guadalajara'),
    ('GUADALAJARA_LICENCIAS', 'Padrón de Licencias de Guadalajara'),
    ('PENSIONES', 'Padrón de Pensiones');

-- =====================================================
-- TABLA: PROYECTOS
-- =====================================================
CREATE TABLE proyectos (
    id_proyecto SERIAL PRIMARY KEY,
    uuid_proyecto UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    nombre_proyecto VARCHAR(200) NOT NULL,
    descripcion TEXT,
    logo_proyecto VARCHAR(500), -- Ruta del archivo de logo
    uuid_padron UUID NOT NULL REFERENCES identificador_padron(uuid_padron),
    usuario_creador UUID NOT NULL REFERENCES usuarios(uuid_usuario),
    en_emision BOOLEAN DEFAULT FALSE, -- Lock para evitar modificar durante emisión
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_proyectos_uuid ON proyectos(uuid_proyecto);
CREATE INDEX idx_proyectos_padron ON proyectos(uuid_padron);
CREATE INDEX idx_proyectos_active ON proyectos(is_deleted);
CREATE INDEX idx_proyectos_usuario ON proyectos(usuario_creador);
CREATE INDEX idx_proyectos_en_emision ON proyectos(en_emision);

COMMENT ON COLUMN proyectos.en_emision IS 'TRUE si hay una emisión activa, previene modificaciones';

-- =====================================================
-- TABLA: PLANTILLAS
-- =====================================================
CREATE TABLE plantillas (
    id_plantilla SERIAL PRIMARY KEY,
    uuid_plantilla UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    nombre_plantilla VARCHAR(200) NOT NULL,
    descripcion TEXT,
    uuid_proyecto UUID NOT NULL REFERENCES proyectos(uuid_proyecto) ON DELETE CASCADE,
    uuid_padron UUID NOT NULL REFERENCES identificador_padron(uuid_padron),
    
    -- Configuración del canvas
    canvas_config JSONB NOT NULL, -- Configuración completa del canvas (elementos, posiciones, estilos)
    ancho_canvas NUMERIC(6,2) DEFAULT 21.59, -- cm (México Oficio)
    alto_canvas NUMERIC(6,2) DEFAULT 34.01,  -- cm (México Oficio)
    
    -- Metadatos
    thumbnail_path VARCHAR(500), -- Ruta del thumbnail/preview generado
    version INTEGER DEFAULT 1, -- Control de versiones de la plantilla
    
    is_deleted BOOLEAN DEFAULT FALSE,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_plantilla_nombre_proyecto UNIQUE (nombre_plantilla, uuid_proyecto)
);

CREATE INDEX idx_plantillas_uuid ON plantillas(uuid_plantilla);
CREATE INDEX idx_plantillas_proyecto ON plantillas(uuid_proyecto);
CREATE INDEX idx_plantillas_padron ON plantillas(uuid_padron);
CREATE INDEX idx_plantillas_active ON plantillas(is_deleted);

COMMENT ON TABLE plantillas IS 'Plantillas de documentos basadas en canvas (México Oficio: 21.59 x 34.01 cm)';
COMMENT ON COLUMN plantillas.canvas_config IS 'JSON con todos los elementos del canvas: textos, campos, imágenes, códigos de barras, etc.';

-- Ejemplo de estructura canvas_config:
/*
{
  "elementos": [
    {
      "id": "elem_1",
      "tipo": "texto_plano",
      "contenido": "Nombre:",
      "x": 2.5,
      "y": 5.0,
      "ancho": 3.0,
      "alto": 0.6,
      "estilo": {
        "fuente": "Calibri",
        "tamano": 11,
        "negrita": false,
        "italica": false,
        "color": "#000000",
        "alineacion": "left"
      }
    },
    {
      "id": "elem_2",
      "tipo": "campo_bd",
      "campo_nombre": "nombre_contribuyente",
      "x": 6.0,
      "y": 5.0,
      "ancho": 8.0,
      "alto": 0.6,
      "estilo": {
        "fuente": "Calibri",
        "tamano": 11,
        "negrita": true,
        "italica": false,
        "color": "#000000",
        "alineacion": "left"
      }
    },
    {
      "id": "elem_3",
      "tipo": "imagen",
      "ruta_imagen": "/uploads/logo_proyecto.png",
      "x": 1.0,
      "y": 1.0,
      "ancho": 3.0,
      "alto": 2.0,
      "mantener_aspecto": true
    },
    {
      "id": "elem_4",
      "tipo": "codigo_barras",
      "campo_nombre": "codebar",
      "x": 8.0,
      "y": 30.0,
      "ancho": 10.0,
      "alto": 2.0,
      "estilo": {
        "formato": "CODE128",
        "mostrar_texto": true,
        "tamano_texto": 10
      }
    }
  ],
  "configuracion_global": {
    "margen_superior": 1.0,
    "margen_inferior": 1.0,
    "margen_izquierdo": 1.0,
    "margen_derecho": 1.0,
    "color_fondo": "#FFFFFF"
  }
}
*/

-- =====================================================
-- TABLA: SESIONES_EMISION
-- =====================================================
CREATE TABLE sesiones_emision (
    id_sesion SERIAL PRIMARY KEY,
    uuid_sesion UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    uuid_proyecto UUID NOT NULL REFERENCES proyectos(uuid_proyecto),
    uuid_plantilla UUID NOT NULL REFERENCES plantillas(uuid_plantilla),
    uuid_usuario UUID NOT NULL REFERENCES usuarios(uuid_usuario),
    
    -- Configuración de emisión
    pmo_inicial INTEGER NOT NULL,
    visita_inicial INTEGER NOT NULL,
    fecha_emision DATE NOT NULL,
    tipo_documento VARCHAR(5) NOT NULL CHECK (tipo_documento IN ('CI', 'N', 'A', 'E')),
    ruta_salida VARCHAR(500) NOT NULL,
    
    -- Estado y métricas
    estado VARCHAR(20) DEFAULT 'INICIADA' CHECK (estado IN ('INICIADA', 'PROCESANDO', 'COMPLETADA', 'ERROR', 'CANCELADA')),
    total_registros INTEGER,
    registros_procesados INTEGER DEFAULT 0,
    registros_exitosos INTEGER DEFAULT 0,
    registros_con_error INTEGER DEFAULT 0,
    
    -- Tiempos
    tiempo_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tiempo_fin TIMESTAMP,
    duracion_segundos INTEGER,
    
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sesiones_uuid ON sesiones_emision(uuid_sesion);
CREATE INDEX idx_sesiones_proyecto ON sesiones_emision(uuid_proyecto);
CREATE INDEX idx_sesiones_usuario ON sesiones_emision(uuid_usuario);
CREATE INDEX idx_sesiones_estado ON sesiones_emision(estado);
CREATE INDEX idx_sesiones_fecha ON sesiones_emision(fecha_emision);

COMMENT ON TABLE sesiones_emision IS 'Control de sesiones de emisión para concurrencia y trazabilidad';
COMMENT ON COLUMN sesiones_emision.tipo_documento IS 'CI=Carta Invitación, N=Notificación, A=Apercibimiento, E=Embargo';

-- =====================================================
-- TABLAS DE PADRONES
-- =====================================================

-- PADRON: TLAJOMULCO APA
CREATE TABLE padron_completo_tlajomulco_apa (
    uuid_padron UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    uuid_proyecto UUID NOT NULL REFERENCES proyectos(uuid_proyecto) ON DELETE CASCADE,
    despacho VARCHAR(100),
    clave_apa VARCHAR(50),
    propietario VARCHAR(255),
    calle VARCHAR(200),
    exterior VARCHAR(20),
    interior VARCHAR(20),
    poblacion VARCHAR(100),
    localidad VARCHAR(100),
    tipo_servicio VARCHAR(100),
    tipo_tarifa VARCHAR(100),
    adeudo_agua NUMERIC(12,2),
    adeudo_colectores NUMERIC(12,2),
    adeudo_infraestructura NUMERIC(12,2),
    actualizacion NUMERIC(12,2),
    conexion NUMERIC(12,2),
    c_drenaje NUMERIC(12,2),
    descuento NUMERIC(12,2),
    recargos NUMERIC(12,2),
    descuento_recargos NUMERIC(12,2),
    multa NUMERIC(12,2),
    descuento_multa NUMERIC(12,2),
    gastos NUMERIC(12,2),
    saldo NUMERIC(12,2),
    periodo_desde VARCHAR(20),
    periodo_hasta VARCHAR(20),
    recaudadora VARCHAR(50),
    tipo_predio VARCHAR(50),
    cuenta VARCHAR(50) NOT NULL,
    recamaras INTEGER,
    banos INTEGER,
    medidor VARCHAR(50),
    id_convenio VARCHAR(50),
    cobros_considerar VARCHAR(100),
    lectura_real NUMERIC(12,2),
    fecha_lectura DATE,
    autosuficiente BOOLEAN,
    baldio BOOLEAN,
    CONSTRAINT uk_tlaj_apa_cuenta_proyecto UNIQUE (cuenta, uuid_proyecto)
);

CREATE INDEX idx_tlaj_apa_proyecto ON padron_completo_tlajomulco_apa(uuid_proyecto);
CREATE INDEX idx_tlaj_apa_cuenta ON padron_completo_tlajomulco_apa(cuenta);
CREATE INDEX idx_tlaj_apa_clave ON padron_completo_tlajomulco_apa(clave_apa);

-- PADRON: TLAJOMULCO PREDIAL (Tabla principal)
CREATE TABLE padron_completo_tlajomulco_predial (
    uuid_padron UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    uuid_proyecto UUID NOT NULL REFERENCES proyectos(uuid_proyecto) ON DELETE CASCADE,
    despacho VARCHAR(100),
    cuenta_n VARCHAR(50) NOT NULL,
    estatus_n VARCHAR(50),
    clavecatastral VARCHAR(50),
    subpredio VARCHAR(50),
    infonavit VARCHAR(50),
    propietariotitular_n VARCHAR(255),
    calle VARCHAR(200),
    num_exterior VARCHAR(20),
    num_interior VARCHAR(20),
    colonia VARCHAR(100),
    poblacion_desc VARCHAR(100),
    calle_n VARCHAR(200),
    numero_exterior VARCHAR(20),
    numero_interior VARCHAR(20),
    colonia_n VARCHAR(100),
    incp NUMERIC(12,2),
    gastos NUMERIC(12,2),
    multas NUMERIC(12,2),
    saldomulta NUMERIC(12,2),
    saldo2025 NUMERIC(12,2),
    axo VARCHAR(4),
    bimestre VARCHAR(2),
    ultimorequerimiento VARCHAR(50),
    valor_fiscal NUMERIC(15,2),
    tasa_n NUMERIC(8,4),
    etiqueta VARCHAR(100),
    sup_terreno NUMERIC(12,2),
    sup_construccion NUMERIC(12,2),
    CONSTRAINT uk_tlaj_pred_cuenta_proyecto UNIQUE (cuenta_n, uuid_proyecto)
);

CREATE INDEX idx_tlaj_predial_proyecto ON padron_completo_tlajomulco_predial(uuid_proyecto);
CREATE INDEX idx_tlaj_predial_cuenta ON padron_completo_tlajomulco_predial(cuenta_n);
CREATE INDEX idx_tlaj_predial_catastral ON padron_completo_tlajomulco_predial(clavecatastral);

-- DETALLE TLAJOMULCO PREDIAL
CREATE TABLE padron_tlajomulco_predial_detalle (
    id_detalle SERIAL PRIMARY KEY,
    uuid_padron UUID NOT NULL REFERENCES padron_completo_tlajomulco_predial(uuid_padron) ON DELETE CASCADE,
    cuenta_n VARCHAR(50) NOT NULL,
    anio INTEGER NOT NULL CHECK (anio >= 1993 AND anio <= 2100),
    impuesto NUMERIC(12,2),
    recargos NUMERIC(12,2),
    CONSTRAINT uk_tlaj_pred_det_cuenta_anio UNIQUE (uuid_padron, cuenta_n, anio)
);

CREATE INDEX idx_tlaj_pred_det_padron ON padron_tlajomulco_predial_detalle(uuid_padron);
CREATE INDEX idx_tlaj_pred_det_cuenta ON padron_tlajomulco_predial_detalle(cuenta_n);
CREATE INDEX idx_tlaj_pred_det_anio ON padron_tlajomulco_predial_detalle(anio);

-- PADRON: GUADALAJARA PREDIAL PRINCIPAL
CREATE TABLE padron_completo_guadalajara_predial_principal (
    uuid_padron UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    uuid_proyecto UUID NOT NULL REFERENCES proyectos(uuid_proyecto) ON DELETE CASCADE,
    control_req VARCHAR(50) NOT NULL,
    axo_req VARCHAR(4),
    folio_req VARCHAR(50),
    cve_cuenta VARCHAR(50),
    cuenta VARCHAR(50) NOT NULL,
    cve_catastral VARCHAR(50),
    propietario VARCHAR(255),
    domicilio VARCHAR(300),
    no_ext VARCHAR(20),
    no_int VARCHAR(20),
    estado VARCHAR(50),
    municipio VARCHAR(100),
    poblacion VARCHAR(100),
    ubicacion VARCHAR(300),
    ubic_no_ext VARCHAR(20),
    ubic_no_int VARCHAR(20),
    ubic_colonia VARCHAR(100),
    calle_encontrado VARCHAR(200),
    no_ext_3 VARCHAR(20),
    no_int_3 VARCHAR(20),
    colonia_3 VARCHAR(100),
    axo_desde VARCHAR(4),
    bim_desde VARCHAR(2),
    axo_hasta VARCHAR(4),
    bim_hasta VARCHAR(2),
    impuesto NUMERIC(12,2),
    recargos NUMERIC(12,2),
    total_multas NUMERIC(12,2),
    total_gastos NUMERIC(12,2),
    saldo NUMERIC(12,2),
    gastos_requerimiento NUMERIC(12,2),
    actualizacion NUMERIC(12,2),
    exento BOOLEAN,
    tasa NUMERIC(8,4),
    valor_fiscal NUMERIC(15,2),
    terreno NUMERIC(12,2),
    construccion NUMERIC(12,2),
    blqcat VARCHAR(50),
    blqapre VARCHAR(50),
    zona VARCHAR(50),
    subzona VARCHAR(50),
    emision VARCHAR(50),
    id_firmado VARCHAR(50),
    firmante VARCHAR(255),
    cargo VARCHAR(100),
    validez_certi VARCHAR(50),
    fecha_firma DATE,
    hash VARCHAR(255),
    CONSTRAINT uk_gdl_pred_control_proyecto UNIQUE (control_req, uuid_proyecto)
);

CREATE INDEX idx_gdl_pred_prin_proyecto ON padron_completo_guadalajara_predial_principal(uuid_proyecto);
CREATE INDEX idx_gdl_pred_prin_cuenta ON padron_completo_guadalajara_predial_principal(cuenta);
CREATE INDEX idx_gdl_pred_prin_control ON padron_completo_guadalajara_predial_principal(control_req);

-- DETALLE GUADALAJARA PREDIAL
CREATE TABLE padron_completo_guadalajara_predial_detalle (
    id_detalle SERIAL PRIMARY KEY,
    uuid_padron UUID NOT NULL REFERENCES padron_completo_guadalajara_predial_principal(uuid_padron) ON DELETE CASCADE,
    control_req VARCHAR(50) NOT NULL,
    axo VARCHAR(4),
    bimini VARCHAR(2),
    bimfin VARCHAR(2),
    valfiscal NUMERIC(15,2),
    tasa NUMERIC(8,4),
    impuesto NUMERIC(12,2),
    recargos NUMERIC(12,2),
    CONSTRAINT uk_gdl_pred_det_control_axo UNIQUE (uuid_padron, control_req, axo, bimini)
);

CREATE INDEX idx_gdl_pred_det_control ON padron_completo_guadalajara_predial_detalle(control_req);
CREATE INDEX idx_gdl_pred_det_padron ON padron_completo_guadalajara_predial_detalle(uuid_padron);
CREATE INDEX idx_gdl_pred_det_anio ON padron_completo_guadalajara_predial_detalle(axo);

-- PADRON: PENSIONES
CREATE TABLE padron_completo_pensiones (
    uuid_padron UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    uuid_proyecto UUID NOT NULL REFERENCES proyectos(uuid_proyecto) ON DELETE CASCADE,
    afiliado VARCHAR(50) NOT NULL,
    nombre VARCHAR(255),
    rfc VARCHAR(13),
    tipo_prestamo VARCHAR(100),
    prestamo VARCHAR(50),
    saldo_por_vencer NUMERIC(12,2),
    adeudo NUMERIC(12,2),
    liquidacion NUMERIC(12,2),
    moratorio NUMERIC(12,2),
    ultimo_abono DATE,
    subestatus VARCHAR(50),
    estatus VARCHAR(50),
    dependencia VARCHAR(200),
    alta DATE,
    ultima_aportacion NUMERIC(12,2),
    afiliado_calle VARCHAR(200),
    afiliado_exterior VARCHAR(20),
    afiliado_interior VARCHAR(20),
    afiliado_cruza1 VARCHAR(200),
    afiliado_cruza2 VARCHAR(200),
    afiliado_colonia VARCHAR(100),
    afiliado_poblacion VARCHAR(100),
    afiliado_municipio VARCHAR(100),
    afiliado_cp VARCHAR(10),
    afiliado_lada VARCHAR(10),
    afiliado_telefono VARCHAR(20),
    afiliado_celular VARCHAR(20),
    aval_codigo VARCHAR(50),
    aval VARCHAR(255),
    aval_calle VARCHAR(200),
    aval_exterior VARCHAR(20),
    aval_interior VARCHAR(20),
    aval_cruza1 VARCHAR(200),
    aval_cruza2 VARCHAR(200),
    aval_colonia VARCHAR(100),
    aval_poblacion VARCHAR(100),
    aval_municipio VARCHAR(100),
    aval_cp VARCHAR(10),
    aval_lada VARCHAR(10),
    aval_telefono VARCHAR(20),
    aval_celular VARCHAR(20),
    garantia_direccion VARCHAR(300),
    garantia_colonia VARCHAR(100),
    garantia_calles_cruza VARCHAR(300),
    garantia_poblacion VARCHAR(100),
    garantia_municipio VARCHAR(100),
    CONSTRAINT uk_pens_afiliado_proyecto UNIQUE (afiliado, uuid_proyecto)
);

CREATE INDEX idx_pensiones_proyecto ON padron_completo_pensiones(uuid_proyecto);
CREATE INDEX idx_pensiones_afiliado ON padron_completo_pensiones(afiliado);
CREATE INDEX idx_pensiones_nombre ON padron_completo_pensiones(nombre);

-- PADRON: GUADALAJARA LICENCIAS PRINCIPAL
CREATE TABLE padron_completo_guadalajara_licencias_principal (
    uuid_padron UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    uuid_proyecto UUID NOT NULL REFERENCES proyectos(uuid_proyecto) ON DELETE CASCADE,
    cvereq VARCHAR(50) NOT NULL,
    axoreq VARCHAR(4),
    folioreq VARCHAR(50),
    cveproceso VARCHAR(50),
    fecemi DATE,
    recaud VARCHAR(50),
    id_licencia VARCHAR(50) NOT NULL,
    licencia VARCHAR(100),
    propietario VARCHAR(255),
    ubicacion VARCHAR(300),
    numext_ubic VARCHAR(20),
    letraext_ubic VARCHAR(10),
    numint_ubic VARCHAR(20),
    letraint_ubic VARCHAR(10),
    colonia_ubic VARCHAR(100),
    zona VARCHAR(50),
    subzona VARCHAR(50),
    descripcion TEXT,
    actividad VARCHAR(200),
    axoini VARCHAR(4),
    axofin VARCHAR(4),
    formas INTEGER,
    derechos NUMERIC(12,2),
    recargos NUMERIC(12,2),
    multas NUMERIC(12,2),
    anuncios NUMERIC(12,2),
    holograma NUMERIC(12,2),
    solicitud NUMERIC(12,2),
    fverdederecho DATE,
    fverdeanuncio DATE,
    actualizacion NUMERIC(12,2),
    gastos NUMERIC(12,2),
    total NUMERIC(12,2),
    cveejecut VARCHAR(50),
    ncompleto VARCHAR(255),
    CONSTRAINT uk_gdl_lic_cvereq_proyecto UNIQUE (cvereq, uuid_proyecto)
);

CREATE INDEX idx_gdl_lic_prin_proyecto ON padron_completo_guadalajara_licencias_principal(uuid_proyecto);
CREATE INDEX idx_gdl_lic_prin_cvereq ON padron_completo_guadalajara_licencias_principal(cvereq);
CREATE INDEX idx_gdl_lic_prin_licencia ON padron_completo_guadalajara_licencias_principal(id_licencia);

-- DETALLE GUADALAJARA LICENCIAS
CREATE TABLE padron_completo_guadalajara_licencias_detalle (
    id_detalle SERIAL PRIMARY KEY,
    uuid_padron UUID NOT NULL REFERENCES padron_completo_guadalajara_licencias_principal(uuid_padron) ON DELETE CASCADE,
    cvereq VARCHAR(50) NOT NULL,
    id_licencia VARCHAR(50),
    anuncio VARCHAR(100),
    axo VARCHAR(4),
    forma INTEGER,
    derechos NUMERIC(12,2),
    recargos NUMERIC(12,2),
    medio_ambiente NUMERIC(12,2),
    actualizacion NUMERIC(12,2),
    multa NUMERIC(12,2),
    saldo NUMERIC(12,2),
    CONSTRAINT uk_gdl_lic_det_cvereq_axo UNIQUE (uuid_padron, cvereq, axo, forma)
);

CREATE INDEX idx_gdl_lic_det_cvereq ON padron_completo_guadalajara_licencias_detalle(cvereq);
CREATE INDEX idx_gdl_lic_det_padron ON padron_completo_guadalajara_licencias_detalle(uuid_padron);
CREATE INDEX idx_gdl_lic_det_anio ON padron_completo_guadalajara_licencias_detalle(axo);

-- =====================================================
-- TABLA: EMISION_TEMP
-- =====================================================
CREATE TABLE emision_temp (
    id_temp SERIAL PRIMARY KEY,
    uuid_sesion UUID NOT NULL REFERENCES sesiones_emision(uuid_sesion) ON DELETE CASCADE,
    uuid_padron UUID NOT NULL,
    uuid_plantilla UUID NOT NULL REFERENCES plantillas(uuid_plantilla),
    uuid_proyecto UUID NOT NULL REFERENCES proyectos(uuid_proyecto),
    
    -- Datos del CSV
    cuenta VARCHAR(50) NOT NULL,
    observaciones TEXT,
    orden_ruta INTEGER NOT NULL,
    
    -- Datos mapeados del padrón
    datos_padron JSONB,
    
    -- Control de procesamiento
    procesado BOOLEAN DEFAULT FALSE,
    tiene_error BOOLEAN DEFAULT FALSE,
    mensaje_error TEXT,
    
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emision_temp_sesion ON emision_temp(uuid_sesion);
CREATE INDEX idx_emision_temp_cuenta ON emision_temp(cuenta);
CREATE INDEX idx_emision_temp_procesado ON emision_temp(procesado);

-- =====================================================
-- TABLA: EMISION_FINAL
-- =====================================================
CREATE TABLE emision_final (
    id_emision SERIAL PRIMARY KEY,
    uuid_sesion UUID NOT NULL REFERENCES sesiones_emision(uuid_sesion) ON DELETE CASCADE,
    
    -- Identificadores
    codebar VARCHAR(255) UNIQUE NOT NULL,
    folio VARCHAR(100),
    
    -- Referencias
    uuid_padron UUID NOT NULL,
    uuid_plantilla UUID NOT NULL REFERENCES plantillas(uuid_plantilla),
    uuid_proyecto UUID NOT NULL REFERENCES proyectos(uuid_proyecto),
    
    -- Tipo de documento
    tipo_documento VARCHAR(5) NOT NULL CHECK (tipo_documento IN ('CI', 'N', 'A', 'E')),
    
    -- Datos generales
    superficie_terreno NUMERIC(12,2),
    superficie_construccion NUMERIC(12,2),
    recaudadora VARCHAR(50),
    tipo VARCHAR(50),
    cuenta VARCHAR(50) NOT NULL,
    clave_cuenta VARCHAR(50),
    clave_catastral VARCHAR(50),
    fecha_emision DATE NOT NULL,
    zona VARCHAR(50),
    subzona VARCHAR(50),
    manzana VARCHAR(50),
    nombre_contribuyente VARCHAR(255),
    domicilio_contribuyente VARCHAR(500),
    ubicacion_predio VARCHAR(500),
    observaciones TEXT,
    
    -- Montos fiscales
    impuesto NUMERIC(12,2),
    recargos NUMERIC(12,2),
    actualizacion NUMERIC(12,2),
    multa NUMERIC(12,2),
    gastos_notificacion NUMERIC(12,2),
    total_credito_fiscal NUMERIC(12,2),
    
    -- Detalles
    anio VARCHAR(4),
    adeudo VARCHAR(50),
    bimestre VARCHAR(2),
    valor_fiscal NUMERIC(15,2),
    tasa NUMERIC(8,4),
    
    -- Control
    pmo INTEGER NOT NULL,
    visita INTEGER NOT NULL,
    iniciales_notificador VARCHAR(10),
    estatus_captura VARCHAR(50),
    orden_impresion INTEGER NOT NULL,
    
    -- PENSIONES
    numero_afiliado VARCHAR(50),
    cp VARCHAR(10),
    telefono VARCHAR(20),
    celular VARCHAR(20),
    tipo_prestamo VARCHAR(100),
    tipo_cobranza VARCHAR(50),
    nombre_aval VARCHAR(255),
    telefono_aval VARCHAR(20),
    celular_aval VARCHAR(20),
    domicilio_aval VARCHAR(300),
    colonia_aval VARCHAR(100),
    municipio_aval VARCHAR(100),
    domicilio_garantia VARCHAR(300),
    colonia_garantia VARCHAR(100),
    poblacion_garantia VARCHAR(100),
    municipio_garantia VARCHAR(100),
    ultimo_abono DATE,
    monto_vencido NUMERIC(12,2),
    saldo_por_vencer NUMERIC(12,2),
    int_moratorio NUMERIC(12,2),
    total NUMERIC(12,2),
    
    -- LICENCIAS
    giro VARCHAR(200),
    anuncios_anexos VARCHAR(200),
    anio_inicio VARCHAR(4),
    anio_fin VARCHAR(4),
    derechos_licencia_municipal NUMERIC(12,2),
    derechos_conservacion NUMERIC(12,2),
    derechos_anuncios NUMERIC(12,2),
    derechos_mejoramiento NUMERIC(12,2),
    productos_impresos NUMERIC(12,2),
    holograma_por_giro NUMERIC(12,2),
    solicitud_giro NUMERIC(12,2),
    total_adeudo NUMERIC(12,2),
    
    -- Adicionales
    cartografia VARCHAR(255),
    prescrito VARCHAR(2),
    fecha_corte DATE,
    domicilio_fiscal VARCHAR(500),
    
    -- APA
    id_apa VARCHAR(50),
    cpv VARCHAR(10),
    agua_alcantarillado NUMERIC(12,2),
    colectores NUMERIC(12,2),
    infraestructura NUMERIC(12,2),
    conexiones NUMERIC(12,2),
    saldo NUMERIC(12,2),
    
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emision_final_sesion ON emision_final(uuid_sesion);
CREATE INDEX idx_emision_final_codebar ON emision_final(codebar);
CREATE INDEX idx_emision_final_cuenta ON emision_final(cuenta);
CREATE INDEX idx_emision_final_orden ON emision_final(orden_impresion);

-- =====================================================
-- TABLA: EMISION_ACUMULADA
-- =====================================================
CREATE TABLE emision_acumulada (
    id_acumulada SERIAL PRIMARY KEY,
    uuid_sesion UUID NOT NULL,
    
    -- Identificadores
    codebar VARCHAR(255) NOT NULL,
    folio VARCHAR(100),
    
    -- Referencias
    uuid_padron UUID NOT NULL,
    uuid_plantilla UUID NOT NULL,
    uuid_proyecto UUID NOT NULL,
    uuid_usuario UUID NOT NULL REFERENCES usuarios(uuid_usuario),
    
    -- Tipo de documento
    tipo_documento VARCHAR(5) NOT NULL,
    
    -- Archivo generado
    ruta_pdf VARCHAR(500),
    nombre_archivo_pdf VARCHAR(255),
    
    -- Datos (misma estructura que emision_final)
    superficie_terreno NUMERIC(12,2),
    superficie_construccion NUMERIC(12,2),
    recaudadora VARCHAR(50),
    tipo VARCHAR(50),
    cuenta VARCHAR(50) NOT NULL,
    clave_cuenta VARCHAR(50),
    clave_catastral VARCHAR(50),
    fecha_emision DATE NOT NULL,
    zona VARCHAR(50),
    subzona VARCHAR(50),
    manzana VARCHAR(50),
    nombre_contribuyente VARCHAR(255),
    domicilio_contribuyente VARCHAR(500),
    ubicacion_predio VARCHAR(500),
    observaciones TEXT,
    
    impuesto NUMERIC(12,2),
    recargos NUMERIC(12,2),
    actualizacion NUMERIC(12,2),
    multa NUMERIC(12,2),
    gastos_notificacion NUMERIC(12,2),
    total_credito_fiscal NUMERIC(12,2),
    
    anio VARCHAR(4),
    adeudo VARCHAR(50),
    bimestre VARCHAR(2),
    valor_fiscal NUMERIC(15,2),
    tasa NUMERIC(8,4),
    
    pmo INTEGER NOT NULL,
    visita INTEGER NOT NULL,
    iniciales_notificador VARCHAR(10),
    estatus_captura VARCHAR(50),
    orden_impresion INTEGER,
    
    numero_afiliado VARCHAR(50),
    cp VARCHAR(10),
    telefono VARCHAR(20),
    celular VARCHAR(20),
    tipo_prestamo VARCHAR(100),
    tipo_cobranza VARCHAR(50),
    nombre_aval VARCHAR(255),
    telefono_aval VARCHAR(20),
    celular_aval VARCHAR(20),
    domicilio_aval VARCHAR(300),
    colonia_aval VARCHAR(100),
    municipio_aval VARCHAR(100),
    domicilio_garantia VARCHAR(300),
    colonia_garantia VARCHAR(100),
    poblacion_garantia VARCHAR(100),
    municipio_garantia VARCHAR(100),
    ultimo_abono DATE,
    monto_vencido NUMERIC(12,2),
    saldo_por_vencer NUMERIC(12,2),
    int_moratorio NUMERIC(12,2),
    total NUMERIC(12,2),
    
    giro VARCHAR(200),
    anuncios_anexos VARCHAR(200),
    anio_inicio VARCHAR(4),
    anio_fin VARCHAR(4),
    derechos_licencia_municipal NUMERIC(12,2),
    derechos_conservacion NUMERIC(12,2),
    derechos_anuncios NUMERIC(12,2),
    derechos_mejoramiento NUMERIC(12,2),
    productos_impresos NUMERIC(12,2),
    holograma_por_giro NUMERIC(12,2),
    solicitud_giro NUMERIC(12,2),
    total_adeudo NUMERIC(12,2),
    
    cartografia VARCHAR(255),
    prescrito VARCHAR(2),
    fecha_corte DATE,
    domicilio_fiscal VARCHAR(500),
    
    id_apa VARCHAR(50),
    cpv VARCHAR(10),
    agua_alcantarillado NUMERIC(12,2),
    colectores NUMERIC(12,2),
    infraestructura NUMERIC(12,2),
    conexiones NUMERIC(12,2),
    saldo NUMERIC(12,2),
    
    -- Metadatos
    fecha_generacion TIMESTAMP NOT NULL,
    tiempo_procesamiento_ms INTEGER,
    
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emision_acum_sesion ON emision_acumulada(uuid_sesion);
CREATE INDEX idx_emision_acum_cuenta ON emision_acumulada(cuenta);
CREATE INDEX idx_emision_acum_proyecto ON emision_acumulada(uuid_proyecto);
CREATE INDEX idx_emision_acum_usuario ON emision_acumulada(uuid_usuario);
CREATE INDEX idx_emision_acum_fecha_emision ON emision_acumulada(fecha_emision);

-- =====================================================
-- TABLA: BITACORA
-- =====================================================
CREATE TABLE bitacora (
    id_bitacora SERIAL PRIMARY KEY,
    uuid_usuario UUID REFERENCES usuarios(uuid_usuario),
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id VARCHAR(100),
    detalles JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fue_exitoso BOOLEAN DEFAULT TRUE,
    mensaje_error TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bitacora_usuario ON bitacora(uuid_usuario);
CREATE INDEX idx_bitacora_accion ON bitacora(accion);
CREATE INDEX idx_bitacora_entidad ON bitacora(entidad);
CREATE INDEX idx_bitacora_fecha ON bitacora(created_on);

COMMENT ON TABLE bitacora IS 'Registro de todas las acciones en el sistema';
COMMENT ON COLUMN bitacora.accion IS 'LOGIN, LOGOUT, CREAR_PROYECTO, EDITAR_PLANTILLA, EMISION_COMPLETADA, etc.';

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_on_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_on = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_updated_on BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_on_column();

CREATE TRIGGER update_proyectos_updated_on BEFORE UPDATE ON proyectos
    FOR EACH ROW EXECUTE FUNCTION update_updated_on_column();

CREATE TRIGGER update_plantillas_updated_on BEFORE UPDATE ON plantillas
    FOR EACH ROW EXECUTE FUNCTION update_updated_on_column();

-- =====================================================
-- FUNCIONES ÚTILES
-- =====================================================

-- Limpiar emision_temp de una sesión
CREATE OR REPLACE FUNCTION limpiar_emision_temp(p_uuid_sesion UUID)
RETURNS void AS $$
BEGIN
    DELETE FROM emision_temp WHERE uuid_sesion = p_uuid_sesion;
END;
$$ LANGUAGE plpgsql;

-- Calcular siguiente PMO
CREATE OR REPLACE FUNCTION calcular_siguiente_pmo(p_uuid_proyecto UUID)
RETURNS INTEGER AS $$
DECLARE
    v_ultimo_pmo INTEGER;
BEGIN
    SELECT COALESCE(MAX(pmo), 0) INTO v_ultimo_pmo
    FROM emision_acumulada
    WHERE uuid_proyecto = p_uuid_proyecto;
    
    RETURN v_ultimo_pmo + 1;
END;
$$ LANGUAGE plpgsql;

-- Calcular siguiente visita
CREATE OR REPLACE FUNCTION calcular_siguiente_visita(p_cuenta VARCHAR, p_uuid_proyecto UUID)
RETURNS INTEGER AS $$
DECLARE
    v_ultima_visita INTEGER;
BEGIN
    SELECT COALESCE(MAX(visita), 0) INTO v_ultima_visita
    FROM emision_acumulada
    WHERE cuenta = p_cuenta
    AND uuid_proyecto = p_uuid_proyecto;
    
    RETURN v_ultima_visita + 1;
END;
$$ LANGUAGE plpgsql;

-- Generar CODEBAR
CREATE OR REPLACE FUNCTION generar_codebar(
    p_cuenta VARCHAR,
    p_tipo_documento VARCHAR,
    p_visita INTEGER
)
RETURNS VARCHAR AS $$
DECLARE
    v_timestamp BIGINT;
    v_codebar VARCHAR;
BEGIN
    v_timestamp := EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;
    v_codebar := '*' || p_cuenta || v_timestamp || p_tipo_documento || p_visita || '*';
    RETURN v_codebar;
END;
$$ LANGUAGE plpgsql;

-- Verificar ultimo_abono (NULL si > 5 años)
CREATE OR REPLACE FUNCTION verificar_ultimo_abono(p_fecha DATE)
RETURNS DATE AS $$
BEGIN
    IF p_fecha IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF p_fecha < (CURRENT_DATE - INTERVAL '5 years') THEN
        RETURN NULL;
    END IF;
    
    RETURN p_fecha;
END;
$$ LANGUAGE plpgsql;

-- Calcular prescrito
CREATE OR REPLACE FUNCTION calcular_prescrito(p_anio_inicio INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_anio_actual INTEGER;
BEGIN
    v_anio_actual := EXTRACT(YEAR FROM CURRENT_DATE);
    
    IF (v_anio_actual - p_anio_inicio) > 5 THEN
        RETURN 'PR';
    ELSE
        RETURN '';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Registrar en bitácora
CREATE OR REPLACE FUNCTION registrar_bitacora(
    p_uuid_usuario UUID,
    p_accion VARCHAR,
    p_entidad VARCHAR,
    p_entidad_id VARCHAR DEFAULT NULL,
    p_detalles JSONB DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL,
    p_fue_exitoso BOOLEAN DEFAULT TRUE,
    p_mensaje_error TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO bitacora (
        uuid_usuario,
        accion,
        entidad,
        entidad_id,
        detalles,
        ip_address,
        fue_exitoso,
        mensaje_error
    ) VALUES (
        p_uuid_usuario,
        p_accion,
        p_entidad,
        p_entidad_id,
        p_detalles,
        p_ip_address,
        p_fue_exitoso,
        p_mensaje_error
    );
END;
$$ LANGUAGE plpgsql;

-- Manejar intento de login fallido
CREATE OR REPLACE FUNCTION manejar_intento_login_fallido(p_username VARCHAR)
RETURNS void AS $$
DECLARE
    v_intentos INTEGER;
BEGIN
    UPDATE usuarios 
    SET intentos_login_fallidos = intentos_login_fallidos + 1,
        ultimo_intento_login = CURRENT_TIMESTAMP
    WHERE username = p_username
    RETURNING intentos_login_fallidos INTO v_intentos;
    
    IF v_intentos >= 5 THEN
        UPDATE usuarios
        SET bloqueado_hasta = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
        WHERE username = p_username;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Resetear intentos de login
CREATE OR REPLACE FUNCTION resetear_intentos_login(p_username VARCHAR)
RETURNS void AS $$
BEGIN
    UPDATE usuarios 
    SET intentos_login_fallidos = 0,
        bloqueado_hasta = NULL,
        last_login = CURRENT_TIMESTAMP
    WHERE username = p_username;
END;
$$ LANGUAGE plpgsql;

-- Obtener columnas disponibles de un padrón
CREATE OR REPLACE FUNCTION obtener_columnas_padron(p_nombre_padron VARCHAR)
RETURNS TABLE(nombre_columna VARCHAR, tipo_dato VARCHAR) AS $$
DECLARE
    v_tabla_nombre VARCHAR;
BEGIN
    -- Mapear nombre de padrón a nombre de tabla
    CASE p_nombre_padron
        WHEN 'TLAJOMULCO_APA' THEN
            v_tabla_nombre := 'padron_completo_tlajomulco_apa';
        WHEN 'TLAJOMULCO_PREDIAL' THEN
            v_tabla_nombre := 'padron_completo_tlajomulco_predial';
        WHEN 'GUADALAJARA_PREDIAL' THEN
            v_tabla_nombre := 'padron_completo_guadalajara_predial_principal';
        WHEN 'GUADALAJARA_LICENCIAS' THEN
            v_tabla_nombre := 'padron_completo_guadalajara_licencias_principal';
        WHEN 'PENSIONES' THEN
            v_tabla_nombre := 'padron_completo_pensiones';
        ELSE
            RAISE EXCEPTION 'Padrón no reconocido: %', p_nombre_padron;
    END CASE;
    
    RETURN QUERY
    SELECT 
        column_name::VARCHAR,
        data_type::VARCHAR
    FROM information_schema.columns
    WHERE table_name = v_tabla_nombre
    AND column_name NOT IN ('uuid_padron', 'uuid_proyecto')
    ORDER BY ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTAS
-- =====================================================

-- Vista de emisiones completas
CREATE OR REPLACE VIEW v_emisiones_completas AS
SELECT 
    ea.*,
    p.nombre_proyecto,
    pl.nombre_plantilla,
    ip.nombre_padron,
    u.nombre || ' ' || u.apellido as nombre_usuario,
    se.estado as estado_sesion,
    se.total_registros,
    se.registros_exitosos
FROM emision_acumulada ea
JOIN proyectos p ON ea.uuid_proyecto = p.uuid_proyecto
JOIN plantillas pl ON ea.uuid_plantilla = pl.uuid_plantilla
JOIN identificador_padron ip ON ea.uuid_padron = ip.uuid_padron
JOIN usuarios u ON ea.uuid_usuario = u.uuid_usuario
JOIN sesiones_emision se ON ea.uuid_sesion = se.uuid_sesion;

-- Vista de resumen por proyecto
CREATE OR REPLACE VIEW v_resumen_emisiones_proyecto AS
SELECT 
    p.uuid_proyecto,
    p.nombre_proyecto,
    COUNT(ea.id_acumulada) as total_emisiones,
    SUM(ea.total_credito_fiscal) as suma_credito_fiscal,
    COUNT(DISTINCT ea.uuid_sesion) as total_sesiones,
    MIN(ea.created_on) as primera_emision,
    MAX(ea.created_on) as ultima_emision
FROM proyectos p
LEFT JOIN emision_acumulada ea ON p.uuid_proyecto = ea.uuid_proyecto
GROUP BY p.uuid_proyecto, p.nombre_proyecto;

-- Vista de estadísticas por usuario
CREATE OR REPLACE VIEW v_estadisticas_usuario AS
SELECT 
    u.uuid_usuario,
    u.nombre || ' ' || u.apellido as nombre_completo,
    u.username,
    COUNT(DISTINCT se.uuid_sesion) as total_sesiones,
    COUNT(ea.id_acumulada) as total_emisiones,
    SUM(se.registros_exitosos) as total_pdfs_generados,
    MAX(se.tiempo_inicio) as ultima_actividad
FROM usuarios u
LEFT JOIN sesiones_emision se ON u.uuid_usuario = se.uuid_usuario
LEFT JOIN emision_acumulada ea ON u.uuid_usuario = ea.uuid_usuario
GROUP BY u.uuid_usuario, u.nombre, u.apellido, u.username;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Usuario admin por defecto
-- Contraseña: Admin123!
INSERT INTO usuarios (
    nombre,
    apellido,
    username,
    email,
    contrasena,
    is_active
) VALUES (
    'Administrador',
    'Sistema',
    'admin',
    'admin@sistema.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5oDhLkVdyGYYu',
    TRUE
);

-- Registrar en bitácora
INSERT INTO bitacora (
    uuid_usuario,
    accion,
    entidad,
    detalles
) VALUES (
    (SELECT uuid_usuario FROM usuarios WHERE username = 'admin'),
    'CREAR_USUARIO',
    'USUARIO',
    '{"mensaje": "Usuario administrador creado durante inicialización"}'
);