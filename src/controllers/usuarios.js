const db = require('../dataBase/connection');

module.exports = {
    async listarUsuarios (request, response) {
        try {
            
            const sql = `
            SELECT
                usu_id, usu_nome, usu_email, usu_cpf, usu_senha_hash,
                usu_telefone, usu_status, usu_alterar_senha
            FROM USUARIOS;
                `;

            const [usuarios] = await db.query(sql);

            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: 'Lista de usuários obtida com sucesso',
                    itens: usuarios.length,
                    dados: usuarios
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro ao listar usuários: ${error.message}`,
                    dados: null
                }
            );
        }
    },
    async cadastrarUsuarios (request, response) {
        try {
            const {nome, email, cpf, senha, telefone, alterar_senha} = request.body;
            const usu_status = 1;

            const sql = `
            INSERT INTO USUARIOS (usu_nome, usu_email, usu_cpf,
                                  usu_senha_hash, usu_telefone,
                                  usu_status, usu_alterar_senha)
            VALUES 
                (?, ?, ?, ?, ?, ?, ?);
                `;
            
            const values = [nome, email, cpf, senha, telefone,usu_status, alterar_senha];
           
            const [result] = await db.query(sql, values);

            const dados = {
                id: result.insertId,
                nome,
                email,
                cpf,
                senha,
                telefone,
                alterar_senha
            };

            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: 'Cadastro de usuário obtida com sucesso',
                    dados: dados
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro ao cadastrar usuário:`,
                    dados: error.message
                }
            );
        }
    },
    async editarUsuarios (request, response) {
        try {
            // Parâmetros recebidos pelo corpo da requisição
            const {nome, email, cpf, senha, telefone, status} = request.body;
            //Parâmetro recebido pela URL via params ex: /usuario/1
            const {id} = request.params;
            //instruções SQL
            const sql = `
                UPDATE usuarios SET
                    usu_nome = ?, usu_email = ?, usu_cpf = ?,
                    usu_senha_hash = ?, usu_telefone = ?, usu_status = ?
                WHERE
                    usu_id = ?;
                `;
                //Preparo do array com dados que serão atualizados
                const values = [nome, email, cpf, senha, telefone, status, id];
                //execução e obtenção de confirmação da atualização realizada
                const [result] = await db.query(sql, values);

                if (result.affectedRows === 0) {
                    return response.status(404).json ({
                        sucesso: false,
                        mensagem: `Usuário ${id} não encontrado`,
                        dados: null
                    });
                }
                const dados = {
                    id,
                    nome,
                    email,
                    cpf,
                    senha,
                    telefone,
                    status
                };
            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: `Usuário ${id} atualizado com sucesso`,
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
    async apagarUsuarios (request, response) {
        try {
            //Parâmetro passado via url na chamada da api pelo front-end
            const {id} = request.params;
            //comando de exclusão
            const sql = `DELETE FROM usuarios WHERE usu_id = ?`;
            //array com parâmetros da exclusão
            const values = [id];
            //executa instrução no banco de dados
            const [result] = await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json ({
                    sucesso: false,
                    mensagem: `Usuário ${id} excluído com sucesso`,
                    dados: null
                })
            }
            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: `Usuário ${id} excluído com sucesso`,
                    dados: null
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro ao excluir usuário`,
                    dados: error.message
                }
            );
        }
    },
    async ocultarUsuarios (request, response) {
        try {

            const ativo = false;
            const {id} = request.params;
            const sql = `
                UPDATE usuarios SET
                    usu_status = ?
                WHERE
                    usu_id = ?;
            `;

            const values = [usu_status, id];
            const [result] = await db.query(sql, values);

            if (result.affectedRows  === 0) {
                return response.status(404).json ({
                    sucesso: false,
                    mensagem: `Usuário ${id} não encontrado`,
                    dados: null
                });
            }
            
            return response.status(200).json ({
                sucesso: true,
                mensagem: `Usuário ${id} excluído com sucesso`,
                dados: null
            });

        } catch (error) {
            return response.status(500).json ({
                sucesso: false,
                mensagem: 'Erro na exclusão',
                dados: error.message
            });
        }
    },
}