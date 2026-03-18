const db = require('../dataBase/connection');

module.exports = {
async listarDocumentos(request, response) {
    try {
        const {
            id,
            nome,
            tpd_id,
            emp_id,
            valor,
            page = 1,
            limit = 5
        } = request.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [[{ valor_max }]] = await db.query(`
            SELECT MAX(doc_valor) AS valor_max FROM DOCUMENTOS
        `);

        const valorLimite = parseFloat(valor ?? valor_max);

        let sql = `
            SELECT 
                doc_id, usu_id, emp_id, tpd_id,
                doc_arquivo_nome, doc_data_emissao, doc_valor
            FROM DOCUMENTOS
            WHERE doc_status = 1
            AND doc_arquivo_nome LIKE ?
            ${tpd_id ? 'AND tpd_id = ?' : ''}
            ${emp_id ? 'AND emp_id = ?' : ''}
            ${id ? 'AND doc_id = ?' : ''}
            AND doc_valor <= ?
            LIMIT ?, ?
        `;

        const values = (tpd_id || emp_id || id)
            ? [
                `%${nome ?? ''}%`,
                ...(tpd_id ? [parseInt(tpd_id)] : []),
                ...(emp_id ? [parseInt(emp_id)] : []),
                ...(id ? [parseInt(id)] : []),
                valorLimite,
                offset,
                parseInt(limit)
            ]
            : [
                `%${nome ?? ''}%`,
                valorLimite,
                offset,
                parseInt(limit)
            ];

        const [rows] = await db.query(sql, values);

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM DOCUMENTOS
            WHERE doc_status = 1
            AND doc_arquivo_nome LIKE ?
            ${tpd_id ? 'AND tpd_id = ?' : ''}
            ${emp_id ? 'AND emp_id = ?' : ''}
            ${id ? 'AND doc_id = ?' : ''}
            AND doc_valor <= ?
        `;

        const countValues = (tpd_id || emp_id || id)
            ? [
                `%${nome ?? ''}%`,
                ...(tpd_id ? [parseInt(tpd_id)] : []),
                ...(emp_id ? [parseInt(emp_id)] : []),
                ...(id ? [parseInt(id)] : []),
                valorLimite
            ]
            : [
                `%${nome ?? ''}%`,
                valorLimite
            ];

        const [[{ total }]] = await db.query(countQuery, countValues);

        response.setHeader('X-Total-Count', total);

        return response.status(200).json({
            sucesso: true,
            mensagem: 'Lista de Documentos',
            nItens: rows.length,
            dados: rows
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: `Erro ao listar os documentos: ${error.message}`,
            dados: null
        });
    }
},

     async cadastrarDocumentos (request, response) {
        try{

            //Dados do corpo da requisição
            const { usu_id, emp_id, tpd_id, nome, dt_emissao, valor } = request.body;
            const doc_status = 1;

            //Instrução SQL
            // PS: usu_id, emp_id e tpd_id são chaves estrangeiras
            const sql = `
            INSERT INTO DOCUMENTOS 
                (usu_id, emp_id, tpd_id, doc_arquivo_nome, doc_data_emissao, doc_valor, doc_status) 
            VALUES
                (?, ?, ?, ?, ?, ?, ?);
            `;

            //Valores
            const values = [usu_id, emp_id, tpd_id, nome, dt_emissao, valor, doc_status];

            //Execução da query
            const [result] =  await db.query(sql, values);

            //Identificação do ID inserido.
            const dados = {
                id : result.insertId,
                usu_id,
                emp_id,
                tpd_id,
                nome,
                dt_emissao,
                valor
            };
          



            return response.status(200).json(
                {
                    sucesso: true,
                    mensagem: 'Cadastro de documentos realizado com sucesso',
                    dados: dados
                }
            );
        }        catch (error) {
            return response.status(500).json(
                {
                    sucesso: false,
                    mensagem: `Erro ao cadastrar os seguintes documentos: ${error.message}`,
                    dados: error.message
                }
            );
        }
    },

    async editarDocumentos (request, response) {
        try{

            //parâmetros do corpo da requisição
            const { arq_nome, dt_emissao, valor } = request.body;

            //parametros da rota via URL
            const { id } = request.params;

            // Instrução SQL
            const sql = `
            UPDATE DOCUMENTOS SET
                doc_arquivo_nome = ?, doc_data_emissao = ?, doc_valor = ?
            WHERE
                doc_id = ?;
            `;

            //Valores em Array.
            const values = [arq_nome, dt_emissao, valor, id];

            //Execução da query
            const [result] =  await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                        sucesso: false,
                        mensagem: 'Documento não encontrado para atualização',
                        dados: null
                    });
            }

            const dados = {
                id,
                arq_nome,
                dt_emissao,
                valor
            };

            return response.status(200).json(
                {
                    sucesso: true,
                    mensagem: `Atualização do documento ${id} realizada com sucesso`,
                    dados
                }
            );
        }        catch (error) {
            return response.status(500).json(
                {
                    sucesso: false,
                    mensagem: 'Erro na requisição.',
                    dados: error.message
                }
            );
        }
    },

    async apagarDocumentos(request, response) {
    try {

        const { id } = request.params;

        const sql = `DELETE FROM DOCUMENTOS WHERE doc_id = ?;`;

        const [result] = await db.query(sql, [id]);


        if (result.affectedRows === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: `Documento com ID ${id} não encontrado.`,
                dados: null
            });
        }

        return response.status(200).json({
            sucesso: true,
            mensagem: `Exclusão do documento realizada com sucesso.`,
            dados: null
        });
    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: `Erro ao remover o documento: ${error.message}`,
            dados: null
        });
    }
},

    async ocultarDocumentos(request, response) {
    try {
        const { id } = request.params;

        // 1. Verificar se o documento existe
        const sqlBusca = `
            SELECT  doc_id, doc_status
            FROM DOCUMENTOS
            WHERE doc_id = ?;
        `;
        const [rows] = await db.query(sqlBusca, [id]);

        if (rows.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: `Documento com ID ${id} não encontrado.`,
                dados: null
            });
        }

        // 2. Verificar se já está oculto
        if (rows[0].doc_ativo === 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: `Documento com ID ${id} já está oculto.`,
                dados: null
            });
        }

        // 3. Ocultar (soft delete)
        const sqlOcultar = `
            UPDATE DOCUMENTOS
            SET doc_status = 0
            WHERE doc_id = ?;
        `;
        const [result] = await db.query(sqlOcultar, [id]);

        if (result.affectedRows === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: `Não foi possível ocultar o documento com ID ${id}.`,
                dados: null
            });
        }

        // 4. Sucesso
        return response.status(200).json({
            sucesso: true,
            mensagem: `Documento com ID ${id} oculto com sucesso.`,
            dados: null
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: `Erro ao ocultar o documento: ${error.message}`,
            dados: null
        });
    }
},
}