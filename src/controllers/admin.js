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

    Responsável por:
    - Resumo geral do sistema
    - Indicadores do dashboard
    - Listagens administrativas
    - Dados financeiros gerais

    Regras:
    - As informações exibidas no painel devem vir do banco de dados.
    - O administrador visualiza dados gerais do sistema.
    - Empresas e usuários inativos não entram nos totais principais.
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
                SELECT 
                    COALESCE(SUM(fin_valor_total), 0) AS totalFaturamento
                FROM FINANCEIRO
                WHERE fin_categoria = 'Faturamento'
            `;

            const sqlImpostos = `
                SELECT 
                    COALESCE(SUM(fin_valor_total), 0) AS totalImpostos
                FROM FINANCEIRO
                WHERE fin_categoria = 'Imposto'
            `;

            const sqlDespesas = `
                SELECT 
                    COALESCE(SUM(fin_valor_total), 0) AS totalDespesas
                FROM FINANCEIRO
                WHERE fin_categoria = 'Despesa'
            `;

            const [[usuarios]] = await db.query(sqlUsuarios);
            const [[empresas]] = await db.query(sqlEmpresas);
            const [[documentos]] = await db.query(sqlDocumentos);
            const [[faturamento]] = await db.query(sqlFaturamento);
            const [[impostos]] = await db.query(sqlImpostos);
            const [[despesas]] = await db.query(sqlDespesas);

            const dados = {
                totalUsuarios: usuarios.totalUsuarios,
                totalEmpresas: empresas.totalEmpresas,
                totalDocumentos: documentos.totalDocumentos,
                totalFaturamento: Number(faturamento.totalFaturamento),
                totalImpostos: Number(impostos.totalImpostos),
                totalDespesas: Number(despesas.totalDespesas)
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

                    CASE
                        WHEN COALESCE(SUM(f.fin_valor_total), 0) >= 
                            CASE WHEN e.emp_tipo = 1 THEN 6750.00 ELSE 20000.00 END * 0.8
                            THEN 'Risco'

                        WHEN COALESCE(SUM(f.fin_valor_total), 0) >= 
                            CASE WHEN e.emp_tipo = 1 THEN 6750.00 ELSE 20000.00 END * 0.5
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

                 GROUP BY e.emp_id

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
            const { limit = 10 } = request.query;

            const sql = `
                SELECT
                    d.doc_id,
                    d.doc_nome_original,
                    d.doc_data_upload,

                    f.fin_valor_total,
                    f.fin_categoria,
                    f.fin_data_emissao,

                    e.emp_nome_fantasia,
                    t.tpd_descricao 

                FROM DOCUMENTOS d

                INNER JOIN EMPRESAS e
                    ON e.emp_id = d.emp_id

                INNER JOIN TIPO_DOCUMENTOS t
                    ON t.tpd_id = d.tpd_id

                LEFT JOIN FINANCEIRO f
                    ON f.doc_id = d.doc_id

                WHERE d.doc_status = 1
                
                ORDER BY d.doc_data_upload DESC, 
                         d.doc_id DESC

                LIMIT ?
            `;

            const [rows] = await db.query(sql, [parseInt(limit)]);

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
                    p.praz_status
                FROM PRAZOS p
                INNER JOIN EMPRESAS e
                    ON e.emp_id = p.emp_id
                WHERE p.praz_status IN (0, 2)
                ORDER BY p.praz_data_vencimento ASC
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
        const { limit = 10 } = request.query;

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
            LIMIT ?
        `;

        const [rows] = await db.query(sql, [parseInt(limit)]);

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
            saldo: 0
        };

        rows.forEach(item => {

            if (item.fin_categoria === 'Faturamento') {
                dados.faturamento = Number(item.total);
            }

            if (item.fin_categoria === 'Imposto') {
                dados.impostos = Number(item.total);
            }

            if (item.fin_categoria === 'Despesa') {
                dados.despesas = Number(item.total);
            }

        });

        dados.saldo =
            dados.faturamento -
            dados.impostos -
            dados.despesas;

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
},
};