CREATE TABLE embargos_historico (
    id SERIAL PRIMARY KEY,
    documento VARCHAR(20) NOT NULL,
    expediente VARCHAR(50) NOT NULL,
    placa VARCHAR(10) NOT NULL,
    vigencia VARCHAR(4) NOT NULL,
    nombre_completo VARCHAR(255),
    sade VARCHAR(50),
    valor_embargo VARCHAR(50),
    fecha_generacion_mp VARCHAR(20),
    creado_en TIMESTAMP DEFAULT NOW(),
    UNIQUE (expediente)
);

CREATE INDEX idx_historico_doc_placa_vigencia ON embargos_historico(documento, placa, vigencia);