const db = require('../dataBase/connection');

module.exports = {
async listarTipoDocumentos(request, response) {
    try {
        const { descricao, id, page = 1, limit = 5 } = request.query;

        const idMin = request.query.idMin ? parseInt(request.query.idMin) : undefined;
        const idMax = request.query.idMax ? parseInt(request.query.idMax) : undefined;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [[{ id_min, id_max }]] = await db.query(`
            SELECT MIN(tpd_id) AS id_min, MAX(tpd_id) AS id_max 
            FROM TIPO_DOCUMENTOS
        `);

        const idMinLimite = idMin ? parseInt(idMin) : (id_min ?? 0);
        const idMaxLimite = idMax ? parseInt(idMax) : (id_max ?? 999999);

        const tpd_descricao = descricao ? `%${descricao}%` : `%`;

        let sql = `
            SELECT 
                tpd_id, tpd_descricao 
            FROM 
                TIPO_DOCUMENTOS
            WHERE 
                tpd_status = 1 
                AND tpd_descricao LIKE ?
                ${id ? 'AND tpd_id = ?' : 'AND tpd_id BETWEEN ? AND ?'}
            LIMIT ?, ?
        `;

        const values = [
            tpd_descricao,
            ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite]),
            offset,
            parseInt(limit)
        ];

        const [rows] = await db.query(sql, values);

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM TIPO_DOCUMENTOS
            WHERE 
                tpd_status = 1
                AND tpd_descricao LIKE ?
                ${id ? 'AND tpd_id = ?' : 'AND tpd_id BETWEEN ? AND ?'}
        `;

        const countValues = [
            tpd_descricao,
            ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite])
        ];

        const [[{ total }]] = await db.query(countQuery, countValues);

        response.setHeader('X-Total-Count', total);

        return response.status(200).json({
            sucesso: true,
            mensagem: 'Tipos dos documentos listados com sucesso',
            nItens: rows.length,
            dados: rows
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: `Erro ao listar os tipos dos documentos: ${error.message}`,
            dados: null
        });
    }
},


     async cadastrarTipoDocumentos (request, response) {
        try{

            const { descricao } = request.body;
            const tpd_status = 1;

            //Instrução SQL
            const sql = `
            INSERT INTO TIPO_DOCUMENTOS 
                (tpd_descricao, tpd_status)
            VALUES 
                (?, ?);
            `;

            //Valores
            const values = [descricao, tpd_status];

            //Execução da query
            const [result] =  await db.query(sql, values);

            //Identificação do ID inserido.
            const dados = {
                id : result.insertId,
                descricao
            };
          
            return response.status(200).json(
                {
                    sucesso: true,
                    mensagem: 'Cadastro de tipos de documentos realizado com sucesso',
                    dados: dados
                }
            );
        }        catch (error) {
            return response.status(500).json(
                {
                    sucesso: false,
                    mensagem: `Erro ao cadastrar os seguintes tipos de documentos: ${error.message}`,
                    dados: error.message
                }
            );
        }
    },

    async editarTipoDocumentos (request, response) {
        try{

            //parâmetros do corpo da requisição
            const { descricao } = request.body;

            //parametros da rota via URL
            const { id } = request.params;

            //Instrução SQL de ATUALIZAÇÃO.
            const sql = `
            UPDATE TIPO_DOCUMENTOS 
            SET tpd_descricao = ? 
            WHERE tpd_id = ?;
            `;

            //Valores em array.
            const values = [descricao, id];

            //Execução da query
            const [result] =  await db.query(sql, values);

            //Verifica se algum registro foi afetado
            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem:` Tipo de documento ${id} não encontrado.`,
                    dados: null
                });
            }

            const dados = {
                id,
                descricao: descricao
            };
            return response.status(200).json(
                {
                    sucesso: true,
                    mensagem: `Tipos de documentos ${id} atualizado com sucesso`,
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

    async apagarTipoDocumentos (request, response) {
        try{
            //parâmetros da rota via URL
            const { id } = request.params;

            //Instrução SQL de EXCLUSÃO
            const sql = `
            DELETE FROM TIPO_DOCUMENTOS  WHERE tpd_id = ?;
            `;

            //Valores em array.
            const values = [id];

            //Execução da query
            const [result] =  await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Tipo de documento com ID ${id} não encontrado.`,
                    dados: null
                });
            }
            
            return response.status(200).json(
                {
                    sucesso: true,
                    mensagem: 'Exclusão dos tipos de documentos realizado com sucesso',
                    dados: null
                }
            );
        }        catch (error) {
            return response.status(500).json(
                {
                    sucesso: false,
                    mensagem: `Erro ao remover os seguintes tipos de documentos: ${error.message}`,
                    dados: null
                }
            );
        }
    },

    
    async ocultarTipoDocumentos (request, response) {
        try{
            const { id } = request.params;

            //1. Verificar se o registro existe
            const sqlBusca = `
                SELECT tpd_id, tpd_ativo
                FROM TIPO_DOCUMENTOS
                WHERE tpd_id = ?;
            `;

            const [rows] = await db.query(sqlBusca, [id]);

            if (rows.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Tipo de documento com ID ${id} não encontrado.`,
                    dados: null
                });
            }

            //2. Verificar se já está oculto
            if (rows[0].tpd_ativo === 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: `Tipo de documento com ID ${id} já está excluído.`,
                    dados: null
                });
            }

            //3. Ocultar (soft delete)
            const sqlOcultar = `
                UPDATE TIPO_DOCUMENTOS
                SET tpd_ativo = 0
                WHERE tpd_id = ?;
            `;

            const [result] = await db.query(sqlOcultar, [id]);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false, 
                    mensagem: `Não foi possível excluir o tipo de documento com ID ${id}.`,
                    dados: null
                });
            }
            
            //4. Sucesso.
            return response.status(200).json(
                {
                    sucesso: true,
                    mensagem: `Tipo de documento com ID ${id} excluído com sucesso.`,
                    dados: null
                }
            );

        }        catch (error) {
            return response.status(500).json(
                {
                    sucesso: false,
                    mensagem: `Erro ao remover os seguintes tipos de documentos: ${error.message}`,
                    dados: null
                }
            );
        }
    },
}