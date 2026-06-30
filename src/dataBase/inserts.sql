-- Inserts para USUARIOS
INSERT INTO USUARIOS
(usu_id, usu_nome, usu_email, usu_cpf, usu_senha_hash, usu_telefone, usu_status, usu_alterar_senha)
VALUES
(1,'Ana Silva','ana@email.com','12345678901','hash1','11999990001',1,0),
(2,'Bruno Souza','bruno@email.com','23456789012','hash2','11999990002',1,1),
(3,'Carla Dias','carla@email.com','34567890123','hash3','11999990003',0,0),
(4,'Daniel Lima','daniel@email.com','45678901234','hash4','11999990004',1,1),
(5,'Eduarda Melo','eduarda@email.com','56789012345','hash5','11999990005',1,0),
(6,'Felipe Costa','felipe@email.com','67890123456','hash6','11999990006',0,1),
(7,'Gabriel Oliveira','gabriel@email.com','78901234567','hash7','11999990007',1,0),
(8,'Helena Martins','helena@email.com','89012345678','hash8','11999990008',0,1),
(9,'Igor Fernandes','igor@email.com','90123456789','hash9','11999990009',1,1),
(10,'Juliana Rocha','juliana@email.com','01234567890','hash10','11999990010',1,0);

-- Inserts para EMPRESAS (regras de MEI aplicadas e inclusão de status 2 - Inapta)
INSERT INTO EMPRESAS
(emp_id,emp_nome_fantasia,emp_razao_social,emp_cnpj,emp_endereco,emp_municipio,emp_telefone,emp_email,emp_senha_hash,emp_tipo,emp_status)
VALUES

(1,'Tech Solutions','Tech Solutions LTDA','12345678000101','Rua A,100','São Paulo','11999991001','contato@tech.com','hashemp1',0,1),
(2,'Comercial Dias','Comercial Dias LTDA','23456789000102','Rua B,200','Campinas','11999991002','dias@email.com','hashemp2',0,1),
(3,'Melo Serviços','ROBERTO MELO 34567890003','34567890000103','Rua C,300','Santos','11999991003','melo@email.com','hashemp3',1,1),
(4,'Lima Store','CARLOS LIMA 45678901004','45678901000104','Rua D,400','Sorocaba','11999991004','lima@email.com','hashemp4',1,0),
(5,'Costa Market','Costa Market LTDA','56789012000105','Rua E,500','Ribeirão Preto','11999991005','costa@email.com','hashemp5',0,2),
(6,'Silva Digital','Silva Digital LTDA','67890123000106','Rua F,600','São Bernardo do Campo','11999991006','silva@email.com','hashemp6',0,0),
(7,'Souza Conexões','ANA SOUZA 78901234007','78901234000107','Rua G,700','Ourinhos','14999991007','souza@email.com','hashemp7',1,2),
(8,'Alpha Contábil','Alpha Contábil LTDA','89012345000108','Rua H,800','Bauru','14999991008','alpha@email.com','hashemp8',0,1),
(9,'Oficina Oliveira','PAULO OLIVEIRA 90123456009','90123456000109','Rua I,900','Marília','14999991009','oliveira@email.com','hashemp9',1,1),
(10,'Mercadinho União','Mercadinho União LTDA','11223344000110','Rua J,1000','Assis','14999991010','mercado@email.com','hashemp10',0,1);

-- Inserts para USUARIO_EMPRESAS
INSERT INTO USUARIO_EMPRESAS
(usu_emp_id,emp_id,usu_id,usu_emp_nivel_acesso,usu_emp_data_vinculo,usu_emp_status,usu_emp_observacoes)
VALUES
(1,1,1,2,'2024-01-05',1,'Administrador Geral'),
(2,2,2,1,'2024-01-10',1,'Gerente Financeiro'),
(3,3,3,0,'2024-01-15',0,'Usuário desligado'),
(4,4,4,2,'2024-02-01',1,'Administrador'),
(5,5,5,1,'2024-02-10',1,'Gerente'),
(6,6,6,0,'2024-03-01',0,'Sem acesso'),
(7,7,7,2,'2024-03-15',1,'Administrador'),
(8,8,8,1,'2024-04-01',1,'Gerente RH'),
(9,9,9,0,'2024-04-20',1,'Visualizador');

(10,10,10,2,'2024-05-01',1,'Administrador Principal');

-- Inserts para REGIME
INSERT INTO REGIME
(regi_id, regi_nome, regi_descricao, regi_limite_faturamento_anual, regi_tipo_emp_permitida, regi_status)
VALUES
(1,'Simples Nacional','Regime destinado principalmente para micro e pequenas empresas.',4800000.00,0,1),
(2,'Lucro Presumido','Regime destinado para empresas de médio porte.',78000000.00,1,1),
(3,'Lucro Real','Regime obrigatório para determinadas empresas.',999999999.99,2,1),
(4,'MEI','Microempreendedor Individual.',81000.00,0,1),
(5,'Regime Especial','Regime criado para empresas com tributação específica.',1000000.00,1,1),
(6,'Regime Isento','Empresas dispensadas de determinado recolhimento.',0.00,2,0);

-- Inserts para REGIME_EMPRESA
INSERT INTO REGIME_EMPRESA
(regi_emp_id,regi_id,emp_id,regi_emp_data_inicio,regi_emp_data_fim,regi_emp_motivo_alteracao,regi_emp_status,regi_emp_observacoes)
VALUES
(1,1,1,'2025-01-01',NULL,NULL,1,'Regime atual'),
(2,2,2,'2025-01-01',NULL,NULL,1,'Empresa em expansão'),
(3,4,3,'2025-01-01',NULL,NULL,1,'MEI ativo'),
(4,4,4,'2024-01-01','2025-01-31','Empresa tornou-se ME',0,'Regime encerrado'),
(5,1,5,'2024-03-01','2025-02-15','Empresa declarada inapta',0,'Encerrado'),
(6,3,6,'2025-01-01',NULL,'Pendência documental',2,'Suspenso'),
(7,4,7,'2025-02-01',NULL,'Pendências na Receita',2,'Suspenso'),
(8,1,8,'2025-03-01',NULL,NULL,1,'Regular'),
(9,4,9,'2025-04-01',NULL,NULL,1,'MEI Regular'),
(10,2,10,'2025-05-01',NULL,NULL,1,'Lucro Presumido');

-- Inserts para TIPO_DOCUMENTOS
INSERT INTO TIPO_DOCUMENTOS
(tpd_id,tpd_descricao,tpd_status)
VALUES

(1,'Nota Fiscal',1),
(2,'Recibo',1),
(3,'Contrato',1),
(4,'Boleto',1),
(5,'Comprovante',1),
(6,'Relatório Contábil',1),
(7,'Declaração',1),
(8,'Outros',0);

-- Inserts para DOCUMENTOS
INSERT INTO DOCUMENTOS
(doc_id, usu_id, emp_id, tpd_id, doc_caminho_arquivo, doc_nome_original, doc_data_upload, doc_status)
VALUES

(1,1,1,1,'uploads/nf_001.pdf','NF_Janeiro.pdf','2026-01-05 08:30:00',1),

(2,2,2,2,'uploads/recibo_001.pdf','Recibo_Fevereiro.pdf','2026-01-10 09:00:00',1),

(3,3,3,3,'uploads/contrato_001.pdf','Contrato_Servico.pdf','2026-01-15 10:00:00',0),

(4,4,4,4,'uploads/boleto_001.pdf','Boleto_Janeiro.pdf','2026-01-20 08:00:00',1),

(5,5,5,5,'uploads/comprovante_001.pdf','Comprovante_Pagamento.pdf','2026-01-25 14:30:00',1),

(6,6,6,6,'uploads/relatorio_001.pdf','Relatorio_Contabil.pdf','2026-02-01 11:20:00',0),

(7,7,7,7,'uploads/declaracao_001.pdf','Declaracao_Anual.pdf','2026-02-05 13:10:00',1),

(8,8,8,8,'uploads/outros_001.pdf','Arquivo_Diverso.pdf','2026-02-10 15:00:00',1),

(9,9,9,1,'uploads/nf_002.pdf','NF_Fevereiro.pdf','2026-02-15 09:15:00',1),

(10,10,10,2,'uploads/recibo_002.pdf','Recibo_Marco.pdf','2026-02-20 10:10:00',1),

(11,1,2,3,'uploads/contrato_002.pdf','Contrato_Cliente.pdf','2026-03-01 09:00:00',1),

(12,2,3,4,'uploads/boleto_002.pdf','Boleto_Fevereiro.pdf','2026-03-05 08:00:00',0),

(13,4,5,5,'uploads/comprovante_002.pdf','Comprovante_TED.pdf','2026-03-10 12:00:00',1),

(14,5,6,6,'uploads/relatorio_002.pdf','Relatorio_Fiscal.pdf','2026-03-15 13:00:00',1),

(15,6,7,7,'uploads/declaracao_002.pdf','Declaracao_MEI.pdf','2026-03-20 14:00:00',0),

(16,7,8,8,'uploads/outros_002.pdf','Documento_Extra.pdf','2026-03-25 16:00:00',1),

(17,8,9,1,'uploads/nf_003.pdf','NF_Marco.pdf','2026-04-01 08:40:00',1),

(18,9,10,2,'uploads/recibo_003.pdf','Recibo_Abril.pdf','2026-04-05 09:30:00',1),

(19,10,1,3,'uploads/contrato_003.pdf','Contrato_Fornecedor.pdf','2026-04-10 11:00:00',1),

(20,1,4,4,'uploads/boleto_003.pdf','Boleto_Abril.pdf','2026-04-15 12:15:00',0);

-- Inserts pra FINANCEIRO
INSERT INTO FINANCEIRO
(fin_id, doc_id, fin_valor_total, fin_categoria, fin_status, fin_data_emissao)
VALUES

(1,1,5200.00,'Faturamento',1,'2026-01-05'),

(2,2,980.50,'Imposto',1,'2026-01-10'),

(3,3,430.00,'Despesa',0,'2026-01-15'),

(4,4,1700.00,'Custo',1,'2026-01-20'),

(5,5,8500.00,'Faturamento',1,'2026-01-25'),

(6,6,1200.00,'Imposto',0,'2026-02-01'),

(7,7,600.00,'Despesa',1,'2026-02-05'),

(8,8,2500.00,'Custo',1,'2026-02-10'),

(9,9,9400.00,'Faturamento',1,'2026-02-15'),

(10,10,1800.00,'Imposto',1,'2026-02-20'),

(11,11,720.00,'Despesa',1,'2026-03-01'),

(12,12,3500.00,'Custo',0,'2026-03-05'),

(13,13,12300.00,'Faturamento',1,'2026-03-10'),

(14,14,950.00,'Imposto',1,'2026-03-15'),

(15,15,410.00,'Despesa',0,'2026-03-20'),

(16,16,4700.00,'Custo',1,'2026-03-25'),

(17,17,18800.00,'Faturamento',1,'2026-04-01'),

(18,18,1650.00,'Imposto',0,'2026-04-05'),

(19,19,990.00,'Despesa',1,'2026-04-10'),

(20,20,2900.00,'Custo',1,'2026-04-15');

-- Inserts para PRAZOS
INSERT INTO PRAZOS
(praz_id, emp_id, praz_descricao, praz_data_vencimento, praz_status)
VALUES

(1,1,'Entrega da DAS','2026-07-20',0),

(2,2,'Entrega da DCTF','2026-07-15',1),

(3,3,'Pagamento do Simples','2026-06-10',2),

(4,4,'Entrega da DEFIS','2026-08-31',0),

(5,5,'Envio da ECF','2026-05-30',2),

(6,6,'Entrega da ECD','2026-09-15',1),

(7,7,'Pagamento de Tributos','2026-07-05',0),

(8,8,'Renovação Certificado Digital','2026-06-01',2),

(9,9,'Entrega DIRF','2026-10-10',0),

(10,10,'Pagamento FGTS','2026-07-07',1),

(11,1,'Envio Nota Fiscal Mensal','2026-07-25',0),

(12,2,'Revisão Fiscal','2026-04-20',2),

(13,5,'Atualização Cadastral','2026-11-15',1),

(14,8,'Apuração de Impostos','2026-08-05',0),

(15,10,'Entrega Obrigações Acessórias','2026-03-10',2);

-- Inserts para AUDITORIA (removido aud_status e usando DATETIME)
INSERT INTO AUDITORIA
(aud_id, usu_id, aud_acao, aud_tabela_afetada, aud_registro_afetado, aud_descricao,
aud_operacao, aud_ip, aud_user_agent, aud_data_acao, aud_status)
VALUES

(1,1,0,'USUARIOS',1,'Cadastro do usuário Ana Silva.','INSERT_USER',
'127.0.0.1',
'Mozilla/5.0 (Windows)',
'2026-01-01 08:00:00',
1),

(2,2,1,'EMPRESAS',2,'Atualização do telefone da empresa.',
'UPDATE_COMPANY',
'127.0.0.1',
'Chrome',
'2026-01-05 09:30:00',
1),

(3,3,2,'DOCUMENTOS',3,'Documento removido.',
'DELETE_DOCUMENT',
'192.168.0.10',
'Firefox',
'2026-01-08 10:10:00',
1),

(4,4,0,'FINANCEIRO',4,'Novo lançamento financeiro.',
'INSERT_FINANCEIRO',
'127.0.0.1',
'Edge',
'2026-01-10 14:20:00',
1),

(5,5,1,'FINANCEIRO',5,'Valor atualizado.',
'UPDATE_FINANCEIRO',
'192.168.0.25',
'Chrome',
'2026-01-15 15:40:00',
1),

(6,6,2,'PRAZOS',6,'Prazo excluído.',
'DELETE_PRAZO',
'127.0.0.1',
'Firefox',
'2026-01-20 16:00:00',
1),

(7,7,0,'REGIME_EMPRESA',7,'Novo vínculo criado.',
'INSERT_REGIME_EMPRESA',
'10.0.0.2',
'Chrome',
'2026-02-01 09:00:00',
1),

(8,8,1,'DOCUMENTOS',8,'Documento alterado.',
'UPDATE_DOCUMENTO',
'10.0.0.3',
'Edge',
'2026-02-05 09:30:00',
1),

(9,9,2,'USUARIO_EMPRESAS',9,'Usuário removido da empresa.',
'DELETE_VINCULO',
'127.0.0.1',
'Firefox',
'2026-02-10 10:00:00',
1),

(10,10,0,'PRAZOS',10,'Novo prazo cadastrado.',
'INSERT_PRAZO',
'127.0.0.1',
'Chrome',
'2026-02-15 10:30:00',
1),

(11,1,1,'USUARIOS',1,'Senha redefinida.',
'UPDATE_USER',
'192.168.1.100',
'Chrome',
'2026-03-01 08:00:00',
1),

(12,2,2,'EMPRESAS',5,'Empresa excluída logicamente.',
'DELETE_EMPRESA',
'192.168.1.101',
'Firefox',
'2026-03-03 09:00:00',
0),

(13,4,0,'DOCUMENTOS',15,'Upload de documento.',
'INSERT_DOCUMENTO',
'192.168.1.102',
'Edge',
'2026-03-08 13:00:00',
1),

(14,6,1,'REGIME',3,'Descrição alterada.',
'UPDATE_REGIME',
'192.168.1.103',
'Chrome',
'2026-03-15 15:00:00',
1),

(15,8,2,'FINANCEIRO',12,'Registro removido.',
'DELETE_FINANCEIRO',
'192.168.1.104',
'Firefox',
'2026-03-20 16:00:00',
0),

(16,9,0,'TIPO_DOCUMENTOS',7,'Tipo criado.',
'INSERT_TIPO_DOC',
'127.0.0.1',
'Chrome',
'2026-04-01 08:20:00',
1),

(17,10,1,'PRAZOS',14,'Prazo atualizado.',
'UPDATE_PRAZO',
'127.0.0.1',
'Edge',
'2026-04-05 09:45:00',
1),

(18,5,2,'DOCUMENTOS',20,'Documento arquivado.',
'DELETE_DOCUMENTO',
'127.0.0.1',
'Firefox',
'2026-04-10 10:50:00',
1),

(19,7,0,'EMPRESAS',8,'Empresa cadastrada.',
'INSERT_EMPRESA',
'192.168.1.105',
'Chrome',
'2026-04-15 11:15:00',
1),

(20,3,1,'USUARIO_EMPRESAS',3,'Nível de acesso alterado.',
'UPDATE_VINCULO',
'192.168.1.106',
'Edge',
'2026-04-20 14:30:00',
0);