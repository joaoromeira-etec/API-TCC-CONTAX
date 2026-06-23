const db = require('../dataBase/connection');
const fse = require('fs-extra');
const path = require('path');
const { extrairDadosFinanceiros } = require('../utils/financeiroExtrator');

/*
--------------------------------------------------------------------------
    Controller: Financeiro

    Tabela Principal: FINANCEIRO

    Responsável por gerenciar os dados financeiros vinculados aos documentos.

    Regras:
    - Todo lançamento financeiro deve estar vinculado a um documento existente.
    - Categorias permitidas: Faturamento, Imposto, Despesa e Custo.
    - fin_status: 0-Inativo/Oculto; 1-Ativo.
    - O apagar remove permanentemente do banco de dados (DELETE).
    - O ocultar apenas altera o status para 0 (Soft Delete).
    - Segurança: Bloqueio estrito contra vulnerabilidades IDOR (validação via Token JWT).
    - Governança Fiscais: Lançamento de 'Imposto' em Microempresas (ME) restrito ao nível Gerente.
--------------------------------------------------------------------------
*/

module.exports = {

    async listarFinanceiro(request, response) {
        try {
            const {
                id,
                doc_id,
                categoria,
                status,
                page = 1,
                limit = 5
            } = request.query;

            // PROTEÇÃO IDOR: O ID da empresa vem estritamente do token autenticado
            const emp_id = request.empresa.id;

            const idMin = request.query.idMin ? parseInt(request.query.idMin) : undefined;
            const idMax = request.query.idMax ? parseInt(request.query.idMax) : undefined;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            const [[{ id_min, id_max }]] = await db.query(`
                SELECT MIN(fin_id) AS id_min, MAX(fin_id) AS id_max FROM FINANCEIRO
            `);

            const idMinLimite = idMin ?? id_min ?? 0;
            const idMaxLimite = idMax ?? id_max ?? 999999;
            const statusFiltro = status !== undefined ? parseInt(status) : 1;

            const sql = `
                SELECT
                    f.fin_id,
                    f.doc_id,
                    f.fin_valor_total,
                    f.fin_categoria,
                    f.fin_data_emissao,
                    CAST(f.fin_status AS UNSIGNED) AS fin_status,
                    d.doc_nome_original,
                    d.emp_id,
                    e.emp_nome_fantasia
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                INNER JOIN EMPRESAS e ON e.emp_id = d.emp_id
                WHERE f.fin_status = ?
                AND d.emp_id = ?
                ${id ? 'AND f.fin_id = ?' : 'AND f.fin_id BETWEEN ? AND ?'}
                ${doc_id ? 'AND f.doc_id = ?' : ''}
                ${categoria ? 'AND f.fin_categoria = ?' : ''}
                ORDER BY f.fin_id DESC
                LIMIT ?, ?
            `;

            const values = [
                statusFiltro,
                emp_id, // Forçado via backend seguro
                ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite]),
                ...(doc_id ? [parseInt(doc_id)] : []),
                ...(categoria ? [categoria] : []),
                offset,
                parseInt(limit)
            ];

            const [rows] = await db.query(sql, values);

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                WHERE f.fin_status = ?
                AND d.emp_id = ?
                ${id ? 'AND f.fin_id = ?' : 'AND f.fin_id BETWEEN ? AND ?'}
                ${doc_id ? 'AND f.doc_id = ?' : ''}
                ${categoria ? 'AND f.fin_categoria = ?' : ''}
            `;

            const countValues = [
                statusFiltro,
                emp_id,
                ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite]),
                ...(doc_id ? [parseInt(doc_id)] : []),
                ...(categoria ? [categoria] : [])
            ];

            const [[{ total }]] = await db.query(countQuery, countValues);

            response.setHeader('X-Total-Count', total);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Lista de registros financeiros.',
                paginacao: {
                    pagina: parseInt(page),
                    limite: parseInt(limit),
                    total_registros: total
                },
                nItens: rows.length,
                dados: rows
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao listar registros financeiros.',
                dados: error.message
            });
        }
    },

    async resumoFinanceiro(request, response) {
       try {
            const { mes, ano } = request.query;
            
            const emp_id = request.empresa.id;
            const tipoEmpresa = request.tipoEmpresa; // 0 = ME, 1 = MEI

            // Parâmetros de data dinâmicos (pega o ano na programação, conforme regra)
            const anoFiltro = ano ? parseInt(ano) : new Date().getFullYear();
            const mesFiltro = mes ? parseInt(mes) : new Date().getMonth() + 1;

            // 1. LÓGICA DE MESES ATIVOS (Controle Mensal MEI)
            const sqlEmpresa = `SELECT emp_data_abertura FROM EMPRESAS WHERE emp_id = ?`;
            const [empresaDados] = await db.query(sqlEmpresa, [emp_id]);
            
            // Fallback caso a tabela EMPRESAS não tenha a coluna emp_data_abertura ainda
            const dataAbertura = empresaDados[0]?.emp_data_abertura || new Date(`${anoFiltro}-01-01`);
            const anoAbertura = new Date(dataAbertura).getFullYear();
            const mesAbertura = new Date(dataAbertura).getMonth() + 1;

            let mesesAtivos = 12; 
            
            if (anoAbertura === anoFiltro) {
                mesesAtivos = 12 - mesAbertura + 1; 
            } else if (anoFiltro < anoAbertura) {
                mesesAtivos = 0; 
            }

            // 2. BUSCA DO SALDO MENSAL (Entrada - Saída)
            const sqlMensal = `
                SELECT
                    COALESCE(SUM(CASE WHEN f.fin_categoria = 'Faturamento' THEN f.fin_valor_total ELSE 0 END), 0) AS entradas,
                    COALESCE(SUM(CASE WHEN f.fin_categoria IN ('Imposto', 'Despesa', 'Custo') THEN f.fin_valor_total ELSE 0 END), 0) AS saidas
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                WHERE f.fin_status = 1
                AND d.emp_id = ?
                AND MONTH(f.fin_data_emissao) = ?
                AND YEAR(f.fin_data_emissao) = ?
            `;
            
            const [dadosMensais] = await db.query(sqlMensal, [emp_id, mesFiltro, anoFiltro]);
            
            const totalEntradas = Number(dadosMensais[0]?.entradas || 0);
            const totalSaidas = Number(dadosMensais[0]?.saidas || 0);
            const saldoMensal = totalEntradas - totalSaidas;

            // 3. BUSCA DO FATURAMENTO ANUAL ACUMULADO
            const sqlAnual = `
                SELECT COALESCE(SUM(fin_valor_total), 0) AS faturamento_anual
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                WHERE f.fin_status = 1
                AND d.emp_id = ?
                AND f.fin_categoria = 'Faturamento'
                AND YEAR(f.fin_data_emissao) = ?
            `;
            
            const [dadosAnuais] = await db.query(sqlAnual, [emp_id, anoFiltro]);
            const faturamentoAnual = Number(dadosAnuais[0]?.faturamento_anual || 0);

            // 4. APLICAÇÃO DOS LIMITES LEGAIS
            let limiteAnualPermitido = 0;
            
            if (tipoEmpresa === 1) {
                // MEI: (81.000 / 12) * número de meses ativos
                limiteAnualPermitido = (81000 / 12) * mesesAtivos;
            } else {
                // ME: Limite Teto Padrão Anual
                limiteAnualPermitido = 360000; 
            }

            const percentualLimite = limiteAnualPermitido > 0 ? (faturamentoAnual / limiteAnualPermitido) * 100 : 0;
            let statusLimite = 'Saudável';

            if (percentualLimite >= 100) {
                statusLimite = 'Estourado';
            } else if (percentualLimite >= 80) {
                statusLimite = 'Risco';
            } else if (percentualLimite >= 50) {
                statusLimite = 'Atenção';
            }

            // 5. RESPOSTA DA API
            return response.status(200).json({
                sucesso: true,
                mensagem: 'Resumo financeiro e fiscal calculado com sucesso.',
                dados: {
                    periodo: {
                        mes: mesFiltro,
                        ano: anoFiltro,
                        meses_ativos_no_ano: mesesAtivos
                    },
                    mensal: {
                        entradas: totalEntradas,
                        saidas: totalSaidas,
                        saldo_mensal: saldoMensal
                    },
                    anual: {
                        faturamento_acumulado: faturamentoAnual,
                        teto_permitido: limiteAnualPermitido,
                        percentual_utilizado: parseFloat(percentualLimite.toFixed(2)),
                        status_fiscal: statusLimite
                    },
                    regime_empresa: tipoEmpresa === 1 ? 'MEI' : 'ME'
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao processar cálculos do resumo financeiro.',
                dados: error.message
            });
        }
    },

    async cadastrarFinanceiro(request, response) {
        try {
            const { doc_id, valor, categoria, data_emissao } = request.body;
            const emp_id_autenticada = request.empresa.id; 
            const tipoEmpresa = request.tipoEmpresa; // 0 = ME, 1 = MEI
            const nivelAcesso = request.nivelAcesso; // Injetado pelo seu middleware de vínculo
            const fin_status = 1;

            if (!doc_id || !valor || !categoria) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Documento, valor e categoria são obrigatórios.',
                    dados: null
                });
            }

            if (isNaN(doc_id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do documento deve ser numérico.',
                    dados: null
                });
            }

            // CONTROLE DE ACESSO CORPORATIVO: Apenas Gerentes (ex: nível >= 2) lançam impostos para ME
            if (categoria === 'Imposto' && tipoEmpresa === 0) {
                const nivelMinimoGerente = 2; // Ajuste este número conforme a lógica do seu banco
                if (!nivelAcesso || nivelAcesso < nivelMinimoGerente) {
                    return response.status(403).json({
                        sucesso: false,
                        mensagem: 'Operação negada: Apenas usuários com nível de Gerente podem lançar impostos para uma Microempresa (ME).',
                        dados: null
                    });
                }
            }

            const valorFormatado = String(valor).replace(',', '.');
            if (isNaN(valorFormatado) || Number(valorFormatado) <= 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Valor financeiro inválido.',
                    dados: null
                });
            }

            const categoriesPermitidas = ['Faturamento', 'Imposto', 'Despesa', 'Custo'];
            if (!categoriesPermitidas.includes(categoria)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: `Categoria inválida. Use: ${categoriesPermitidas.join(', ')}.`,
                    dados: null
                });
            }

            const sqlDocumento = `
                SELECT doc_id, emp_id, CAST(doc_status AS UNSIGNED) AS doc_status 
                FROM DOCUMENTOS WHERE doc_id = ?
            `;
            const [documentoResult] = await db.query(sqlDocumento, [doc_id]);

            if (documentoResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Documento não encontrado.',
                    dados: null
                });
            }

            if (documentoResult[0].emp_id !== emp_id_autenticada) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Operação negada: Este documento pertence a outra empresa.',
                    dados: null
                });
            }

            if (Number(documentoResult[0].doc_status) === 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Não é possível lançar financeiro para um documento oculto.',
                    dados: null
                });
            }

            const [duplicadoResult] = await db.query('SELECT fin_id FROM FINANCEIRO WHERE doc_id = ?', [doc_id]);
            if (duplicadoResult.length > 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Este documento já possui um registro financeiro.',
                    dados: null
                });
            }

            const sql = `
                INSERT INTO FINANCEIRO (doc_id, fin_valor_total, fin_categoria, fin_data_emissao, fin_status)
                VALUES (?, ?, ?, ?, ?)
            `;

            const values = [
                parseInt(doc_id),
                Number(valorFormatado),
                categoria,
                data_emissao || new Date(),
                fin_status
            ];

            const [result] = await db.query(sql, values);

            return response.status(201).json({
                sucesso: true,
                mensagem: 'Registro financeiro cadastrado com sucesso.',
                dados: {
                    fin_id: result.insertId,
                    doc_id: parseInt(doc_id),
                    fin_valor_total: Number(valorFormatado),
                    fin_categoria: categoria,
                    fin_data_emissao: data_emissao || new Date(),
                    fin_status
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao cadastrar registro financeiro.',
                dados: error.message
            });
        }
    },

    async extrairFinanceiroDoDocumento(request, response) {
        try {
            const { doc_id } = request.params;
            const emp_id_autenticada = request.empresa.id;
            const tipoEmpresa = request.tipoEmpresa;
            const nivelAcesso = request.nivelAcesso;

            if (!doc_id || isNaN(doc_id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do documento inválido.',
                    dados: null
                });
            }

            const sqlDocumento = `
                SELECT d.doc_id, d.emp_id, d.doc_caminho_arquivo, d.doc_nome_original, d.tpd_id, t.tpd_descricao
                FROM DOCUMENTOS d
                INNER JOIN TIPO_DOCUMENTOS t ON t.tpd_id = d.tpd_id
                WHERE d.doc_id = ?
            `;
            const [documentoResult] = await db.query(sqlDocumento, [doc_id]);

            if (documentoResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Documento não encontrado.',
                    dados: null
                });
            }

            if (documentoResult[0].emp_id !== emp_id_autenticada) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Operação negada: Este documento pertence a outra empresa.',
                    dados: null
                });
            }

            const documento = documentoResult[0];
            const caminhoDocumento = path.isAbsolute(documento.doc_caminho_arquivo)
                ? documento.doc_caminho_arquivo
                : path.join(process.cwd(), documento.doc_caminho_arquivo);
                
            if (!fse.existsSync(caminhoDocumento)) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Arquivo físico não encontrado.',
                    dados: null
                });
            }

            const dadosExtraidos = await extrairDadosFinanceiros(
                caminhoDocumento,
                documento.doc_nome_original,
                documento.tpd_descricao
            );

            if (!dadosExtraidos.fin_valor_total) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Não foi possível extrair valor financeiro do documento.',
                    dados: dadosExtraidos
                });
            }

            // CONTROLE DE ACESSO CORPORATIVO (OCR): Se a IA ler e achar um "Imposto" em uma ME, barra se não for Gerente
            if (dadosExtraidos.fin_categoria === 'Imposto' && tipoEmpresa === 0) {
                const nivelMinimoGerente = 2;
                if (!nivelAcesso || nivelAcesso < nivelMinimoGerente) {
                    return response.status(403).json({
                        sucesso: false,
                        mensagem: 'Operação negada: O arquivo processado refere-se a Impostos. Apenas usuários Gerentes podem homologar este lançamento para MEs.',
                        dados: null
                    });
                }
            }

            const [duplicadoResult] = await db.query('SELECT fin_id FROM FINANCEIRO WHERE doc_id = ?', [doc_id]);
            if (duplicadoResult.length > 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Este documento já possui um registro financeiro.',
                    dados: null
                });
            }

            const sqlInserir = `
                INSERT INTO FINANCEIRO (doc_id, fin_valor_total, fin_categoria, fin_data_emissao, fin_status)
                VALUES (?, ?, ?, ?, 1)
            `;

            const [result] = await db.query(sqlInserir, [
                parseInt(doc_id),
                dadosExtraidos.fin_valor_total,
                dadosExtraidos.fin_categoria,
                dadosExtraidos.fin_data_emissao || new Date()
            ]);

            return response.status(201).json({
                sucesso: true,
                mensagem: 'Registro financeiro extraído e criado com sucesso.',
                dados: {
                    fin_id: result.insertId,
                    doc_id: parseInt(doc_id),
                    fin_valor_total: dadosExtraidos.fin_valor_total,
                    fin_categoria: dadosExtraidos.fin_categoria,
                    fin_data_emissao: dadosExtraidos.fin_data_emissao || new Date(),
                    fin_status: 1,
                    texto_extraido: dadosExtraidos.texto_extraido
                }
            });
        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao extrair registro financeiro do documento.',
                dados: error.message
            });
        }
    },

    async editarFinanceiro(request, response) {
        try {
            const { id } = request.params;
            const { doc_id, valor, categoria, data_emissao, status } = request.body;
            const emp_id_autenticada = request.empresa.id;
            const tipoEmpresa = request.tipoEmpresa;
            const nivelAcesso = request.nivelAcesso;

            if (!id || isNaN(id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do registro financeiro inválido.',
                    dados: null
                });
            }

            if (!doc_id || !valor || !categoria || status === undefined) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Campos obrigatórios incompletos ou inválidos.',
                    dados: null
                });
            }

            if (isNaN(doc_id) || isNaN(status)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Documento e status devem ser numéricos.',
                    dados: null
                });
            }

            // CONTROLE DE ACESSO CORPORATIVO (EDIÇÃO): Protegendo a edição de Impostos da ME
            if (categoria === 'Imposto' && tipoEmpresa === 0) {
                const nivelMinimoGerente = 2;
                if (!nivelAcesso || nivelAcesso < nivelMinimoGerente) {
                    return response.status(403).json({
                        sucesso: false,
                        mensagem: 'Operação negada: Alterações na categoria de Impostos para ME exigem nível de Gerente.',
                        dados: null
                    });
                }
            }

            const valorFormatado = String(valor).replace(',', '.');
            if (isNaN(valorFormatado) || Number(valorFormatado) <= 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Valor financeiro inválido.',
                    dados: null
                });
            }

            const categoriasPermitidas = ['Faturamento', 'Imposto', 'Despesa', 'Custo'];
            if (!categoriasPermitidas.includes(categoria)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Categoria inválida. Use Faturamento, Imposto, Despesa ou Custo.',
                    dados: null
                });
            }

            const sqlFinanceiro = `
                SELECT f.fin_id, d.emp_id 
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                WHERE f.fin_id = ?
            `;
            const [financeiroResult] = await db.query(sqlFinanceiro, [id]);

            if (financeiroResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Registro financeiro não encontrado.',
                    dados: null
                });
            }

            if (financeiroResult[0].emp_id !== emp_id_autenticada) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Operação negada: Este registro pertence a outra empresa.',
                    dados: null
                });
            }

            const sqlDocumento = `
                SELECT doc_id, emp_id, CAST(doc_status AS UNSIGNED) AS doc_status FROM DOCUMENTOS WHERE doc_id = ?
            `;
            const [documentoResult] = await db.query(sqlDocumento, [doc_id]);

            if (documentoResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Documento não encontrado.',
                    dados: null
                });
            }

            if (documentoResult[0].emp_id !== emp_id_autenticada) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Não é possível vincular a este documento (empresa divergente).',
                    dados: null
                });
            }

            if (Number(documentoResult[0].doc_status) === 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Não é possível vincular financeiro a documento oculto.',
                    dados: null
                });
            }

            const [duplicadoResult] = await db.query('SELECT fin_id FROM FINANCEIRO WHERE doc_id = ? AND fin_id <> ?', [doc_id, id]);
            if (duplicadoResult.length > 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Este documento já possui outro registro financeiro.',
                    dados: null
                });
            }

            const sql = `
                UPDATE FINANCEIRO
                SET doc_id = ?, fin_valor_total = ?, fin_categoria = ?, fin_data_emissao = ?, fin_status = ?
                WHERE fin_id = ?
            `;

            await db.query(sql, [
                parseInt(doc_id),
                Number(valorFormatado),
                categoria,
                data_emissao || new Date(),
                parseInt(status),
                id
            ]);

            return response.status(200).json({
                sucesso: true,
                mensagem: `Registro financeiro ${id} atualizado com sucesso.`,
                dados: {
                    fin_id: parseInt(id),
                    doc_id: parseInt(doc_id),
                    fin_valor_total: Number(valorFormatado),
                    fin_categoria: categoria,
                    fin_data_emissao: data_emissao || new Date(),
                    fin_status: parseInt(status)
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao editar registro financeiro.',
                dados: error.message
            });
        }
    },

    async apagarFinanceiro(request, response) {
        try {
            const { id } = request.params;
            const emp_id_autenticada = request.empresa.id;

            if (!id || isNaN(id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do registro financeiro inválido.',
                    dados: null
                });
            }

            const sqlBusca = `
                SELECT f.fin_id, d.emp_id 
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                WHERE f.fin_id = ?
            `;
            const [financeiroResult] = await db.query(sqlBusca, [id]);

            if (financeiroResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Registro financeiro não encontrado.',
                    dados: null
                });
            }

            if (financeiroResult[0].emp_id !== emp_id_autenticada) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Operação negada: Este registro pertence a outra empresa.',
                    dados: null
                });
            }

            await db.query('DELETE FROM FINANCEIRO WHERE fin_id = ?', [id]);

            return response.status(200).json({
                sucesso: true,
                mensagem: `Registro financeiro ${id} excluído permanentemente com sucesso.`,
                dados: null
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao excluir registro financeiro.',
                dados: error.message
            });
        }
    },

    async ocultarFinanceiro(request, response) {
        try {
            const { id } = request.params;
            const emp_id_autenticada = request.empresa.id;

            if (!id || isNaN(id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do registro financeiro inválido.',
                    dados: null
                });
            }

            const sqlBusca = `
                SELECT f.fin_id, CAST(f.fin_status AS UNSIGNED) AS fin_status, d.emp_id 
                FROM FINANCEIRO f
                INNER JOIN DOCUMENTOS d ON d.doc_id = f.doc_id
                WHERE f.fin_id = ?
            `;
            const [rows] = await db.query(sqlBusca, [id]);

            if (rows.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Registro financeiro não encontrado.',
                    dados: null
                });
            }

            if (rows[0].emp_id !== emp_id_autenticada) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Operação negada: Este registro pertence a outra empresa.',
                    dados: null
                });
            }

            if (Number(rows[0].fin_status) === 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Registro financeiro já está oculto.',
                    dados: null
                });
            }

            await db.query('UPDATE FINANCEIRO SET fin_status = 0 WHERE fin_id = ?', [id]);

            return response.status(200).json({
                sucesso: true,
                mensagem: `Registro financeiro ${id} ocultado com sucesso.`,
                dados: null
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao ocultar registro financeiro.',
                dados: error.message
            });
        }
    }
};