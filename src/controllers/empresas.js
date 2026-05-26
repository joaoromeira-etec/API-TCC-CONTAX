const db = require('../dataBase/connection');

module.exports = {
    async listarEmpresas(request, response) {
    try {
        const {
            id,
            nome,
            razao,
            cnpj,
            municipio,
            tipo,
            status,
            page = 1,
            limit = 5
        } = request.query;

        const idMin = request.query.idMin ? parseInt(request.query.idMin) : undefined;
        const idMax = request.query.idMax ? parseInt(request.query.idMax) : undefined;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [[{ id_min, id_max }]] = await db.query(`
            SELECT MIN(emp_id) AS id_min, MAX(emp_id) AS id_max FROM EMPRESAS
        `);

        const idMinLimite = idMin ?? id_min ?? 0;
        const idMaxLimite = idMax ?? id_max ?? 999999;

        const emp_nome = nome ? `%${nome}%` : `%`;
        const emp_razao = razao ? `%${razao}%` : `%`;
        const emp_municipio = municipio ? `%${municipio}%` : `%`;

        const statusFiltro = status !== undefined ? parseInt(status) : 1;

        let sql = `
            SELECT
                emp_id,
                emp_nome_fantasia,
                emp_razao_social,
                emp_cnpj,
                emp_endereco,
                emp_municipio,
                emp_telefone,
                emp_email,
                CAST(emp_tipo AS UNSIGNED) AS emp_tipo
            FROM EMPRESAS
            WHERE 1=1
            AND emp_nome_fantasia LIKE ?
            AND emp_razao_social LIKE ?
            AND emp_municipio LIKE ?
            AND emp_status = ?
            ${cnpj ? 'AND emp_cnpj = ?' : ''}
            ${tipo ? 'AND emp_tipo = ?' : ''}
            ${id ? 'AND emp_id = ?' : 'AND emp_id BETWEEN ? AND ?'}
            LIMIT ?, ?
        `;

        const values = [
            emp_nome,
            emp_razao,
            emp_municipio,
            statusFiltro,
            ...(cnpj ? [cnpj] : []),
            ...(tipo ? [tipo] : []),
            ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite]),
            offset,
            parseInt(limit)
        ];

        const [rows] = await db.query(sql, values);

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM EMPRESAS
            WHERE 1=1
            AND emp_nome_fantasia LIKE ?
            AND emp_razao_social LIKE ?
            AND emp_municipio LIKE ?
            AND emp_status = ?
            ${cnpj ? 'AND emp_cnpj = ?' : ''}
            ${tipo ? 'AND emp_tipo = ?' : ''}
            ${id ? 'AND emp_id = ?' : 'AND emp_id BETWEEN ? AND ?'}
        `;

        const countValues = [
            emp_nome,
            emp_razao,
            emp_municipio,
            statusFiltro,
            ...(cnpj ? [cnpj] : []),
            ...(tipo ? [tipo] : []),
            ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite])
        ];

        const [[{ total }]] = await db.query(countQuery, countValues);

        response.setHeader('X-Total-Count', total);

        return response.status(200).json({
            sucesso: true,
            mensagem: 'Lista de empresas',
            nItens: rows.length,
            dados: rows
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: `Erro ao listar empresas: ${error.message}`,
            dados: null
        });
    }
    },
    async loginEmpresas (request, response) {
    try {

        const { email, senha } = request.query;

        const sql = ` 
            SELECT 
                emp_id, emp_razao_social, emp_cnpj, emp_tipo
            FROM 
                EMPRESAS
            WHERE 
                emp_email = ? AND emp_senha_hash = ? AND emp_status = 1;
        `;

        const values = [email, senha];

        const [rows] = await db.query(sql, values);
        const nItens = rows.length;

        if (nItens < 1) {
            return response.status(403).json({
                sucesso: false,
                mensagem: 'Login e/ou senha inválida',
                dados: null,
            });
        }

        const dados = rows.map(empresas => ({
            id: empresas.emp_id,
            razao_social: empresas.emp_razao_social,
            cnpj: empresas.emp_cnpj,
            tipo: empresas.emp_tipo
        }))

        return response.status(200).json({
            sucesso: true,
            mensagem: 'Login efetuado com sucesso',
            dados
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro na requisição',
            dados: error.message
        });
    }
    },
    async cadastrarEmpresas (request, response) {
        try {

            const {nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, senha} = request.body;
            
            if (!nome || !cnpj || !enredeco || !municipio || ! telefone || !email || !tipo || !senha) {
                return response.status(400).json ({
                    sucesso: false,
                    mensagem: 'Campos obrigatóios estão ausentes ou inválidos.',
                });
            }

            const sqlEmpresa = `SELECT emp_id FROM empresa WHERE emp_id =?`;
            const [tipoResult] = await db.query(sqlEmpresa,[tipo]);

            if (tipoResult.length === 0) {
                return response.status(404).json ({
                    sucesso: false,
                    mensagem: 'Empresa não encontrada',
                    dados: null
                });
            }

            const documento = imagemDocumento ? 1 : 0;
            const img_doc = imagemDocumento ? imagemDocumento : null;
            const emp_status = 1;
    
            const sql = `
            INSERT INTO EMPRESAS
                (emp_nome_fantasia, emp_razao_social, emp_cnpj,
                emp_endereco, emp_municipio, emp_telefone,
                emp_email, emp_tipo, emp_status, emp_senha_hash)
            VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;
            const values = [nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, emp_status, senha];
            
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
                tipo,
                senha
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
    async cadastrarEmpresaEnderecos(requesr, response) {
        try {
            const {emp_id, emp_endereco, emp_municipio, principal} = request.body;
            const end_excluido = false;
            let end_principal = principal;

            const sqlChecarEndereco = `SELECT COUNT(*) 
                AS total_enderecos FROM emp_endereco
                WHERE emp_id = ? AND end_excluid = false`;
            const [resultCheck] = await db.query(sqlChecarEndereco, [usu_id]);
            const totalEnderecos = resultCheck[0].total_enderecos;

            if (totalEnderecos === 0) {
                end_principal = true;
            } else {
                if (end_principal) {
                    const sqlUpdateEnd = `UPDATE emp_endereco SET end_principal = 0 WHERE emp_id = ?`;
                    await db.query(sqlUpdateEnd, [emp_id]);
                }
            }
            const sql = `
                INSERT INTO emp_endereco
                    (emp_id, emp_endereco, emp_municipio, end_principal, end_excluido)
                VALUES (?, ?, ?, ?, ?);
            `;

            const values = [emp_id, emp_endereco, emp_municipio, end_principal, end_excluido];
            const [result] = await db.query(sql, values);
            const end_id = result.insertId;

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Endereço cadastrado com sucesso',
                dados: { id: end_id }
            });
        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao cadastrar endereço.',
                dados: error.message
            });
        }
    },
    async editarEmpresas (request, response) {
        try {
            // Parâmetros recebidos pelo corpo da requisição
            const {nome, razao_social, cnpj, endereco, municipio,
            telefone, email, tipo, status, senha} = request.body;

            //Parâmetro recebido pela URL via params ex: /usuario/1
            const {id} = request.params;

            //instruções SQL
            const sql = `
                UPDATE EMPRESAS SET 
                    emp_nome_fantasia = ?, emp_razao_social = ?, emp_cnpj = ?, emp_endereco = ?, emp_municipio = ?, 
                    emp_telefone = ?, emp_email = ?, emp_tipo = ?, emp_status = ?, emp_senha_hash = ?
                WHERE emp_id = ?;
                `;
                //Preparo do array com dados que serão atualizados
                const values = [nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, status, senha, id];
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
            if (rows[0].emp_status === 0) {
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
                mensagem: `Empresa ${id} excluída com sucesso`,
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