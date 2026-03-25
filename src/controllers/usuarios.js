const db = require('../dataBase/connection');

module.exports = {
    async listarUsuarios (request, response) {
        try {

            const {
                id, nome, email,
                status, page = 1, limit = 5,
            } = request.query;

            const idMin = request.query.idMin ? parseInt(request.query.idMin) : undefined;
            const idMax = request.query.idMax ? parseInt(request.query.idMax) : undefined;

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const [[{ id_min, id_max }]] = await db.query(`
                SELECT MIN(usu_id) as id_min, MAX(usu_id) AS id_max FROM USUARIOS
            `);

            const idMinLimite = idMin ?? id_min ?? 0;
            const idMaxLimite = idMax ?? id_max ?? 0;

            const usu_nome = nome ? `%${nome}%` : `%`;
            const usu_email = email ? `%${email}%` : `%`;
            
            const sql = `
            SELECT
                usu_id, usu_nome, usu_email, usu_cpf, usu_telefone, 
                CAST(usu_status AS UNSIGNED) AS usu_status, 
                CAST(usu_alterar_senha AS UNSIGNED) AS usu_alterar_senha
            FROM USUARIOS
            WHERE 1=1
            AND usu_nome LIKE ?
            AND usu_email LIKE ?
            ${status !== undefined ? 'AND usu_status = ?' : ''}
            ${id ? 'AND usu_id = ?' : 'AND usu_id BETWEEN ? AND ?'}
            LIMIT ?, ?
            `;

            const values = [
                usu_nome,
                usu_email,
                ...(status !== undefined ? [parseInt(status)] : []),
                ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite]),
                offset,
                parseInt(limit)
            ]

            const [rows] = await db.query(sql, values);

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM USUARIOS
                WHERE 1=1
                AND usu_nome LIKE ?
                AND usu_email LIKE ?
                ${status !== undefined ? 'AND usu_status = ?' : ''}
                ${id ? 'AND usu_id = ?' : 'AND usu_id BETWEEN ? AND ?'}
            `;

            const countValues = [
                usu_nome,
                usu_email,
                ...(status !== undefined ? [parseInt(status)] : []),
                ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite])
            ];            


            const [[{ total }]] = await db.query(countQuery, countValues);

            response.setHeader('X-Total-Count', total);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Lista de usuários',
                nItens: rows.length,
                dados: rows
            });

        }   catch (error) {
                return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao listar usuários: ${error.message}`,
                dados: null
            });
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
                    telefone
                };
            return response.status(200).json ({
                    sucesso: true,
                    mensagem: `Usuário ${id} atualizado com sucesso`,
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
            return response.status (500).json ({
                sucesso: false,
                mensagem: `Erro ao excluir usuário`,
                dados: error.message
                });
        }
    },
    async ocultarUsuarios (request, response) {
        try {
            const {id} = request.params;
            //1. Verificar se o registro existe
            const sqlBusca = `
                SELECT usu_id, usu_status
                    FROM USUARIOS
                WHERE usu_id = ?;
                    `;

            const [rows] = await db.query(sqlBusca, [id]);

            if (rows.length === 0) {
                return response.status(404).json ({
                    sucesso: false,
                    mensagem: `Usuário não encontrado`,
                    dados: null
                });
            }

            //2. Verificar se já está oculto
            if (rows[0].usu_emp_status === 0) {
                return response.status(400).json ({
                    sucesso: false,
                    mensagem: `Usuário já inativo`,
                    dados: null
                });
            }
            
            //3. Ocultar
            const sqlOcultar = `
                UPDATE USUARIOS
                SET usu_status = 0
                WHERE usu_id = ?;
            `;
            const [result] = await db.query(sqlOcultar,[id]);

            if (result.affectedRows === 0) {
                    return response.status(404).json ({
                        sucesso: false,
                        mensagem: `Não foi possível ocultar usuário`,
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
    async loginUsuarios (request, response) {
        try {
            const {email, senha} = request.query;

            const sql = `
                SELECT 
                    usu_id, usu_nome, usu_status 
                FROM 
                    USUARIOS
                WHERE 
                    usu_email = ? AND usu_senha_hash = ? AND usu_status = 1;
            `;
        
            const values = [email, senha];

            const [rows] = await db.query(sql, values);
            const nItens = rows.length;

        if (nItens < 1) {
            return response.status(403).json ({
                sucesso: false,
                mensagem: 'Login e/ou senha inválida',
                dados: null,
            });
        }

        const dados = rows.map(usuarios => ({
            id: usuarios.usu_id,
            nome: usuarios.usu_nome,
            status: usuarios.usu_status
        }))

        return response.status(200).json ({
            sucesso: true,
            mensagem: 'Login efetuado com sucesso',
            dados
        });
        } catch (error) {
            return response.status(500).json ({
                sucesso: false,
                mensagem: 'Erro na requisição',
                dados: error.message
            });
        }
    },
}