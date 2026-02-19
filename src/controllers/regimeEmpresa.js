const db = require('../dataBase/connection');

module.exports = {
    async listarRegimeEmpresa (request, response) {
        try{

            const sql = `
                SELECT
                    regi_emp_id, regi_id, emp_id, regi_emp_data_inicio, regi_emp_data_fim, 
                    regi_emp_motivo_alteracao, regi_emp_status, regi_emp_observacoes 
                FROM REGIME_EMPRESA
                WHERE regi_emp_status = 1;
            `;

            const [regimeEmpresas] =  await db.query(sql);

            return response.status(200).json(
                {
                    sucesso: true,
                    mensagem: 'Regimes de empresas listados com sucesso',
                    itens: regimeEmpresas.length,
                    dados: regimeEmpresas,
                }
            );
        }        catch (error) {
            return response.status(500).json(
                {
                    sucesso: false,
                    mensagem: `Erro ao listar os seguintes regimes das empresas: ${error.message}`,
                    dados: null
                }
            );
        }
    },


     async cadastrarRegimeEmpresa (request, response) {
        try{

            //Dados do corpo da requisição
            const { regi_id, emp_id, dt_inicio, dt_fim,
                motivo_alteracao, status, observacoes } = request.body;


            //Instrução SQL
            // PS: regi_id e emp_id são chaves estrangeiras
            const sql = `
                INSERT INTO REGIME_EMPRESA 
                    (regi_id, emp_id, regi_emp_data_inicio, regi_emp_data_fim,
                    regi_emp_motivo_alteracao, regi_emp_status, regi_emp_observacoes)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?);
            `;

            //Valores
            const values = [regi_id, emp_id, dt_inicio, dt_fim,
                motivo_alteracao, status, observacoes];

            //Execução da query
            const [result] =  await db.query(sql, values);

            //Identificação do ID inserido.
            const dados = {
                id : result.insertId,
                regi_id,
                emp_id,
                dt_inicio,
                dt_fim,
                motivo_alteracao,
                status,
                observacoes
            };

            return response.status(200).json(
                {
                    sucesso: true,
                    mensagem: 'Cadastro de regime das empresas realizado com sucesso',
                    dados: dados
                }
            );
        }        catch (error) {
            return response.status(500).json(
                {
                    sucesso: false,
                    mensagem: `Erro ao cadastrar os seguintes regimes das empresas: ${error.message}`,
                    dados: error.message
                }
            );
        }
    },

    async editarRegimeEmpresa (request, response) {
        try{

            //parâmetros do corpo da requisição
            const {regi_id, emp_id, dt_inicio, dt_fim,
                motivo_alteracao, status, observacoes} = request.body;

            //parametros da rota via URL
            const { id } = request.params;

            //Instrução SQL
            const sql = `
                UPDATE REGIME_EMPRESA SET
                    regi_id = ?, emp_id = ?, regi_emp_data_inicio = ?, 
                    regi_emp_data_fim = ?,  regi_emp_motivo_alteracao = ?, 
                    regi_emp_status = ?, regi_emp_observacoes = ?
                WHERE regi_emp_id = ?;
            `;

            //Valores em array.
            const values = [regi_id, emp_id, dt_inicio, dt_fim,
                motivo_alteracao, status, observacoes, id];

            //Execução da query
            const [result] =  await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Regime da empresa com ID ${id} não encontrado.`,
                    dados: null
                });
            }

            const dados = {
                id,
                regi_id,
                emp_id,
                dt_inicio,
                dt_fim,
                motivo_alteracao,
                status,
                observacoes
            };

            return response.status(200).json(
                {
                    sucesso: true,
                    mensagem: `Regime da empresa ${id} atualizado com sucesso`,
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

    async apagarRegimeEmpresa(request, response) {
    try {
        const { id } = request.params;

        // DELETE físico
        const sql = `
            DELETE FROM REGIME_EMPRESA
            WHERE regi_emp_id = ?;
        `;
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: `Registro de regime_empresa com ID ${id} não encontrado.`,
                dados: null
            });
        }

        return response.status(200).json({
            sucesso: true,
            mensagem: 'Registro de regime_empresa excluído com sucesso.',
            dados: null
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: `Erro ao remover o registro: ${error.message}`,
            dados: null
        });
    }
},

    async ocultarRegimeEmpresa(request, response) {
    try {
        const { id } = request.params;

        // 1. Verificar se o registro existe
        const sqlBusca = `
            SELECT regi_emp_id, regi_emp_status
            FROM REGIME_EMPRESA
            WHERE regi_emp_id = ?;
        `;
        const [rows] = await db.query(sqlBusca, [id]);

        if (rows.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: `Registro de regime empresa com ID ${id} não encontrado.`,
                dados: null
            });
        }

        // 2. Verificar se já está oculto
        if (rows[0].regiemp_status === 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: `Registro de regime empresa com ID ${id} já está inativo.`,
                dados: null
            });
        }

        // 3. Ocultar (soft delete)
        const sqlOcultar = `
            UPDATE REGIME_EMPRESA
            SET regiemp_status = 0
            WHERE regiemp_id = ?;
        `;
        const [result] = await db.query(sqlOcultar, [id]);

        if (result.affectedRows === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: `Não foi possível ocultar o registro de regime empresa com ID ${id}.`,
                dados: null
            });
        }

        return response.status(200).json({
            sucesso: true,
            mensagem: `Registro de regime empresa com ID ${id} ocultado com sucesso.`,
            dados: null
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: `Erro ao ocultar o registro: ${error.message}`,
            dados: null
        });
    }
},
}