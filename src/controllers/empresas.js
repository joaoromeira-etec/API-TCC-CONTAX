const db = require('../dataBase/connection');

module.exports = {
    async listarEmpresas (request, response) {
        try {

            const sql = 
            ` SELECT
                emp_id, emp_nome_fantasia, emp_razao_social, emp_cnpj,
                emp_endereco, emp_municipio, emp_telefone, emp_email, emp_tipo
            FROM EMPRESAS;
            `;

            const [empresas] =  await db.query(sql);

            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: 'Lista de empresas obtida com sucesso',
                    itens: empresas.length,
                    dados: empresas
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro ao listar empresas: ${error.message}`,
                    dados: null
                }
            );
        }
    },
    async listarEmps (request, response) {
        try {
            const sql = `
            SELECT DISTINCT emp_nome_fantasia
            FROM EMPRESAS
            ORDER BY emp_nome_fantasia ASC;
            `;

        const [rows] = await db.query(sql);

        return response.status(200).json ({
            sucesso: true,
            mensagem: 'Lista de empresas',
            dados: rows
        });
        } catch (error) {
            return response.status(500).json ({
                sucesso: false,
                mensagem: 'Erro na requisição',
                dados: error.message
            });
        }
    },
    async cadastrarEmpresas (request, response) {
        try {

            const {nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo} = request.body;
            const emp_status = 1;
    
            const sql = `
            INSERT INTO empresas
                (emp_nome_fantasia, emp_razao_social, emp_cnpj,
                emp_endereco, emp_municipio, emp_telefone, emp_email, emp_tipo, emp_status)
            VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, ?);
                `;
            const values = [nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, emp_status];
            
            const [result] = await db.query(sql, values);

            const dados = {
                id: result.insertId,
                nome,
                razao_social,
                cnpj,
                endereco,
                municipio,
                telefone,
                email,
                tipo
            };

            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: 'Cadastro de empresa obtida com sucesso',
                    dados: dados
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro ao cadastrar empresa.`,
                    dados: error.message
                }
            );
        }
    },
    async editarEmpresas (request, response) {
        try {
            // Parâmetros recebidos pelo corpo da requisição
            const {nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, status} = request.body;
            //Parâmetro recebido pela URL via params ex: /usuario/1
            const {id} = request.params;
            //instruções SQL
            const sql = `
                UPDATE empresas SET 
                emp_nome_fantasia = ?, emp_razao_social = ?, emp_cnpj = ?,
                emp_endereco = ?, emp_municipio = ?, emp_telefone = ?,
                emp_email = ?, emp_tipo = ?, emp_status = ?
                WHERE
                    emp_id = ?;
                `;
                //Preparo do array com dados que serão atualizados
                const values = [nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, status, id];
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
                    id,
                    nome,
                    razao_social,
                    cnpj,
                    endereco,
                    municipio,
                    telefone,
                    email,
                    tipo
                };

            return response.status(200).json ({
                sucesso: true,
                mensagem: `Empresa ${id} atualizada com sucesso`,
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
    async apagarEmpresas (request, response) {
        try {
            //prâmetro passado via url na chamada da api pelo front-end
            const {id} = request.params;
            //comando de exclusão
            const sql = `DELETE FROM empresas WHERE emp_id = ?`;
            //array com parâmetros na exclusão
            const values = [id];
            //executa instrução no banco de dados
            const [result] = await db.query(sql,values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Empresa ${id} não encontrada`,
                    dados: null
                });
            }

            return response.status(200).json ({
                sucesso: true,
                mensagem: `Empresa ${id} excluída com sucesso`,
                dados: null
            });

        } catch (error) {
            return response.status (500).json ({
                sucesso: false,
                mensagem: `Erro ao excluir empresa`,
                dados: error.message
            });
        }
    },
    async ocultarEmpresas (request, response) {
        try {
            const {id} = request.params;
            //1. Verificar se o registro existe
            const sqlBusca = `
                SELECT emp_id, emp_status
                    FROM EMPRESAS
                WHERE emp_id = ?;
                    `;

            const [rows] = await db.query(sqlBusca, [id]);

            if (rows.length === 0) {
                return response.status(404).json ({
                    sucesso: false,
                    mensagem: `Empresa não encontrada`,
                    dados: null
                });
            }

            //2. Verificar se já está oculto
            if (rows[0].usu_emp_status === 0) {
                return response.status(400).json ({
                    sucesso: false,
                    mensagem: `Empresa já inativa`,
                    dados: null
                });
            }
            
            //3. Ocultar
            const sqlOcultar = `
                UPDATE EMPRESAS
                SET emp_status = 0
                WHERE emp_id = ?;
            `;
            const [result] = await db.query(sqlOcultar,[id]);

            if (result.affectedRows === 0) {
                    return response.status(404).json ({
                        sucesso: false,
                        mensagem: `Não foi possível ocultar Empresa`,
                        dados: null
                    });
            }

            return response.status(200).json ({
                sucesso: true,
                menagm: `Empresa ${id} excluída com sucesso`,
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