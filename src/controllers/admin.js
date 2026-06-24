const db = require('../dataBase/connection');

/*
--------------------------------------------------------------------------
    Controller: Admin

    Responsável por reunir informações gerais para o painel administrativo
    do sistema CONTAX.

    Tabelas utilizadas:
    - USUARIOS
    - EMPRESAS
    - DOCUMENTOS
    - FINANCEIRO
    - PRAZOS
    - AUDITORIA

    Regras:
    - As informações exibidas no painel devem vir do banco de dados.
    - O administrador visualiza dados gerais do sistema.
    - Empresas e usuários inativos não entram nos totais principais.
    - Categorias financeiras: Faturamento, Imposto, Despesa e Custo.
--------------------------------------------------------------------------
*/

module.exports = {
    async listarResumoAdmin(request, response) {
        try {
            const sqlUsuarios = `
                SELECT COUNT(*) AS totalUsuarios
                FROM USUARIOS
                WHERE usu_status = 1
            `;

            const sqlEmpresas = `
                SELECT COUNT(*) AS totalEmpresas
                FROM EMPRESAS
                WHERE emp_status = 1
            `;

            const sqlDocumentos = `
                SELECT COUNT(*) AS totalDocumentos
                FROM DOCUMENTOS
                WHERE doc_status = 1
            `;

            const sqlFaturamento = `
                SELECT COALESCE(SUM(fin_valor_total), 0) AS totalFaturamento
                FROM FINANCEIRO
                WHERE fin_categoria = 'Faturamento'
                AND fin_status = 1
            `;

            const sqlImpostos = `
                SELECT COALESCE(SUM(fin_valor_total), 0) AS totalImpostos
                FROM FINANCEIRO
                WHERE fin_categoria = 'Imposto'
                AND fin_status = 1
            `;

            const sqlDespesas = `
                SELECT COALESCE(SUM(fin_valor_total), 0) AS totalDespesas
                FROM FINANCEIRO
                WHERE fin_categoria = 'Despesa'
                AND fin_status = 1
            `;

            const sqlCustos = `
                SELECT COALESCE(SUM(fin_valor_total), 0) AS totalCustos
                FROM FINANCEIRO
                WHERE fin_categoria = 'Custo'
                AND fin_status = 1
            `;

            const [resUsuarios] = await db.query(sqlUsuarios);
            const [resEmpresas] = await db.query(sqlEmpresas);
            const [resDocumentos] = await db.query(sqlDocumentos);
            const [resFaturamento] = await db.query(sqlFaturamento);
            const [resImpostos] = await db.query(sqlImpostos);
            const [resDespesas] = await db.query(sqlDespesas);
            const [resCustos] = await db.query(sqlCustos);

            const totalFaturamento = Number(resFaturamento[0]?.totalFaturamento || 0);
            const totalImpostos = Number(resImpostos[0]?.totalImpostos || 0);
            const totalDespesas = Number(resDespesas[0]?.totalDespesas || 0);
            const totalCustos = Number(resCustos[0]?.totalCustos || 0);

            const dados = {
                totalUsuarios: resUsuarios[0]?.totalUsuarios || 0,
                totalEmpresas: resEmpresas[0]?.totalEmpresas || 0,
                totalDocumentos: resDocumentos[0]?.totalDocumentos || 0,
                totalFaturamento,
                totalImpostos,
                totalDespesas,
                totalCustos,
                saldoGeral: totalFaturamento - totalImpostos - totalDespesas - totalCustos
            };

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Resumo administrativo carregado com sucesso.',
                dados
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao carregar resumo administrativo.',
                dados: error.message
            });
        }
    },

    async listarEmpresasRisco(request, response) {
        try {
            const sql = `
                SELECT
                    e.emp_id,
                    e.emp_nome_fantasia,
                    e.emp_tipo,

                    COALESCE(SUM(f.fin_valor_total), 0) AS faturamentoAtual,

                    CASE
                        WHEN e.emp_tipo = 1 THEN 6750.00
                        ELSE 20000.00
                    END AS limiteMensal,

                    ROUND(
                        (
                            COALESCE(SUM(f.fin_valor_total), 0) /
                            CASE
                                WHEN e.emp_tipo = 1 THEN 6750.00
                                ELSE 20000.00
                            END
                        ) * 100,
                        2
                    ) AS percentualUso,

                    CASE
                        WHEN COALESCE(SUM(f.fin_valor_total), 0) >=
                            CASE
                                WHEN e.emp_tipo = 1 THEN 6750.00
                                ELSE 20000.00
                            END * 0.9
                            THEN 'Risco'

                        WHEN COALESCE(SUM(f.fin_valor_total), 0) >=
                            CASE
                                WHEN e.emp_tipo = 1 THEN 6750.00
                                ELSE 20000.00
                            END * 0.7
                            THEN 'Atenção'

                        ELSE 'Saudável'
                    END AS situacao

                FROM EMPRESAS e

                LEFT JOIN DOCUMENTOS d
                    ON d.emp_id = e.emp_id
                    AND d.doc_status = 1

                LEFT JOIN FINANCEIRO f
                    ON f.doc_id = d.doc_id
                    AND f.fin_categoria = 'Faturamento'
                    AND YEAR(f.fin_data_emissao) = YEAR(CURRENT_DATE())
                    AND MONTH(f.fin_data_emissao) = MONTH(CURRENT_DATE())
                    AND f.fin_status = 1

                WHERE e.emp_status = 1

                GROUP BY
                    e.emp_id,
                    e.emp_nome_fantasia,
                    e.emp_tipo

                ORDER BY faturamentoAtual DESC
            `;

            const [rows] = await db.query(sql);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Lista de empresas por situação financeira.',
                nItens: rows.length,
                dados: rows
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao listar empresas em risco.',
                dados: error.message
            });
        }
    },

    async listarUltimosDocumentos(request, response) {
        try {
            const limit = Math.min(
                Math.max(parseInt(request.query.limit) || 10, 1),
                100
            );

            const sql = `
                SELECT
                    d.doc_id,
                    d.doc_nome_original,
                    d.doc_data_upload,
                    CAST(d.doc_status AS UNSIGNED) AS doc_status,

                    f.fin_valor_total,
                    f.fin_categoria,
                    f.fin_data_emissao,

                    e.emp_id,
                    e.emp_nome_fantasia,
                    e.emp_cnpj,

                    t.tpd_id,
                    t.tpd_descricao

                FROM DOCUMENTOS d

                INNER JOIN EMPRESAS e
                    ON e.emp_id = d.emp_id

                INNER JOIN TIPO_DOCUMENTOS t
                    ON t.tpd_id = d.tpd_id

                LEFT JOIN FINANCEIRO f
                    ON f.doc_id = d.doc_id
                    AND f.fin_status = 1

                WHERE d.doc_status = 1

                ORDER BY
                    d.doc_data_upload DESC,
                    d.doc_id DESC

                LIMIT ${limit}
            `;

            const [rows] = await db.query(sql);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Últimos documentos carregados com sucesso.',
                nItens: rows.length,
                dados: rows
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao listar últimos documentos.',
                dados: error.message
            });
        }
    },

    async listarPrazosPendentes(request, response) {
        try {
            const sql = `
                SELECT
                    p.praz_id,
                    p.emp_id,
                    e.emp_nome_fantasia,
                    p.praz_descricao,
                    p.praz_data_vencimento,
                    p.praz_status,

                    DATEDIFF(p.praz_data_vencimento, CURDATE()) AS dias_restantes,

                    CASE
                        WHEN p.praz_status = 1 THEN 'Concluído'
                        WHEN p.praz_status = 0
                            AND p.praz_data_vencimento < CURDATE()
                            THEN 'Vencido'
                        WHEN p.praz_status = 0
                            AND p.praz_data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                            THEN 'Vence esta semana'
                        WHEN p.praz_status = 0 THEN 'Pendente'
                        WHEN p.praz_status = 2 THEN 'Vencido'
                        ELSE 'Indefinido'
                    END AS status_descricao

                FROM PRAZOS p

                INNER JOIN EMPRESAS e
                    ON e.emp_id = p.emp_id

                WHERE p.praz_status IN (0, 2)

                ORDER BY
                    p.praz_data_vencimento ASC
            `;

            const [rows] = await db.query(sql);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Prazos pendentes carregados com sucesso.',
                nItens: rows.length,
                dados: rows
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao listar prazos pendentes.',
                dados: error.message
            });
        }
    },

    async listarAuditoriaRecente(request, response) {
        try {
            const limit = Math.min(
                Math.max(parseInt(request.query.limit) || 10, 1),
                100
            );

            const sql = `
                SELECT
                    a.aud_id,
                    a.usu_id,
                    u.usu_nome,
                    a.aud_acao,

                    CASE
                        WHEN a.aud_acao = 0 THEN 'Inserção'
                        WHEN a.aud_acao = 1 THEN 'Edição'
                        WHEN a.aud_acao = 2 THEN 'Exclusão'
                        ELSE 'Desconhecida'
                    END AS acao_descricao,

                    a.aud_tabela_afetada,
                    a.aud_registro_afetado,
                    a.aud_data_acao

                FROM AUDITORIA a

                LEFT JOIN USUARIOS u
                    ON u.usu_id = a.usu_id

                WHERE a.aud_status = 1

                ORDER BY a.aud_data_acao DESC

                LIMIT ${limit}
            `;

            const [rows] = await db.query(sql);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Auditoria recente carregada com sucesso.',
                nItens: rows.length,
                dados: rows
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao listar auditoria recente.',
                dados: error.message
            });
        }
    },

    async listarFinanceiroMensal(request, response) {
        try {
            const {
                ano = new Date().getFullYear(),
                mes = new Date().getMonth() + 1
            } = request.query;

            const sql = `
                SELECT
                    fin_categoria,
                    COALESCE(SUM(fin_valor_total), 0) AS total
                FROM FINANCEIRO
                WHERE YEAR(fin_data_emissao) = ?
                AND MONTH(fin_data_emissao) = ?
                AND fin_status = 1
                GROUP BY fin_categoria
            `;

            const [rows] = await db.query(sql, [
                parseInt(ano),
                parseInt(mes)
            ]);

            const dados = {
                ano: parseInt(ano),
                mes: parseInt(mes),
                faturamento: 0,
                impostos: 0,
                despesas: 0,
                custos: 0,
                saldo: 0
            };

            rows.forEach((item) => {
                if (item.fin_categoria === 'Faturamento') {
                    dados.faturamento = Number(item.total);
                }

                if (item.fin_categoria === 'Imposto') {
                    dados.impostos = Number(item.total);
                }

                if (item.fin_categoria === 'Despesa') {
                    dados.despesas = Number(item.total);
                }

                if (item.fin_categoria === 'Custo') {
                    dados.custos = Number(item.total);
                }
            });

            dados.saldo =
                dados.faturamento -
                dados.impostos -
                dados.despesas -
                dados.custos;

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Financeiro mensal carregado com sucesso.',
                dados
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao listar financeiro mensal.',
                dados: error.message
            });
        }
    }
};