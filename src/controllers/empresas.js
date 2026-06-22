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
                SELECT 
                    MIN(emp_id) AS id_min, 
                    MAX(emp_id) AS id_max 
                FROM EMPRESAS
            `);

            const idMinLimite = idMin ?? id_min ?? 0;
            const idMaxLimite = idMax ?? id_max ?? 999999;

            const emp_nome = nome ? `%${nome}%` : `%`;
            const emp_razao = razao ? `%${razao}%` : `%`;
            const emp_municipio = municipio ? `%${municipio}%` : `%`;

            // Permite filtrar por status 0, 1 ou 2. Se não enviado, assume 1 (Ativas) por padrão.
            const statusFiltro = status !== undefined ? parseInt(status) : 1;

            const sql = `
                SELECT
                    emp_id,
                    emp_nome_fantasia,
                    emp_razao_social,
                    emp_cnpj,
                    emp_endereco,
                    emp_municipio,
                    emp_telefone,
                    emp_email,
                    CAST(emp_tipo AS UNSIGNED) AS emp_tipo,
                    CAST(emp_status AS UNSIGNED) AS emp_status
                FROM EMPRESAS
                WHERE 1=1
                AND emp_nome_fantasia LIKE ?
                AND emp_razao_social LIKE ?
                AND emp_municipio LIKE ?
                AND emp_status = ?
                ${cnpj ? 'AND emp_cnpj = ?' : ''}
                ${tipo !== undefined ? 'AND emp_tipo = ?' : ''}
                ${id ? 'AND emp_id = ?' : 'AND emp_id BETWEEN ? AND ?'}
                LIMIT ?, ?
            `;

            const values = [
                emp_nome,
                emp_razao,
                emp_municipio,
                statusFiltro,
                ...(cnpj ? [cnpj] : []),
                ...(tipo !== undefined ? [parseInt(tipo)] : []),
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
                ${tipo !== undefined ? 'AND emp_tipo = ?' : ''}
                ${id ? 'AND emp_id = ?' : 'AND emp_id BETWEEN ? AND ?'}
            `;

            const countValues = [
                emp_nome,
                emp_razao,
                emp_municipio,
                statusFiltro,
                ...(cnpj ? [cnpj] : []),
                ...(tipo !== undefined ? [parseInt(tipo)] : []),
                ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite])
            ];

            const [[{ total }]] = await db.query(countQuery, countValues);

            response.setHeader('X-Total-Count', total);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Lista de empresas.',
                nItens: rows.length,
                dados: rows
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao listar empresas.',
                dados: error.message
            });
        }
    },

    async loginEmpresas(request, response) {
        try {
            const { email, senha } = request.query;

            // Removemos o filtro rígido de 'emp_status = 1' do SQL para podermos capturar se ela está inativa ou inapta
            const sql = ` 
                SELECT 
                    emp_id, emp_razao_social, emp_cnpj, CAST(emp_tipo AS UNSIGNED) AS emp_tipo, CAST(emp_status AS UNSIGNED) AS emp_status
                FROM 
                    EMPRESAS
                WHERE 
                    emp_email = ? AND emp_senha_hash = ?;
            `;

            const [rows] = await db.query(sql, [email, senha]);

            if (rows.length < 1) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Login e/ou senha inválida',
                    dados: null,
                });
            }

            const empresa = rows[0];

            // RN: Validação do Status da Empresa no ato do Login
            if (empresa.emp_status === 0) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Acesso bloqueado: Esta empresa encontra-se INATIVA no sistema.',
                    dados: null
                });
            }

            if (empresa.emp_status === 2) {
                return response.status(403).json({
                    sucesso: false,
                    mensagem: 'Acesso suspenso: Esta empresa está classificada como INAPTA. Regularize suas omissões de declarações junto ao escritório.',
                    dados: null
                });
            }

            const dados = [{
                id: empresa.emp_id,
                razao_social: empresa.emp_razao_social,
                cnpj: empresa.emp_cnpj,
                tipo: empresa.emp_tipo
            }];

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

    async cadastrarEmpresas(request, response) {
        try {
            const { nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, senha } = request.body;

            if (!nome || !razao_social || !cnpj || !endereco || !municipio || !telefone || !email || tipo === undefined || !senha) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Campos obrigatórios estão ausentes ou inválidos.',
                });
            }

            // RN: Restrições de Validação Legal para MEI (tipo = 1)
            if (parseInt(tipo) === 1) {
                if (razao_social.toUpperCase().includes('LTDA')) {
                    return response.status(400).json({
                        sucesso: false,
                        mensagem: 'Regra de Negócio: Uma empresa inscrita como MEI não pode possuir a natureza jurídica LTDA.'
                    });
                }

                const regexCpfNoFinal = /\d{11}$/;
                if (!regexCpfNoFinal.test(razao_social.trim())) {
                    return response.status(400).json({
                        sucesso: false,
                        mensagem: 'Regra de Negócio: A Razão Social de um MEI deve obrigatoriamente terminar com o CPF do proprietário (11 dígitos).'
                    });
                }
            }

            const emp_status = 1; // Nova empresa inicia ativa por padrão

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
                tipo
            };

            return response.status(201).json({
                sucesso: true,
                mensagem: 'Empresa cadastrada com sucesso',
                dados: dados
            });
        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao cadastrar empresa.',
                dados: error.message
            });
        }
    },

    async cadastrarEmpresaEnderecos(request, response) {
        try {
            const { emp_id, emp_endereco, emp_municipio, principal } = request.body;
            const end_excluido = false;
            let end_principal = principal;

            const sqlChecarEndereco = `SELECT COUNT(*) AS total_enderecos FROM emp_endereco WHERE emp_id = ? AND end_excluido = false`;
            const [resultCheck] = await db.query(sqlChecarEndereco, [emp_id]);
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

    async editarEmpresas(request, response) {
        try {
            const { nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, status, senha } = request.body;
            const { id } = request.params;

            if (!nome || !razao_social || !cnpj || !endereco || !municipio || !telefone || !email || tipo === undefined || status === undefined || !senha) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Campos obrigatórios ausentes para a edição.'
                });
            }

            // RN: Aplica as mesmas restrições do MEI ao atualizar os dados
            if (parseInt(tipo) === 1) {
                if (razao_social.toUpperCase().includes('LTDA')) {
                    return response.status(400).json({
                        sucesso: false,
                        mensagem: 'Regra de Negócio: Uma empresa inscrita como MEI não pode possuir a natureza jurídica LTDA.'
                    });
                }

                const regexCpfNoFinal = /\d{11}$/;
                if (!regexCpfNoFinal.test(razao_social.trim())) {
                    return response.status(400).json({
                        sucesso: false,
                        mensagem: 'Regra de Negócio: A Razão Social de um MEI deve obrigatoriamente terminar com o CPF do proprietário (11 dígitos).'
                    });
                }
            }

            const sql = `
                UPDATE EMPRESAS SET 
                    emp_nome_fantasia = ?, emp_razao_social = ?, emp_cnpj = ?, emp_endereco = ?, emp_municipio = ?, 
                    emp_telefone = ?, emp_email = ?, emp_tipo = ?, emp_status = ?, emp_senha_hash = ?
                WHERE emp_id = ?;
            `;
            const values = [nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, status, senha, id];
            const [result] = await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Empresa ${id} não encontrada`,
                    dados: null
                });
            }

            const dados = { id, nome, razao_social, cnpj, endereco, municipio, telefone, email, tipo, status };

            return response.status(200).json({
                sucesso: true,
                mensagem: `Empresa ${id} atualizada com sucesso`,
                dados
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro na requisição`,
                dados: error.message
            });
        }
    },

    async apagarEmpresas(request, response) {
        try {
            const { id } = request.params;
            const sql = `DELETE FROM empresas WHERE emp_id = ?`;
            const [result] = await db.query(sql, [id]);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Empresa ${id} não encontrada`,
                    dados: null
                });
            }

            return response.status(200).json({
                sucesso: true,
                mensagem: `Empresa ${id} excluída com sucesso`,
                dados: null
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao excluir empresa`,
                dados: error.message
            });
        }
    },

    async ocultarEmpresas(request, response) {
        try {
            const { id } = request.params;
            
            const sqlBusca = `SELECT emp_id, CAST(emp_status AS UNSIGNED) AS emp_status FROM EMPRESAS WHERE emp_id = ?;`;
            const [rows] = await db.query(sqlBusca, [id]);

            if (rows.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Empresa não encontrada`,
                    dados: null
                });
            }

            if (rows[0].emp_status === 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: `Empresa já se encontra inativa`,
                    dados: null
                });
            }
            
            const sqlOcultar = `UPDATE EMPRESAS SET emp_status = 0 WHERE emp_id = ?;`;
            const [result] = await db.query(sqlOcultar, [id]);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Não foi possível ocultar Empresa`,
                    dados: null
                });
            }

            return response.status(200).json({
                sucesso: true,
                mensagem: `Empresa ${id} inativada com sucesso`,
                dados: null
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro na inativação',
                dados: error.message
            });
        }
    }
};