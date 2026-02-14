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
                emp_nome_fantasia = ?, emp_razao_social = ?,
                emp_endereco = ?, emp_municipio = ?, emp_telefone = ?,
                emp_email = ?, emp_tipo = ?, emp_status = ?
                WHERE
                    emp_id = ?;
                `;
                //Preparo do array com dados que serão atualizados
                const values = [nome, razao_social, endereco, municipio, telefone, email, tipo, status, id];
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
                    tipo,
                    status
                };
            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: `Empresa ${id} atualizada com sucesso`,
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
    async apagarEmpresas (request, response) {
        try {
            //prâmetro passado via url na chamada da api pelo front-end
            const {id} = request.params;
            //comando de exclusão
            const sql = `DELETE FROM empresas WHERE usu_id = ?`;
            //array com parâmetros na exclusão
            const values = [id];
            //executa instrução no banco de dados
            const [result] = await db.query(sql,values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Empresa ${id} não encontrado`,
                    dados: null
                });
            }
            return response.status(200).json (
                {
                    sucesso: true,
                    mensagem: `Empresa ${id} excluído com sucesso`,
                    dados: null
                }
            );
        } catch (error) {
            return response.status (500).json (
                {
                    sucesso: false,
                    mensagem: `Erro ao excluir empresa`,
                    dados: error.message
                }
            );
        }
    },
    async ocultarEmpresas (request, response) {
        try {

            const status = false;
            const {id} = request.params;
            const sql = `
                UPDATE empresas SET
                    emp_status = ?
                WHERE
                    emp_id = ?;
            `;

            const values = [status, id];
            const [result] = await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json ({
                    sucesao: false,
                    mensagem: `Empresa ${id} não encontrado`,
                    dados: null
                });
            }

            return response.status(200).json ({
                sucesso: true,
                menagm: `Empresa ${id} excluída com sucesso`,
                dados: null
            });
        } catch(error) {
            return response.status(500).json ({
                sucesso: false,
                mensagem: 'Erro na exclusão',
                dados: error.message
            });
        }
    }
}