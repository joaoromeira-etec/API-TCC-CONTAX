CREATE TABLE USUARIOS (
    usu_id INT PRIMARY KEY AUTO_INCREMENT,
    usu_nome VARCHAR(32) NOT NULL,
    usu_email VARCHAR(60) NOT NULL,
    usu_cpf VARCHAR(11) NOT NULL,
    usu_senha_hash VARCHAR(255) NOT NULL,
    usu_telefone VARCHAR(15) NOT NULL,
    usu_status BIT NOT NULL, -- 0-Inativo; 1-Ativo
    usu_alterar_senha BIT NOT NULL -- 0-Não Alterado; 1-Alterado
);

CREATE TABLE EMPRESAS (
    emp_id INT PRIMARY KEY AUTO_INCREMENT,
    emp_nome_fantasia VARCHAR(100) NOT NULL,
    emp_razao_social VARCHAR(150) NOT NULL,
    emp_cnpj VARCHAR(14) UNIQUE NOT NULL,
    emp_endereco VARCHAR(255) NOT NULL,
    emp_municipio VARCHAR(100) NOT NULL,
    emp_telefone VARCHAR(15) NOT NULL,
    emp_email VARCHAR(100) NOT NULL,
    emp_senha_hash VARCHAR(255) NOT NULL,
    emp_tipo BIT NOT NULL, -- 0-ME; 1-MEI
    emp_status TINYINT NOT NULL -- 0-Inativo; 1-Ativa; 2-Inapta (Alterado de BIT para TINYINT)
);

CREATE TABLE USUARIO_EMPRESAS (
    usu_emp_id INT PRIMARY KEY AUTO_INCREMENT,
    emp_id INT,
    usu_id INT,
    usu_emp_nivel_acesso TINYINT NOT NULL, -- 0-Visualizador; 1-Gerente; 2-Administrador, Gerente só pode adicionar visualizador
    usu_emp_data_vinculo DATE NOT NULL,
    usu_emp_status BIT NOT NULL, -- 0-Inativo; 1-Ativo
    usu_emp_observacoes VARCHAR(200),
    FOREIGN KEY (emp_id) REFERENCES EMPRESAS(emp_id),
    FOREIGN KEY (usu_id) REFERENCES USUARIOS(usu_id)
);

CREATE TABLE REGIME (
    regi_id INT PRIMARY KEY AUTO_INCREMENT,
    regi_nome VARCHAR(50) NOT NULL,
    regi_descricao VARCHAR(150) NOT NULL,
    regi_limite_faturamento_anual DECIMAL(12,2) NOT NULL,
    regi_tipo_emp_permitida TINYINT NOT NULL, -- 0-Simples Nacional; 1-Lucro Presumido; 2-Lucro Real
    regi_status BIT NOT NULL -- 0-Inativo; 1-Ativo
);

CREATE TABLE REGIME_EMPRESA (
    regi_emp_id INT PRIMARY KEY AUTO_INCREMENT,
    regi_id INT,
    emp_id INT,
    regi_emp_data_inicio DATE NOT NULL,
    regi_emp_data_fim DATE,
    regi_emp_motivo_alteracao VARCHAR(100),
    regi_emp_status TINYINT NOT NULL, -- 0-Encerrado; 1-Ativo; 2-Suspenso
    regi_emp_observacoes VARCHAR(50),
    FOREIGN KEY (regi_id) REFERENCES REGIME(regi_id),
    FOREIGN KEY (emp_id) REFERENCES EMPRESAS(emp_id)
);

CREATE TABLE TIPO_DOCUMENTOS (
    tpd_id INT PRIMARY KEY AUTO_INCREMENT,
    tpd_descricao VARCHAR(30) NOT NULL,
    tpd_status BIT NOT NULL -- 0-Inativo; 1-Ativo
);


CREATE TABLE DOCUMENTOS (
    doc_id INT PRIMARY KEY AUTO_INCREMENT,
    usu_id INT,
    emp_id INT,
    tpd_id INT,
    doc_caminho_arquivo VARCHAR(255) NOT NULL,
    doc_nome_original VARCHAR(150) NOT NULL,
    doc_data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    doc_status BIT NOT NULL, -- 0-Inativo; 1-Ativo
    FOREIGN KEY (usu_id) REFERENCES USUARIOS(usu_id),
    FOREIGN KEY (emp_id) REFERENCES EMPRESAS(emp_id),
    FOREIGN KEY (tpd_id) REFERENCES TIPO_DOCUMENTOS(tpd_id)
);

CREATE TABLE FINANCEIRO (
    fin_id INT PRIMARY KEY AUTO_INCREMENT,
    doc_id INT NOT NULL,
    fin_valor_total DECIMAL(10,2) NOT NULL,
    fin_categoria ENUM('Faturamento', 'Imposto', 'Despesa') NOT NULL,
    fin_status BIT NOT NULL,
    fin_data_emissao DATE,
    FOREIGN KEY (doc_id) REFERENCES DOCUMENTOS(doc_id) ON DELETE CASCADE
);

CREATE TABLE PRAZOS (
    praz_id INT PRIMARY KEY AUTO_INCREMENT,
    emp_id INT,
    praz_descricao VARCHAR(50) NOT NULL,
    praz_data_vencimento DATE NOT NULL,
    praz_status TINYINT NOT NULL, -- 0-Pendente; 1-Concluído; 2-Vencido
    FOREIGN KEY (emp_id) REFERENCES EMPRESAS(emp_id)
);

CREATE TABLE AUDITORIA (
    aud_id INT PRIMARY KEY AUTO_INCREMENT,
    usu_id INT,
    aud_acao TINYINT NOT NULL COMMENT '0-Inserção; 1-Edição; 2-Exclusão',
    aud_tabela_afetada VARCHAR(64) NOT NULL,
    aud_registro_afetado INT NOT NULL,
    aud_descricao VARCHAR(255) DEFAULT NULL,
    aud_operacao VARCHAR(100) DEFAULT NULL,
    aud_ip VARCHAR(45) DEFAULT NULL,
    aud_user_agent VARCHAR(255) DEFAULT NULL,
    aud_data_acao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aud_status TINYINT NOT NULL DEFAULT 1 COMMENT '1-Ativo; 0-Inativo',
    FOREIGN KEY (usu_id) REFERENCES USUARIOS(usu_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_aud_data_acao (aud_data_acao),
    INDEX idx_aud_tabela_afetada (aud_tabela_afetada),
    INDEX idx_aud_status (aud_status),
    CHECK (aud_acao IN (0, 1, 2)),
    CHECK (aud_status IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;