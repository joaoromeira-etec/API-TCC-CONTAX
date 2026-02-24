const db = require('../dataBase/connection');

module.exports = {
    async listarUsuarioEmpresa (request, response) {
        try {

            const sql = 
            `SELECT
                usu_emp_id, emp_id, usu_id, usu_emp_nivel_acesso,
                usu_emp_data_vinculo, usu_emp_observacoes
            FROM USUARIO_EMPRESAS
            WHERE usu_emp_status = 1;
            `;

            const [usuarioEmpresas] = await db.query (sql);

            return response.status(200).json ({
                sucesso: true,
                mensagem: 'Lista de usuários por empresa obtida com sucesso',
                itens: usuarioEmpresas.length,
                dados: usuarioEmpresas
            });

        } catch (error) {
            return response.status (500).json ({
                sucesso: false,
                mensagem: `Erro ao listar usuários por empresas: ${error.message}`,
                dados: null
            });
        }
    },
    async cadastrarUsuarioEmpresa (request, response) {
        try {

            //Dados do corpo da requisição
            const {emp_id, usu_id, nivel_acesso,
                   data_vinculo, observacoes} = request.body;
            const usu_emp_status = 1;

            const sql = `
            INSERT INTO USUARIO_EMPRESAS
                (emp_id, usu_id, usu_emp_nivel_acesso, usu_emp_data_vinculo,
                 usu_emp_status, usu_emp_observacoes)
            VALUES
                (?, ?, ?, ?, ?, ?);
            `;
            
            const values = [emp_id, usu_id, nivel_acesso,
                            data_vinculo, usu_emp_status, observacoes];

            const[result] = await db.query(sql, values);
            
            const dados = {
                id: result.insertId,
                emp_id,
                usu_id,
                nivel_acesso,
                data_vinculo,
                observacoes
            };
        
            return response.status(200).json ({
                sucesso: true,
                mensagem: 'Cadastro de usuário à empresa obtida com sucesso',
                dados: dados
                });

        } catch (error) {
            return response.status (500).json ({
                sucesso: false,
                mensagem: `Erro ao cadastrar usuário à empresa.`,
                dados: error.message
                });
        }
    },
    async editarUsuarioEmpresa (request, response) {
        try {
            // Parâmetros recebidos pelo corpo da requisição
            const {emp_id, usu_id, nivel_acesso, data_vinculo,
                   status, observacoes} = request.body;

            //Parâmetro recebido pela URL via params ex: /usuario/1
            const {id} = request.params;

            //instruções SQL
            const sql = `
                UPDATE USUARIO_EMPRESAS SET 
                    emp_id = ?, usu_id = ?, usu_emp_nivel_acesso = ?,
                usu_emp_data_vinculo = ?, usu_emp_status = ?, usu_emp_observacoes = ? 
                WHERE
                    usu_emp_id = ?;
                `;

                //Preparo do array com dados que serão atualizados
                const values = [emp_id, usu_id, nivel_acesso, data_vinculo, status, observacoes, id];
                
                //execução e obtenção de confirmação da atualização realizada
                const [result] = await db.query(sql, values);

                if (result.affectedRows === 0) {
                    return response.status(404).json ({
                        sucesso: false,
                        mensagem: `Usuário da empresa não encontrada`,
                        dados: null
                    });
                }

                const dados = {
                id,
                emp_id,
                usu_id,
                nivel_acesso,
                data_vinculo,
                status,
                observacoes
                };

            return response.status(200).json ({
                sucesso: true,
                mensagem: `Usuário da empresa ${id} atualizada com sucesso`,
                dados
            });

        } catch (error) {
            return response.status (500).json ({
                sucesso: false,
                mensagem: `Erro na requisição`,
                dados: error.message
            });
        }
    },
    async apagarUsuarioEmpresa (request, response) {
        try {
            //parâmetro passado via url na chamada da api pelo front-end
            const{id} = request.params;
            //comando de exclusão
            const sql = `
                DELETE FROM USUARIO_EMPRESAS
                WHERE usu_emp_id = ?;
            `;

            //executa instrução no banco de dados
            const [result] = await db.query(sql, [id]);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    //resolver como colocar o id do usuario e id da empresa aqui
                    mensagem: `Usuário da empresa não encontrado`,
                    dados: null
                });
            }

            return response.status(200).json ({
                sucesso: true,
                mensagem: 'Exclusão de usuário da empresa obtida com sucesso',
                dados: null
            });

        } catch (error) {
            return response.status (500).json ({
                sucesso: false,
                mensagem: `Erro ao excluir usuário da empresa: ${error.message}`,
                dados: null
            });
        }
    },
    async ocultarUsuarioEmpresa (request, response) {
        try {
            const {id} = request.params;
            //1. Verificar se o registro existe
            const sqlBusca = `
                SELECT usu_emp_id, usu_emp_status
                    FROM USUARIO_EMPRESAS
                WHERE usu_emp_id = ?;
                    `;

            const [rows] = await db.query(sqlBusca, [id]);

            if (rows.length === 0) {
                return response.status(404).json ({
                    sucesso: false,
                    mensagem: `Usuário da empresa não encontrado`,
                    dados: null
                });
            }

            //2. Verificar se já está oculto
            if (rows[0].usu_emp_status === 0) {
                return response.status(400).json ({
                    sucesso: false,
                    mensagem: `Usuário da empresa já inativo`,
                    dados: null
                });
            }
            
            //3. Ocultar
            const sqlOcultar = `
                UPDATE USUARIO_EMPRESAS
                SET usu_emp_status = 0
                WHERE usu_emp_id = ?;
            `;
            const [result] = await db.query(sqlOcultar,[id]);

            if (result.affectedRows === 0) {
                    return response.status(404).json ({
                        sucesso: false,
                        mensagem: `Não foi possível ocultar o usuário da empresa`,
                        dados: null
                    });
            }
            return response.status(200),json ({
                sucesso: true,
                mensagem: `Usuário da empresa oculto com sucesso`,
                dados: null
            });

        } catch (error) {
            return response.status(500).json ({
                sucesso: false,
                mensagem: `Erro ao ocultar usuário da empresa`,
                dados: error.message
            });
        }
    }
}