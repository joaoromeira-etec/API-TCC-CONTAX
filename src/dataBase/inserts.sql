-- Inserts para USUARIOS
INSERT INTO USUARIOS (usu_id, usu_nome, usu_email, usu_cpf, usu_senha_hash, usu_telefone, usu_status, usu_alterar_senha) VALUES
(1, 'Ana Silva', 'ana@email.com', '12345678901', 'hash1', '11999990001', 1, 0),
(2, 'Bruno Souza', 'bruno@email.com', '23456789012', 'hash2', '11999990002', 1, 1),
(3, 'Carla Dias', 'carla@email.com', '34567890123', 'hash3', '11999990003', 0, 0),
(4, 'Daniel Lima', 'daniel@email.com', '45678901234', 'hash4', '11999990004', 1, 1),
(5, 'Eduarda Melo', 'eduarda@email.com', '56789012345', 'hash5', '11999990005', 1, 0),
(6, 'Felipe Costa', 'felipe@email.com', '67890123456', 'hash6', '11999990006', 0, 1);

-- Inserts para EMPRESAS (regras de MEI aplicadas e inclusão de status 2 - Inapta)
INSERT INTO EMPRESAS 
(emp_id, emp_nome_fantasia, emp_razao_social, emp_cnpj, emp_endereco, emp_municipio, emp_telefone, emp_email, emp_senha_hash, emp_tipo, emp_status) 
VALUES
(1, 'Tech Solutions', 'Tech Solutions LTDA', '12345678000101', 'Rua A, 100', 'São Paulo', '(11) 3333-1001', 'contato@techsolutions.com', '$2b$10$hashempresa1', 0, 1), -- Mudado para ME(0) pois é LTDA
(2, 'Comercial Dias', 'Comercial Dias ME', '23456789000102', 'Rua B, 200', 'Campinas', '(11) 3333-2002', 'vendas@comercialdias.com', '$2b$10$hashempresa2', 0, 1),
(3, 'Melo Serviços', 'ROBERTO MELO 34567890003', '34567890000103', 'Rua C, 300', 'Santos', '(11) 3333-3003', 'suporte@meloservicos.com', '$2b$10$hashempresa3', 1, 1), -- Ajustado padrão Razão Social MEI
(4, 'Lima Store', 'CARLOS LIMA 45678901004', '45678901000104', 'Rua D, 400', 'Sorocaba', '(11) 3333-4004', 'contato@limastore.com', '$2b$10$hashempresa4', 1, 1), -- Ajustado padrão Razão Social MEI
(5, 'Costa Market', 'Costa Market LTDA', '56789012000105', 'Rua E, 500', 'Ribeirão Preto', '(11) 3333-5005', 'atendimento@costamarket.com', '$2b$10$hashempresa5', 0, 1), -- Mudado para ME(0) pois é LTDA
(6, 'Silva Digital', 'Silva Digital ME', '67890123000106', 'Rua F, 600', 'São Bernardo do Campo', '(11) 3333-6006', 'info@silvadigital.com', '$2b$10$hashempresa6', 0, 0), -- Inativa
(7, 'Souza Conexões', 'ANA SOUZA 78901234007', '78901234000107', 'Rua G, 700', 'Ourinhos', '(14) 3322-7007', 'ana@souzaconexoes.com', '$2b$10$hashempresa7', 1, 2); -- Empresa MEI criada como INAPTA (status 2) para testes!

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
INSERT INTO DOCUMENTOS
(doc_id, usu_id, emp_id, tpd_id, doc_caminho_arquivo, doc_nome_original, doc_data_upload, doc_status) VALUES
(1, 1, 1, 1, 'uploads/nf1.pdf', 'nf1.pdf', '2023-01-09 08:00:00', 1),
(2, 2, 2, 2, 'uploads/recibo1.pdf', 'recibo1.pdf', '2023-02-09 08:00:00', 1),
(3, 3, 3, 3, 'uploads/contrato1.pdf', 'contrato1.pdf', '2023-03-09 08:00:00', 1),
(4, 4, 4, 4, 'uploads/boleto1.pdf', 'boleto1.pdf', '2023-04-09 08:00:00', 1),
(5, 5, 5, 5, 'uploads/comprovante1.pdf', 'comprovante1.pdf', '2023-05-09 08:00:00', 1),
(6, 6, 6, 6, 'uploads/outros1.pdf', 'outros1.pdf', '2023-06-09 08:00:00', 1);

-- Inserts pra FINANCEIRO
INSERT INTO FINANCEIRO
(fin_id, doc_id, fin_valor_total, fin_categoria,  fin_status, fin_data_emissao) VALUES
(1, 1, 5000.00, 'Faturamento', 1, '2026-06-01'),
(2, 2, 1200.00, 'Imposto', 1, '2026-06-05'),
(3, 3, 800.00, 'Despesa', 1, '2026-06-10'),
(4, 4, 3500.00, 'Faturamento', 1, '2026-06-12'),
(5, 5, 400.00, 'Despesa', 1, '2026-06-15'),
(6, 6, 600.00, 'Imposto', 1, '2026-06-18'),

-- Inserts para PRAZOS
INSERT INTO PRAZOS (praz_id, emp_id, praz_descricao, praz_status, praz_data_vencimento) VALUES
(1, 1, 'Entrega IRPJ', 0, '2023-03-31'),
(2, 2, 'Pagamento DAS', 1, '2023-04-20'),
(3, 3, 'Entrega DCTF', 2, '2023-05-15'),
(4, 4, 'Reunião Fiscal', 0, '2023-06-10'),
(5, 5, 'Envio NF-e', 1, '2023-07-05'),
(6, 6, 'Revisão Contrato', 2, '2023-08-12');

-- Inserts para AUDITORIA (removido aud_status e usando DATETIME)
INSERT INTO AUDITORIA (aud_id,  usu_id,  aud_acao,  aud_tabela_afetada,  aud_registro_afetado,  aud_descricao,  aud_operacao,  aud_ip,  aud_user_agent,  aud_data_acao,  aud_status) VALUES
(1, 1, 0, 'USUARIOS', 1, 'Criação do usuário administrador inicial.', 'INSERT_USER', '127.0.0.1', 'Insomnia Rest Client', '2023-01-01 00:00:00', 1),
(2, 2, 1, 'EMPRESAS', 2, 'Atualização dos dados cadastrais da empresa.', 'UPDATE_COMPANY', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-01 00:00:00', 1),
(3, 3, 2, 'DOCUMENTOS', 3, 'Exclusão de documento duplicado pelo usuário.', 'DELETE_DOCUMENT', '192.168.1.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', '2023-03-01 00:00:00', 1),
(4, 4, 0, 'REGIME', 4, 'Cadastro de novo regime tributário para teste.', 'INSERT_REGIME', '127.0.0.1', 'Insomnia Rest Client', '2023-04-01 00:00:00', 1),
(5, 5, 1, 'PRAZOS', 5, 'Alteração na data de vencimento da obrigação.', 'UPDATE_DEADLINE', '192.168.1.55', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-05-01 00:00:00', 1),
(6, 6, 2, 'SUPORTE', 6, 'Encerramento de chamado de suporte técnico.', 'DELETE_SUPPORT', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 10)', '2023-06-01 00:00:00', 1);