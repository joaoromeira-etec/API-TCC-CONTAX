-- Inserts para USUARIOS
INSERT INTO USUARIOS (usu_id, usu_nome, usu_email, usu_cpf, usu_senha_hash, usu_telefone, usu_status, usu_alterar_senha) VALUES
(1, 'Ana Silva', 'ana@email.com', '12345678901', 'hash1', '11999990001', 1, 0),
(2, 'Bruno Souza', 'bruno@email.com', '23456789012', 'hash2', '11999990002', 1, 1),
(3, 'Carla Dias', 'carla@email.com', '34567890123', 'hash3', '11999990003', 0, 0),
(4, 'Daniel Lima', 'daniel@email.com', '45678901234', 'hash4', '11999990004', 1, 1),
(5, 'Eduarda Melo', 'eduarda@email.com', '56789012345', 'hash5', '11999990005', 1, 0),
(6, 'Felipe Costa', 'felipe@email.com', '67890123456', 'hash6', '11999990006', 0, 1);

-- Inserts para EMPRESAS (incluído emp_senha_hash e emp_status)
INSERT INTO EMPRESAS 
(emp_id, emp_nome_fantasia, emp_razao_social, emp_cnpj, emp_endereco, emp_municipio, emp_telefone, emp_email, emp_senha_hash, emp_tipo, emp_status) 
VALUES
(1, 'Tech Solutions', 'Tech Solutions LTDA', '12345678000101', 'Rua A, 100', 'São Paulo', '(11) 3333-1001', 'contato@techsolutions.com', '$2b$10$hashempresa1', 1, 1),
(2, 'Comercial Dias', 'Comercial Dias ME', '23456789000102', 'Rua B, 200', 'Campinas', '(11) 3333-2002', 'vendas@comercialdias.com', '$2b$10$hashempresa2', 0, 1),
(3, 'Melo Serviços', 'Melo Serviços EIRELI', '34567890000103', 'Rua C, 300', 'Santos', '(11) 3333-3003', 'suporte@meloservicos.com', '$2b$10$hashempresa3', 1, 1),
(4, 'Lima Store', 'Lima Store MEI', '45678901000104', 'Rua D, 400', 'Sorocaba', '(11) 3333-4004', 'contato@limastore.com', '$2b$10$hashempresa4', 1, 1),
(5, 'Costa Market', 'Costa Market LTDA', '56789012000105', 'Rua E, 500', 'Ribeirão Preto', '(11) 3333-5005', 'atendimento@costamarket.com', '$2b$10$hashempresa5', 1, 1),
(6, 'Silva Digital', 'Silva Digital ME', '67890123000106', 'Rua F, 600', 'São Bernardo do Campo', '(11) 3333-6006', 'info@silvadigital.com', '$2b$10$hashempresa6', 0, 0);

-- Inserts para USUARIO_EMPRESAS
INSERT INTO USUARIO_EMPRESAS 
(emp_id, usu_id, usu_emp_nivel_acesso, usu_emp_data_vinculo, usu_emp_status, usu_emp_observacoes) 
VALUES
(1, 1, 1, '2023-01-01', 1, 'Gerente'),
(2, 2, 2, '2023-02-01', 1, 'Administrador'),
(3, 3, 0, '2023-03-01', 0, 'Inativo'),
(4, 4, 2, '2023-04-01', 1, 'Financeiro'),
(5, 5, 1, '2023-05-01', 1, 'RH'),
(6, 6, 2, '2023-06-01', 1, 'TI');

-- Inserts para REGIME
INSERT INTO REGIME (regi_id, regi_nome, regi_descricao, regi_limite_faturamento_anual, regi_tipo_emp_permitida, regi_status) VALUES
(1, 'Simples Nacional', 'Regime para pequenas empresas', 4800000.00, 0, 1),
(2, 'Lucro Presumido', 'Regime para médias empresas', 78000000.00, 1, 1),
(3, 'Lucro Real', 'Regime para grandes empresas', 999999999.99, 2, 1),
(4, 'MEI', 'Microempreendedor Individual', 81000.00, 0, 1),
(5, 'Especial', 'Regime especial', 1000000.00, 1, 1),
(6, 'Isento', 'Isento de regime', 0.00, 2, 1);

-- Inserts para REGIME_EMPRESA
INSERT INTO REGIME_EMPRESA 
(regi_emp_id, regi_id, emp_id, regi_emp_data_inicio, regi_emp_data_fim, regi_emp_motivo_alteracao, regi_emp_status, regi_emp_observacoes) VALUES
(1, 1, 1, '2023-01-01', NULL, NULL, 1, 'Ativo'),
(2, 2, 2, '2023-02-01', NULL, NULL, 1, 'Ativo'),
(3, 3, 3, '2023-03-01', NULL, NULL, 1, 'Ativo'),
(4, 4, 4, '2023-04-01', '2023-12-31', 'Mudança para outro regime', 0, 'Encerrado'),
(5, 5, 5, '2023-05-01', '2023-12-31', 'Encerramento da empresa', 0, 'Encerrado'),
(6, 6, 6, '2023-06-01', '2023-12-31', 'Revisão anual', 2, 'Suspenso');

-- Inserts para TIPO_DOCUMENTOS
INSERT INTO TIPO_DOCUMENTOS (tpd_id, tpd_descricao, tpd_status) VALUES
(1, 'Nota Fiscal', 1),
(2, 'Recibo', 1),
(3, 'Contrato', 1),
(4, 'Boleto', 1),
(5, 'Comprovante', 1),
(6, 'Outros', 1);

-- Inserts para DOCUMENTOS
INSERT INTO DOCUMENTOS (doc_id, usu_id, emp_id, tpd_id, doc_arquivo_nome, doc_data_emissao, doc_valor, doc_status) VALUES
(1, 1, 1, 1, 'nf1.pdf', '2023-01-09', 1000.00, 1),
(2, 2, 2, 2, 'recibo1.pdf', '2023-02-09', 500.00, 1),
(3, 3, 3, 3, 'contrato1.pdf', '2023-03-09', 2000.00, 1),
(4, 4, 4, 4, 'boleto1.pdf', '2023-04-09', 300.00, 1),
(5, 5, 5, 5, 'comprovante1.pdf', '2023-05-09', 150.00, 1),
(6, 6, 6, 6, 'outros1.pdf', '2023-06-09', 250.00, 1);

-- Inserts para PRAZOS
INSERT INTO PRAZOS (praz_id, emp_id, praz_descricao, praz_data_vencimento, praz_status) VALUES
(1, 1, 'Entrega IRPJ', '2023-03-31', 0),
(2, 2, 'Pagamento DAS', '2023-04-20', 1),
(3, 3, 'Entrega DCTF', '2023-05-15', 2),
(4, 4, 'Reunião Fiscal', '2023-06-10', 0),
(5, 5, 'Envio NF-e', '2023-07-05', 1),
(6, 6, 'Revisão Contrato', '2023-08-12', 2);

-- Inserts para AUDITORIA (removido aud_status e usando DATETIME)
INSERT INTO AUDITORIA (aud_id, usu_id, aud_acao, aud_tabela_afetada, aud_registro_afetado, aud_data_acao) VALUES
(1, 1, 0, 'USUARIOS', 1, '2023-01-01 00:00:00'),
(2, 2, 1, 'EMPRESAS', 2, '2023-02-01 00:00:00'),
(3, 3, 2, 'DOCUMENTOS', 3, '2023-03-01 00:00:00'),
(4, 4, 0, 'REGIME', 4, '2023-04-01 00:00:00'),
(5, 5, 1, 'PRAZOS', 5, '2023-05-01 00:00:00'),
(6, 6, 2, 'SUPORTE', 6, '2023-06-01 00:00:00');