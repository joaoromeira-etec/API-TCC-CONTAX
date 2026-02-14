const db = require('../dataBase/connection');

module.exports = {
    async listarUsuarioEmpresa (request, response) {
        try {

            const sql = 
            `SELECT
                usu_emp_id, emp_id, usu_id, usu_emp_nivel_acesso,
                usu_emp_data_vinculo, usu_emp_status, usu_emp_observacoes
            FROM USUARIO_EMPRESAS;
            `;

            const [usuario_empresas] = await db.query (sql);

            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: 'Lista de usuários por empresa obtida com sucesso',
                    itens: usuario_empresas.length,
                    dados: usuario_empresas
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro ao listar usuários por empresas: ${error.message}`,
                    dados: null
                }
            );
        }
    },
    async cadastrarUsuarioEmpresa (request, response) {
        try {

            const {usu_emp_id, emp_id, usu_id, nivel_acesso, data_vinculo, observacoes} = request.body;
            const usu_emp_status = 1;

            const sql = `
            INSERT INTO USUARIO_EMPRESAS
                (usu_emp_id, emp_id, usu_id, usu_emp_nivel_acesso, usu_emp_data_vinculo,
                usu_emp_status, usu_emp_observacoes)
            VALUES
                (?, ?, ?, ?, ?, ?, ?);
                `;
            
            const values = [usu_emp_id, emp_id, usu_id, nivel_acesso, data_vinculo, usu_emp_status, observacoes];

            const[result] = await db.query(sql, values);
            
            const dados = {
                usu_emp_id: result.insertId,
                emp_id,
                usu_id,
                nivel_acesso,
                data_vinculo,
                observacoes
            };
        
            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: 'Cadastro de usuário à empresa obtida com sucesso',
                    dados: dados
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro ao cadastrar usuário à empresa.`,
                    dados: error.message
                }
            );
        }
    },
    async editarUsuarioEmpresa (request, response) {
        try {
            // Parâmetros recebidos pelo corpo da requisição
            const { nivel_acesso, data_vinculo, usu_emp_status, observacoes, emp_id, usu_id } = request.body;
            //Parâmetro recebido pela URL via params ex: /usuario/1
            const {id} = request.params;
            //instruções SQL
            const sql = `
                UPDATE usuario_empresas SET 
                usu_emp_nivel_acesso = ?,
                usu_emp_data_vinculo = ?, usu_emp_status = ?,
                usu_emp_observacoes = ? 
                WHERE
                    usu_emp_id = ?;
                `;
                //Preparo do array com dados que serão atualizados
                const values = [nivel_acesso, data_vinculo, usu_emp_status, observacoes, id];
                //execução e obtenção de confirmação da atualização realizada
                const [result] = await db.query(sql, values);

                if (result.affectedRows === 0) {
                    return response.status(404).json ({
                        sucesso: false,
                        mensagem: `Empresa ${id} não encontrada`,
                        dados: null
                    });
                }
                const dados = {
                usu_emp_id: id,
                emp_id,
                usu_id,
                nivel_acesso,
                data_vinculo,
                status: usu_emp_status,
                observacoes
                };
            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: `Usuário da empresa ${id} atualizada com sucesso`,
                    dados
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro na requisição`,
                    dados: error.message
                }
            );
        }
    },
    async apagarUsuarioEmpresa (request, response) {
        try {
            //parâmetro passado via url na chamada da api pelo front-end
            const{id} = request.params;
            //comando de exclusão
            const sql = `DELETE FROM usu_emp WHERE usu_emp_id = ?`;
            //array com parâmetros da exclusão
            const values = [id];
            //executa instrução no banco de dados
            const [result] = await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    //resolver como colocar o id do usuario e id da empresa aqui
                    mensagem: `Usuário`,
                    dados: null
                })
            }
            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: 'Exclusão de usuário da empresa obtida com sucesso',
                    dados: null
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro ao excluir usuário da empresa: ${error.message}`,
                    dados: null
                }
            );
        }
    },
    async ocultarUsuarioEmpresa (request, response) {
        try {

            const status = false;
            const {id} = request.params;
            const sql = `
                UPDATE usu_emp SET
                    usu_emp_status = ?
                WHERE
                    usu_emp_id = ?;
                    `;

            const values = [status, id];
            const [result] = await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json ({
                    sucesso: false,
                    //desenvolver mensagem para citar usuário ligado a empresa
                    mensagem: ``,
                    dados: null
                });
            }

            return response.status(200),json ({
                sucesso: true,
                //desenvolver mensagem
                mensagem: ``
            });
        } catch (error) {
            return response.status(500).json ({
                sucesso: false,
                mensagem: `desenvolver`,
                dados: error.message
            })
        }
    }
}