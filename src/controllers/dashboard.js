const db = require('../dataBase/connection');
const { getAbasDisponiveis, temPermissao } = require('../utils/permissoes');

module.exports = {
    /**
     * Retorna as abas disponíveis para o usuário baseado em seu tipo de empresa
     */
    async obterAbas(request, response) {
        try {
            // Se não houver middleware, pega da URL (?tipoEmpresa=0&nivelAcesso=1) ou assume padrão
            const tipoEmpresa = request.tipoEmpresa !== undefined ? request.tipoEmpresa : Number(request.query.tipoEmpresa || 0); // 0 = ME, 1 = MEI
            const nivelAcesso = request.nivelAcesso !== undefined ? request.nivelAcesso : Number(request.query.nivelAcesso || 1);

            const abas = getAbasDisponiveis(tipoEmpresa);

            // Filtra as abas de impostos se for visualizador
            const abasDisponibles = abas.filter(aba => {
                // Visualizador (0) não tem acesso a impostos
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
                    abas: abasDisponibles
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

    /**
     * Retorna resumo do dashboard para o usuário
     */
    async obterResumoDashboard(request, response) {
        try {
            // Proteção adaptativa para rodar com ou sem middleware
            const empresaId = request.empresa ? request.empresa.id : Number(request.query.emp_id || request.query.empresaId || 5);
            const tipoEmpresa = request.tipoEmpresa !== undefined ? request.tipoEmpresa : Number(request.query.tipoEmpresa || 0);

            // Busca quantidade de documentos
            const sqlDocumentos = `
                SELECT COUNT(*) as total_documentos
                FROM DOCUMENTOS
                WHERE emp_id = ? AND doc_status = 1
            `;
            const [docResult] = await db.query(sqlDocumentos, [empresaId]);

            // Busca prazos pendentes
            const sqlPrazos = `
                SELECT COUNT(*) as total_prazos
                FROM PRAZOS
                WHERE emp_id = ? AND praz_status = 0
            `;
            const [prazResult] = await db.query(sqlPrazos, [empresaId]);

            // Para ME: busca informações de financeiro
            let financeiro = null;
            if (tipoEmpresa === 0) {
                const sqlFinanceiro = `
                    SELECT 
                        SUM(CASE WHEN f.fin_categoria = 'Faturamento' THEN f.fin_valor_total ELSE 0 END) as total_faturamento,
                        SUM(CASE WHEN f.fin_categoria = 'Imposto' THEN f.fin_valor_total ELSE 0 END) as total_impostos,
                        SUM(CASE WHEN f.fin_categoria = 'Despesa' THEN f.fin_valor_total ELSE 0 END) as total_despesas
                    FROM FINANCEIRO f
                    INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                    WHERE d.emp_id = ? AND f.fin_status = 1
                `;
                const [finResult] = await db.query(sqlFinanceiro, [empresaId]);
                financeiro = finResult[0];
            }

            const resumo = {
                empresa: {
                    id: empresaId,
                    tipo: tipoEmpresa === 0 ? 'ME' : 'MEI'
                },
                documentos: docResult[0]?.total_documentos || 0,
                prazos_pendentes: prazResult[0]?.total_prazos || 0,
                ...(tipoEmpresa === 0 && { financeiro })
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

    /**
     * Retorna informações de impostos por tipo de empresa
     */
    async obterImpostos(request, response) {
        try {
            const empresaId = request.empresa ? request.empresa.id : Number(request.query.emp_id || request.query.empresaId || 5);
            const tipoEmpresa = request.tipoEmpresa !== undefined ? request.tipoEmpresa : Number(request.query.tipoEmpresa || 0);
            const nivelAcesso = request.nivelAcesso !== undefined ? request.nivelAcesso : Number(request.query.nivelAcesso || 1);

            // Para MEI, visualizador não tem acesso
            if (tipoEmpresa === 1 && nivelAcesso === 0) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Você não tem permissão para visualizar impostos',
                    dados: null
                });
            }

            const sqlImpostos = `
                SELECT 
                    f.fin_id,
                    d.doc_nome_original,
                    f.fin_valor_total,
                    f.fin_data_emissao,
                    f.fin_status
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
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

    /**
     * Retorna informações de faturamento/notas emitidas
     */
    async obterFaturamento(request, response) {
        try {
            const empresaId = request.empresa ? request.empresa.id : Number(request.query.emp_id || request.query.empresaId || 5);

            const sqlFaturamento = `
                SELECT 
                    f.fin_id,
                    d.doc_nome_original,
                    f.fin_valor_total,
                    f.fin_data_emissao,
                    f.fin_status
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                WHERE d.emp_id = ? 
                    AND f.fin_categoria = 'Faturamento'
                    AND f.fin_status = 1
                ORDER BY f.fin_data_emissao DESC
                LIMIT 50
            `;

            const [faturamento] = await db.query(sqlFaturamento, [empresaId]);

            // Calcula total de faturamento
            const totalFaturamento = faturamento.reduce((acc, item) => acc + item.fin_valor_total, 0);

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

    /**
     * Retorna informações de caixa (apenas ME)
     */
    async obterCaixa(request, response) {
        try {
            const tipoEmpresa = request.tipoEmpresa !== undefined ? request.tipoEmpresa : Number(request.query.tipoEmpresa || 0);

            // Caixa é apenas para ME
            if (tipoEmpresa !== 0) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Caixa está disponível apenas para Microempresas',
                    dados: null
                });
            }

            const empresaId = request.empresa ? request.empresa.id : Number(request.query.emp_id || request.query.empresaId || 5);

            const sqlCaixa = `
                SELECT 
                    f.fin_id,
                    f.fin_categoria,
                    f.fin_valor_total,
                    f.fin_data_emissao,
                    d.doc_nome_original
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                WHERE d.emp_id = ? AND f.fin_status = 1
                ORDER BY f.fin_data_emissao DESC
                LIMIT 100
            `;

            const [caixa] = await db.query(sqlCaixa, [empresaId]);

            // Calcula resumo
            const resumo = {
                entrada: caixa
                    .filter(item => item.fin_categoria === 'Faturamento')
                    .reduce((acc, item) => acc + item.fin_valor_total, 0),
                saida: caixa
                    .filter(item => item.fin_categoria === 'Despesa')
                    .reduce((acc, item) => acc + item.fin_valor_total, 0),
                impostos: caixa
                    .filter(item => item.fin_categoria === 'Imposto')
                    .reduce((acc, item) => acc + item.fin_valor_total, 0)
            };

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

    /**
     * Retorna prazos (para ME e MEI via Controle Mensal)
     */
    async obterPrazos(request, response) {
        try {
            const empresaId = request.empresa ? request.empresa.id : Number(request.query.emp_id || request.query.empresaId || 5);

            const sqlPrazos = `
                SELECT 
                    praz_id,
                    praz_descricao,
                    praz_data_vencimento,
                    praz_status,
                    CASE 
                        WHEN praz_status = 0 THEN 'Pendente'
                        WHEN praz_status = 1 THEN 'Concluído'
                        WHEN praz_status = 2 THEN 'Vencido'
                    END as status_descricao
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
                    pendentes: prazos.filter(p => p.praz_status === 0).length,
                    concluidos: prazos.filter(p => p.praz_status === 1).length,
                    vencidos: prazos.filter(p => p.praz_status === 2).length,
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