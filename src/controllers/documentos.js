const db = require('../dataBase/connection');

module.exports = {
async listarDocumentos(request, response) {
    try {
        const {
            id,
            nome,
            tpd_id,
            emp_id,
            usu_id,
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
                MIN(doc_id) AS id_min,
                MAX(doc_id) AS id_max
            FROM DOCUMENTOS
        `);

        const idMinLimite = idMin ?? id_min ?? 0;
        const idMaxLimite = idMax ?? id_max ?? 999999;

        const nomeFiltro = nome ? `%${nome}%` : `%`;
        const statusFiltro = status !== undefined ? parseInt(status) : 1;

        const sql = `
            SELECT
                d.doc_id,
                d.usu_id,
                u.usu_nome,
                d.emp_id,
                e.emp_nome_fantasia,
                e.emp_cnpj,
                d.tpd_id,
                t.tpd_descricao,
                d.doc_caminho_arquivo,
                d.doc_nome_original,
                d.doc_data_upload,
                CAST(d.doc_status AS UNSIGNED) AS doc_status,
                f.fin_id,
                f.fin_valor_total,
                f.fin_categoria,
                f.fin_data_emissao
            FROM DOCUMENTOS d
            LEFT JOIN USUARIOS u
                ON u.usu_id = d.usu_id
            LEFT JOIN EMPRESAS e
                ON e.emp_id = d.emp_id
            LEFT JOIN TIPO_DOCUMENTOS t
                ON t.tpd_id = d.tpd_id
            LEFT JOIN FINANCEIRO f
                ON f.doc_id = d.doc_id
            WHERE 1=1
            AND d.doc_status = ?
            AND d.doc_nome_original LIKE ?
            ${id ? 'AND d.doc_id = ?' : 'AND d.doc_id BETWEEN ? AND ?'}
            ${tpd_id ? 'AND d.tpd_id = ?' : ''}
            ${emp_id ? 'AND d.emp_id = ?' : ''}
            ${usu_id ? 'AND d.usu_id = ?' : ''}
            ${categoria ? 'AND f.fin_categoria = ?' : ''}
            ORDER BY d.doc_id DESC
            LIMIT ?, ?
        `;

        const values = [
            statusFiltro,
            nomeFiltro,
            ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite]),
            ...(tpd_id ? [parseInt(tpd_id)] : []),
            ...(emp_id ? [parseInt(emp_id)] : []),
            ...(usu_id ? [parseInt(usu_id)] : []),
            ...(categoria ? [categoria] : []),
            offset,
            parseInt(limit)
        ];

        const [rows] = await db.query(sql, values);

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM DOCUMENTOS d
            LEFT JOIN FINANCEIRO f
                ON f.doc_id = d.doc_id
            WHERE 1=1
            AND d.doc_status = ?
            AND d.doc_nome_original LIKE ?
            ${id ? 'AND d.doc_id = ?' : 'AND d.doc_id BETWEEN ? AND ?'}
            ${tpd_id ? 'AND d.tpd_id = ?' : ''}
            ${emp_id ? 'AND d.emp_id = ?' : ''}
            ${usu_id ? 'AND d.usu_id = ?' : ''}
            ${categoria ? 'AND f.fin_categoria = ?' : ''}
        `;

        const countValues = [
            statusFiltro,
            nomeFiltro,
            ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite]),
            ...(tpd_id ? [parseInt(tpd_id)] : []),
            ...(emp_id ? [parseInt(emp_id)] : []),
            ...(usu_id ? [parseInt(usu_id)] : []),
            ...(categoria ? [categoria] : [])
        ];

        const [[{ total }]] = await db.query(countQuery, countValues);

        response.setHeader('X-Total-Count', total);

        return response.status(200).json({
            sucesso: true,
            mensagem: 'Lista de documentos.',
            nItens: rows.length,
            dados: rows
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar documentos.',
            dados: error.message
        });
    }
},

async cadastrarDocumentos(request, response) {
    try {
        const {
            usu_id,
            emp_id,
            tpd_id
        } = request.body;

        const doc_status = 1;

        // 1. Validação de arquivo
        if (!request.file) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Arquivo não enviado.',
                dados: null
            });
        }

        const { path, originalname } = request.file;

        // 2. Validação de campos obrigatórios
        if (!usu_id || !emp_id || !tpd_id) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Usuário, empresa e tipo do documento são obrigatórios.',
                dados: null
            });
        }

        // 3. Validação de campos numéricos
        if (isNaN(usu_id) || isNaN(emp_id) || isNaN(tpd_id)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Usuário, empresa e tipo do documento devem ser numéricos.',
                dados: null
            });
        }

        const sqlUsuario = `
            SELECT usu_id
            FROM USUARIOS
            WHERE usu_id = ?
            AND usu_status = 1
        `;

        const [usuarioResult] = await db.query(sqlUsuario, [usu_id]);

        // 4. Validação de existência do usuário
        if (usuarioResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado ou inativo.',
                dados: null
            });
        }

        const sqlEmpresa = `
            SELECT emp_id
            FROM EMPRESAS
            WHERE emp_id = ?
            AND emp_status = 1
        `;

        const [empresaResult] = await db.query(sqlEmpresa, [emp_id]);

        // 5. Validação de existência da empresa
        if (empresaResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Empresa não encontrada ou inativa.',
                dados: null
            });
        }

        const sqlTipo = `
            SELECT tpd_id
            FROM TIPO_DOCUMENTOS
            WHERE tpd_id = ?
            AND tpd_status = 1
        `;

        const [tipoResult] = await db.query(sqlTipo, [tpd_id]);

        // 6. Validação de existência do tipo
        if (tipoResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Tipo de documento não encontrado ou inativo.',
                dados: null
            });
        }

        const sql = `
            INSERT INTO DOCUMENTOS
                (
                    usu_id,
                    emp_id,
                    tpd_id,
                    doc_caminho_arquivo,
                    doc_nome_original,
                    doc_status
                )
            VALUES
                (?, ?, ?, ?, ?, ?)
        `;

        const values = [
            parseInt(usu_id),
            parseInt(emp_id),
            parseInt(tpd_id),
            path,
            originalname,
            doc_status
        ];

        const [result] = await db.query(sql, values);

        const dados = {
            doc_id: result.insertId,
            usu_id: parseInt(usu_id),
            emp_id: parseInt(emp_id),
            tpd_id: parseInt(tpd_id),
            doc_caminho_arquivo: path,
            doc_nome_original: originalname,
            doc_status
        };

        return response.status(201).json({
            sucesso: true,
            mensagem: 'Documento cadastrado com sucesso.',
            dados
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar documento.',
            dados: error.message
        });
    }
 },

async editarDocumentos(request, response) {
    try {
        const { id } = request.params;

        const {
            usu_id,
            emp_id,
            tpd_id,
            status
        } = request.body;

        // 1. Validação de ID
        if (!id || isNaN(id)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'ID do documento inválido.',
                dados: null
            });
        }

        // 2. Validação de campos obrigatórios
        if (
            !usu_id ||
            !emp_id ||
            !tpd_id ||
            status === undefined
        ) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Campos obrigatórios incompletos ou inválidos.',
                dados: null
            });
        }

        // 3. Validação de campos numéricos
        if (
            isNaN(usu_id) ||
            isNaN(emp_id) ||
            isNaN(tpd_id) ||
            isNaN(status)
        ) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Usuário, empresa, tipo do documento e status devem ser numéricos.',
                dados: null
            });
        }

        const sqlBusca = `
            SELECT doc_id
            FROM DOCUMENTOS
            WHERE doc_id = ?
        `;

        const [documentoResult] = await db.query(sqlBusca, [id]);

        // 4. Validação de existência do documento
        if (documentoResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Documento não encontrado.',
                dados: null
            });
        }

        const sqlUsuario = `
            SELECT usu_id
            FROM USUARIOS
            WHERE usu_id = ?
            AND usu_status = 1
        `;

        const [usuarioResult] = await db.query(sqlUsuario, [usu_id]);

        // 5. Validação de existência do usuário
        if (usuarioResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado ou inativo.',
                dados: null
            });
        }

        const sqlEmpresa = `
            SELECT emp_id
            FROM EMPRESAS
            WHERE emp_id = ?
            AND emp_status = 1
        `;

        const [empresaResult] = await db.query(sqlEmpresa, [emp_id]);

        // 6. Validação de existência da empresa
        if (empresaResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Empresa não encontrada ou inativa.',
                dados: null
            });
        }

        const sqlTipo = `
            SELECT tpd_id
            FROM TIPO_DOCUMENTOS
            WHERE tpd_id = ?
            AND tpd_status = 1
        `;

        const [tipoResult] = await db.query(sqlTipo, [tpd_id]);

        // 7. Validação de existência do tipo
        if (tipoResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Tipo de documento não encontrado ou inativo.',
                dados: null
            });
        }

        let sql = `
            UPDATE DOCUMENTOS
            SET
                usu_id = ?,
                emp_id = ?,
                tpd_id = ?,
                doc_status = ?
        `;

        const values = [
            parseInt(usu_id),
            parseInt(emp_id),
            parseInt(tpd_id),
            parseInt(status)
        ];

        if (request.file) {
            sql += `,
                doc_caminho_arquivo = ?,
                doc_nome_original = ?
            `;

            values.push(
                request.file.path,
                request.file.originalname
            );
        }

        sql += `
            WHERE doc_id = ?
        `;

        values.push(id);

        const [result] = await db.query(sql, values);

        if (result.affectedRows === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Documento não encontrado para atualização.',
                dados: null
            });
        }

        const dados = {
            doc_id: parseInt(id),
            usu_id: parseInt(usu_id),
            emp_id: parseInt(emp_id),
            tpd_id: parseInt(tpd_id),
            doc_status: parseInt(status),
            arquivo_atualizado: request.file ? true : false
        };

        if (request.file) {
            dados.doc_caminho_arquivo = request.file.path;
            dados.doc_nome_original = request.file.originalname;
        }

        return response.status(200).json({
            sucesso: true,
            mensagem: `Documento ${id} atualizado com sucesso.`,
            dados
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao editar documento.',
            dados: error.message
        });
    }
 },

async apagarDocumentos(request, response) {
    try {
        const { id } = request.params;

        // 1. Validação de ID
        if (!id || isNaN(id)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'ID do documento inválido.',
                dados: null
            });
        }

        const sqlBusca = `
            SELECT doc_id
            FROM DOCUMENTOS
            WHERE doc_id = ?
        `;

        const [documentoResult] = await db.query(sqlBusca, [id]);

        // 2. Validação de existência do documento
        if (documentoResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Documento não encontrado.',
                dados: null
            });
        }

        const sql = `
            DELETE FROM DOCUMENTOS
            WHERE doc_id = ?
        `;

        await db.query(sql, [id]);

        return response.status(200).json({
            sucesso: true,
            mensagem: `Documento ${id} excluído permanentemente com sucesso.`,
            dados: null
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao excluir documento.',
            dados: error.message
        });
    }
 },

async ocultarDocumentos(request, response) {
    try {
        const { id } = request.params;

        // 1. Validação de ID
        if (!id || isNaN(id)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'ID do documento inválido.',
                dados: null
            });
        }

        const sqlBusca = `
            SELECT
                doc_id,
                CAST(doc_status AS UNSIGNED) AS doc_status
            FROM DOCUMENTOS
            WHERE doc_id = ?
        `;

        const [rows] = await db.query(sqlBusca, [id]);

        // 2. Validação de existência do documento
        if (rows.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Documento não encontrado.',
                dados: null
            });
        }

        // 3. Validação de documento já oculto
        if (Number(rows[0].doc_status) === 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Documento já está oculto.',
                dados: null
            });
        }

        const sqlOcultar = `
            UPDATE DOCUMENTOS
            SET doc_status = 0
            WHERE doc_id = ?
        `;

        await db.query(sqlOcultar, [id]);

        return response.status(200).json({
            sucesso: true,
            mensagem: `Documento ${id} ocultado com sucesso.`,
            dados: null
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao ocultar documento.',
            dados: error.message
        });
    }
 }
}