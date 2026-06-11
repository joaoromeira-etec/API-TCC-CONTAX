const db = require('../dataBase/connection');

/*
--------------------------------------------------------------------------
    Controller: Financeiro

    Tabela Principal: FINANCEIRO

    Responsável por gerenciar os dados financeiros vinculados aos documentos.

    Regras:
    - Todo lançamento financeiro deve estar vinculado a um documento existente.
    - Categorias permitidas: Faturamento, Imposto e Despesa.
    - fin_status: 0-Inativo/Oculto; 1-Ativo.
    - O apagar remove permanentemente.
    - O ocultar apenas altera o status para 0.
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

        const idMin = request.query.idMin
            ? parseInt(request.query.idMin)
            : undefined;

        const idMax = request.query.idMax
            ? parseInt(request.query.idMax)
            : undefined;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [[{ id_min, id_max }]] = await db.query(`
            SELECT
                MIN(fin_id) AS id_min,
                MAX(fin_id) AS id_max
            FROM FINANCEIRO
        `);

        const idMinLimite = idMin ?? id_min ?? 0;
        const idMaxLimite = idMax ?? id_max ?? 999999;

        const statusFiltro =
            status !== undefined
                ? parseInt(status)
                : 1;

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
            INNER JOIN DOCUMENTOS d
                ON d.doc_id = f.doc_id
            INNER JOIN EMPRESAS e
                ON e.emp_id = d.emp_id
            WHERE 1=1
            AND f.fin_status = ?
            ${id ? 'AND f.fin_id = ?' : 'AND f.fin_id BETWEEN ? AND ?'}
            ${doc_id ? 'AND f.doc_id = ?' : ''}
            ${categoria ? 'AND f.fin_categoria = ?' : ''}
            ORDER BY f.fin_id DESC
            LIMIT ?, ?
        `;

        const values = [
            statusFiltro,
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
            WHERE 1=1
            AND f.fin_status = ?
            ${id ? 'AND f.fin_id = ?' : 'AND f.fin_id BETWEEN ? AND ?'}
            ${doc_id ? 'AND f.doc_id = ?' : ''}
            ${categoria ? 'AND f.fin_categoria = ?' : ''}
        `;

        const countValues = [
            statusFiltro,

            ...(id? [parseInt(id)]: [idMinLimite, idMaxLimite]),
            ...(doc_id? [parseInt(doc_id)]: []),
            ...(categoria ? [categoria]: [])
        ];

        const [[{ total }]] = await db.query(
            countQuery,
            countValues
        );

        response.setHeader(
            'X-Total-Count',
            total
        );

        return response.status(200).json({
            sucesso: true,
            mensagem: 'Lista de registros financeiros.',
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

async cadastrarFinanceiro(request, response) {
    try {
        const {
            doc_id,
            valor,
            categoria,
            data_emissao
        } = request.body;

        const fin_status = 1;

        // 1. Validação de campos obrigatórios
        if (!doc_id || !valor || !categoria) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Documento, valor e categoria são obrigatórios.',
                dados: null
            });
        }

        // 2. Validação de campos numéricos
        if (isNaN(doc_id)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'ID do documento deve ser numérico.',
                dados: null
            });
        }

        // 3. Validação de valor
        const valorFormatado = String(valor).replace(',', '.');

        if (isNaN(valorFormatado) || Number(valorFormatado) <= 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Valor financeiro inválido.',
                dados: null
            });
        }

        // 4. Validação de categoria
        const categoriasPermitidas = ['Faturamento', 'Imposto', 'Despesa'];

        if (!categoriasPermitidas.includes(categoria)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Categoria inválida. Use Faturamento, Imposto ou Despesa.',
                dados: null
            });
        }

        const sqlDocumento = `
            SELECT
                doc_id,
                CAST(doc_status AS UNSIGNED) AS doc_status
            FROM DOCUMENTOS
            WHERE doc_id = ?
        `;

        const [documentoResult] = await db.query(sqlDocumento, [doc_id]);

        // 5. Validação de existência do documento
        if (documentoResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Documento não encontrado.',
                dados: null
            });
        }

        // 6. Validação de documento ativo
        if (Number(documentoResult[0].doc_status) === 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível lançar financeiro para um documento oculto.',
                dados: null
            });
        }

        const sqlDuplicado = `
            SELECT fin_id
            FROM FINANCEIRO
            WHERE doc_id = ?
        `;

        const [duplicadoResult] = await db.query(sqlDuplicado, [doc_id]);

        // 7. Validação de financeiro duplicado
        if (duplicadoResult.length > 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Este documento já possui um registro financeiro.',
                dados: null
            });
        }

        const sql = `
            INSERT INTO FINANCEIRO
                (
                    doc_id,
                    fin_valor_total,
                    fin_categoria,
                    fin_data_emissao,
                    fin_status
                )
            VALUES
                (?, ?, ?, ?, ?)
        `;

        const values = [
            parseInt(doc_id),
            Number(valorFormatado),
            categoria,
            data_emissao || new Date(),
            fin_status
        ];

        const [result] = await db.query(sql, values);

        const dados = {
            fin_id: result.insertId,
            doc_id: parseInt(doc_id),
            fin_valor_total: Number(valorFormatado),
            fin_categoria: categoria,
            fin_data_emissao: data_emissao || new Date(),
            fin_status
        };

        return response.status(201).json({
            sucesso: true,
            mensagem: 'Registro financeiro cadastrado com sucesso.',
            dados
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar registro financeiro.',
            dados: error.message
        });
    }
},

};