const db = require('../dataBase/connection');
const { getAbasDisponiveis } = require('../utils/permissoes');

function getEmpresaId(request) {
    return request.empresa
        ? request.empresa.id
        : Number(request.query.emp_id || request.query.empresaId);
}

function getTipoEmpresa(request) {
    return request.tipoEmpresa !== undefined
        ? request.tipoEmpresa
        : Number(request.query.tipoEmpresa || 0);
}

function getNivelAcesso(request) {
    return request.nivelAcesso !== undefined
        ? request.nivelAcesso
        : Number(request.query.nivelAcesso || 1);
}

function validarEmpresa(empresaId, response) {
    if (!empresaId) {
        response.status(400).json({
            sucesso: false,
            mensagem: 'Empresa não informada.',
            dados: null
        });

        return false;
    }

    return true;
}

module.exports = {
    async obterAbas(request, response) {
        try {
            const tipoEmpresa = getTipoEmpresa(request);
            const nivelAcesso = getNivelAcesso(request);

            const abas = getAbasDisponiveis(tipoEmpresa);

            const abasDisponiveis = abas.filter((aba) => {
                if (nivelAcesso === 0 && aba === 'Impostos') {
                    return false;
                }

                return true;
            });

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Abas disponíveis',
                dados: {
                    tipo_empresa: tipoEmpresa === 0 ? 'ME' : 'MEI',
                    nivel_acesso: nivelAcesso,
                    abas: abasDisponiveis
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao obter abas: ${error.message}`,
                dados: null
            });
        }
    },

    async obterResumoDashboard(request, response) {
        try {
            const empresaId = getEmpresaId(request);
            const tipoEmpresa = getTipoEmpresa(request);

            if (!validarEmpresa(empresaId, response)) return;

            const sqlDocumentos = `
                SELECT COUNT(*) AS total_documentos
                FROM DOCUMENTOS
                WHERE emp_id = ?
                AND doc_status = 1
            `;

            const sqlPrazos = `
                SELECT COUNT(*) AS total_prazos
                FROM PRAZOS
                WHERE emp_id = ?
                AND praz_status = 0
            `;

            const sqlFinanceiro = `
                SELECT
                    COALESCE(SUM(CASE WHEN f.fin_categoria = 'Faturamento' THEN f.fin_valor_total ELSE 0 END), 0) AS total_faturamento,
                    COALESCE(SUM(CASE WHEN f.fin_categoria = 'Imposto' THEN f.fin_valor_total ELSE 0 END), 0) AS total_impostos,
                    COALESCE(SUM(CASE WHEN f.fin_categoria = 'Despesa' THEN f.fin_valor_total ELSE 0 END), 0) AS total_despesas,
                    COALESCE(SUM(CASE WHEN f.fin_categoria = 'Custo' THEN f.fin_valor_total ELSE 0 END), 0) AS total_custos
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d
                    ON d.doc_id = f.doc_id
                WHERE d.emp_id = ?
                AND f.fin_status = 1
            `;

            const [docResult] = await db.query(sqlDocumentos, [empresaId]);
            const [prazResult] = await db.query(sqlPrazos, [empresaId]);
            const [finResult] = await db.query(sqlFinanceiro, [empresaId]);

            const financeiro = finResult[0] || {};

            const totalFaturamento = Number(financeiro.total_faturamento || 0);
            const totalImpostos = Number(financeiro.total_impostos || 0);
            const totalDespesas = Number(financeiro.total_despesas || 0);
            const totalCustos = Number(financeiro.total_custos || 0);

            const limiteMensal = tipoEmpresa === 1 ? 6750 : 20000;
            const percentualLimite = limiteMensal > 0
                ? Math.min((totalFaturamento / limiteMensal) * 100, 100)
                : 0;

            const resumo = {
                empresa: {
                    id: empresaId,
                    tipo: tipoEmpresa === 0 ? 'ME' : 'MEI',
                    limite_mensal: limiteMensal
                },
                documentos: docResult[0]?.total_documentos || 0,
                prazos_pendentes: prazResult[0]?.total_prazos || 0,
                financeiro: {
                    faturamento: totalFaturamento,
                    impostos: totalImpostos,
                    despesas: totalDespesas,
                    custos: totalCustos,
                    saldo: totalFaturamento - totalImpostos - totalDespesas - totalCustos,
                    percentual_limite: percentualLimite,
                    limite_restante: Math.max(limiteMensal - totalFaturamento, 0)
                }
            };

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Resumo do dashboard',
                dados: resumo
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao obter resumo: ${error.message}`,
                dados: null
            });
        }
    },

    async obterImpostos(request, response) {
        try {
            const empresaId = getEmpresaId(request);
            const tipoEmpresa = getTipoEmpresa(request);
            const nivelAcesso = getNivelAcesso(request);

            if (!validarEmpresa(empresaId, response)) return;

            if (nivelAcesso === 0) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Visualizador não possui permissão para visualizar impostos.',
                    dados: null
                });
            }

            const sqlImpostos = `
                SELECT
                    f.fin_id,
                    d.doc_id,
                    d.doc_nome_original,
                    f.fin_valor_total,
                    f.fin_categoria,
                    f.fin_data_emissao,
                    CAST(f.fin_status AS UNSIGNED) AS fin_status
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d
                    ON d.doc_id = f.doc_id
                WHERE d.emp_id = ?
                AND f.fin_categoria = 'Imposto'
                AND f.fin_status = 1
                ORDER BY f.fin_data_emissao DESC
                LIMIT 50
            `;

            const [impostos] = await db.query(sqlImpostos, [empresaId]);

            return response.status(200).json({
                sucesso: true,
                mensagem: tipoEmpresa === 0 ? 'Lista de Impostos' : 'Lista de DAS',
                dados: {
                    tipo: tipoEmpresa === 0 ? 'Impostos' : 'DAS',
                    total: impostos.length,
                    impostos
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao obter impostos: ${error.message}`,
                dados: null
            });
        }
    },

    async obterFaturamento(request, response) {
        try {
            const empresaId = getEmpresaId(request);

            if (!validarEmpresa(empresaId, response)) return;

            const sqlFaturamento = `
                SELECT
                    f.fin_id,
                    d.doc_id,
                    d.doc_nome_original,
                    f.fin_valor_total,
                    f.fin_data_emissao,
                    CAST(f.fin_status AS UNSIGNED) AS fin_status
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d
                    ON d.doc_id = f.doc_id
                WHERE d.emp_id = ?
                AND f.fin_categoria = 'Faturamento'
                AND f.fin_status = 1
                ORDER BY f.fin_data_emissao DESC
                LIMIT 50
            `;

            const [faturamento] = await db.query(sqlFaturamento, [empresaId]);

            const totalFaturamento = faturamento.reduce(
                (acc, item) => acc + Number(item.fin_valor_total || 0),
                0
            );

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Lista de Faturamento/Notas Emitidas',
                dados: {
                    total_notas: faturamento.length,
                    total_faturamento: totalFaturamento,
                    faturamento
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao obter faturamento: ${error.message}`,
                dados: null
            });
        }
    },

    async obterCaixa(request, response) {
        try {
            const empresaId = getEmpresaId(request);
            const tipoEmpresa = getTipoEmpresa(request);

            if (!validarEmpresa(empresaId, response)) return;

            if (tipoEmpresa !== 0) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Caixa está disponível apenas para Microempresas.',
                    dados: null
                });
            }

            const sqlCaixa = `
                SELECT
                    f.fin_id,
                    f.fin_categoria,
                    f.fin_valor_total,
                    f.fin_data_emissao,
                    d.doc_id,
                    d.doc_nome_original
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d
                    ON d.doc_id = f.doc_id
                WHERE d.emp_id = ?
                AND f.fin_status = 1
                ORDER BY f.fin_data_emissao DESC
                LIMIT 100
            `;

            const [caixa] = await db.query(sqlCaixa, [empresaId]);

            const resumo = {
                entrada: caixa
                    .filter((item) => item.fin_categoria === 'Faturamento')
                    .reduce((acc, item) => acc + Number(item.fin_valor_total || 0), 0),

                saida: caixa
                    .filter((item) => item.fin_categoria === 'Despesa')
                    .reduce((acc, item) => acc + Number(item.fin_valor_total || 0), 0),

                impostos: caixa
                    .filter((item) => item.fin_categoria === 'Imposto')
                    .reduce((acc, item) => acc + Number(item.fin_valor_total || 0), 0),

                custos: caixa
                    .filter((item) => item.fin_categoria === 'Custo')
                    .reduce((acc, item) => acc + Number(item.fin_valor_total || 0), 0)
            };

            resumo.saldoAtual =
                resumo.entrada -
                resumo.saida -
                resumo.impostos -
                resumo.custos;

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Informações de Caixa',
                dados: {
                    resumo,
                    movimentacoes: caixa
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao obter caixa: ${error.message}`,
                dados: null
            });
        }
    },

    async obterPrazos(request, response) {
        try {
            const empresaId = getEmpresaId(request);

            if (!validarEmpresa(empresaId, response)) return;

            const sqlPrazos = `
                SELECT
                    praz_id,
                    praz_descricao,
                    praz_data_vencimento,
                    praz_status,

                    DATEDIFF(praz_data_vencimento, CURDATE()) AS dias_restantes,

                    CASE
                        WHEN praz_status = 1 THEN 'Concluído'
                        WHEN praz_status = 0
                            AND praz_data_vencimento < CURDATE()
                            THEN 'Vencido'
                        WHEN praz_status = 0
                            AND praz_data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                            THEN 'Vence esta semana'
                        WHEN praz_status = 0 THEN 'Pendente'
                        WHEN praz_status = 2 THEN 'Vencido'
                        ELSE 'Indefinido'
                    END AS status_descricao

                FROM PRAZOS
                WHERE emp_id = ?
                ORDER BY praz_data_vencimento ASC
            `;

            const [prazos] = await db.query(sqlPrazos, [empresaId]);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Prazos/Controle Mensal',
                dados: {
                    total: prazos.length,
                    pendentes: prazos.filter((p) => p.status_descricao === 'Pendente').length,
                    concluidos: prazos.filter((p) => p.status_descricao === 'Concluído').length,
                    vencidos: prazos.filter((p) => p.status_descricao === 'Vencido').length,
                    proximos: prazos.filter((p) => p.status_descricao === 'Vence esta semana').length,
                    prazos
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao obter prazos: ${error.message}`,
                dados: null
            });
        }
    }
};