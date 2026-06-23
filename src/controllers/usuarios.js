const db = require('../dataBase/connection');

/*
--------------------------------------------------------------------------
    Controller: Usuarios

    Responsável pelo gerenciamento dos usuários do sistema CONTAX.

    Tabela principal:
    - USUARIOS

    Funcionalidades:
    - Listar usuários
    - Realizar login
    - Cadastrar usuários
    - Editar usuários
    - Ocultar usuários
    - Excluir usuários
    - Consultar empresas vinculadas ao usuário

    Regras:
    - Email e CPF devem ser únicos.
    - Usuários podem estar vinculados a uma ou mais empresas.
    - Usuários podem ser ativos ou inativos.
    - O sistema pode exigir alteração de senha no primeiro acesso.
    - Apenas usuários ativos podem realizar login.
--------------------------------------------------------------------------
*/

module.exports = {
    async listarUsuarios(request, response) {
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
                u.usu_id,
                u.usu_nome,
                u.usu_email,
                u.usu_cpf,
                u.usu_telefone,

                CAST(u.usu_status AS UNSIGNED) AS usu_status,
                CAST(u.usu_alterar_senha AS UNSIGNED) AS usu_alterar_senha,

                e.emp_id,
                e.emp_nome_fantasia AS empresa_nome,

                CAST(ue.usu_emp_nivel_acesso AS UNSIGNED) AS nivel_acesso,
                CAST(ue.usu_emp_status AS UNSIGNED) AS vinculo_status

            FROM USUARIOS u

            LEFT JOIN USUARIO_EMPRESAS ue
                ON ue.usu_id = u.usu_id
                AND ue.usu_emp_status = 1

            LEFT JOIN EMPRESAS e
                ON e.emp_id = ue.emp_id

            WHERE 1=1
            AND u.usu_nome LIKE ?
            AND u.usu_email LIKE ?
            ${status !== undefined ? 'AND u.usu_status = ?' : ''}
            ${id ? 'AND u.usu_id = ?' : 'AND u.usu_id BETWEEN ? AND ?'}

            LIMIT ?, ?
        `;

        const values = [
            usu_nome,
            usu_email,
            ...(status !== undefined ? [parseInt(status)] : []),
            ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite]),
            offset,
            parseInt(limit)
        ];

        const [rows] = await db.query(sql, values);

        const countQuery = `
            SELECT COUNT(DISTINCT u.usu_id) AS total
            FROM USUARIOS u

            LEFT JOIN USUARIO_EMPRESAS ue
                ON ue.usu_id = u.usu_id
                AND ue.usu_emp_status = 1

            LEFT JOIN EMPRESAS e
                ON e.emp_id = ue.emp_id

            WHERE 1=1
            AND u.usu_nome LIKE ?
            AND u.usu_email LIKE ?
            ${status !== undefined ? 'AND u.usu_status = ?' : ''}
            ${id ? 'AND u.usu_id = ?' : 'AND u.usu_id BETWEEN ? AND ?'}
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

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: `Erro ao listar usuários: ${error.message}`,
            dados: null
        });
    }
    },
    async loginUsuarios (request, response) {
        try {
            const {email, senha} = request.query;

            // Busca o usuário
            const sqlUsuario = `
                SELECT 
                    usu_id, usu_nome, usu_status 
                FROM 
                    USUARIOS
                WHERE 
                    usu_email = ? AND usu_senha_hash = ? AND usu_status = 1;
            `;
        
            const values = [email, senha];

            const [usuarioRows] = await db.query(sqlUsuario, values);

            if (usuarioRows.length === 0) {
                return response.status(403).json ({
                    sucesso: false,
                    mensagem: 'Login e/ou senha inválida',
                    dados: null,
                });
            }

            const usuarioId = usuarioRows[0].usu_id;

            // Busca as empresas vinculadas ao usuário
            const sqlEmpresas = `
                SELECT
                    e.emp_id,
                    e.emp_nome_fantasia,
                    e.emp_tipo,
                    e.emp_status,
                    ue.usu_emp_nivel_acesso,
                    ue.usu_emp_data_vinculo
                FROM USUARIO_EMPRESAS ue
                INNER JOIN EMPRESAS e ON e.emp_id = ue.emp_id
                WHERE ue.usu_id = ? AND ue.usu_emp_status = 1 AND e.emp_status = 1
                ORDER BY e.emp_nome_fantasia
            `;

            const [empresasRows] = await db.query(sqlEmpresas, [usuarioId]);

            if (empresasRows.length === 0) {
                return response.status(403).json ({
                    sucesso: false,
                    mensagem: 'Usuário não possui empresas vinculadas',
                    dados: null,
                });
            }

            // Mapeia as empresas com informações completas
            const empresas = empresasRows.map(emp => ({
                emp_id: emp.emp_id,
                nome: emp.emp_nome_fantasia,
                tipo: emp.emp_tipo === 0 ? 'ME' : 'MEI',
                tipoNumerico: emp.emp_tipo,
                nivel_acesso: emp.usu_emp_nivel_acesso,
                nivel_descricao: emp.usu_emp_nivel_acesso === 0 
                    ? 'Visualizador' 
                    : emp.usu_emp_nivel_acesso === 1 
                    ? 'Gerente' 
                    : 'Administrador',
                data_vinculo: emp.usu_emp_data_vinculo
            }));

            const dados = {
                usuario: {
                    id: usuarioRows[0].usu_id,
                    nome: usuarioRows[0].usu_nome,
                    status: usuarioRows[0].usu_status
                },
                empresas: empresas,
                empresa_padrao: empresas[0] // Define a primeira empresa como padrão
            };

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
    async listarEmpresasDoUsuario (request, response) {
    try {
        const { id } = request.params;

        const sql = `
            SELECT
                u.usu_id,
                u.usu_nome,
                e.emp_id,
                e.emp_nome_fantasia,
                ue.usu_emp_nivel_acesso,
                ue.usu_emp_data_vinculo
            FROM USUARIO_EMPRESAS ue
            INNER JOIN USUARIOS u ON u.usu_id = ue.usu_id
            INNER JOIN EMPRESAS e ON e.emp_id = ue.emp_id
            WHERE ue.usu_emp_status = 1
            AND u.usu_id = ?;
        `;

        const [rows] = await db.query(sql, [id]);

        if (rows.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado ou sem empresa cadastrada.',
                dados: null
            });
        }

        const usuario = {
            id: rows[0].usu_id,
            nome: rows[0].usu_nome,
            empresas: rows.map(row => ({
                emp_id: row.emp_id,
                nome: row.emp_nome_fantasia,
                nivel: row.usu_emp_nivel_acesso,
                data_vinculo: row.usu_emp_data_vinculo
            }))
        };

        return response.status(200).json({
            sucesso: true,
            mensagem: 'Empresas do usuário',
            dados: usuario
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: `Erro: ${error.message}`,
            dados: null
        });
    }
    },       
    async cadastrarUsuarios(request, response) {
    try {
        const {
            nome,
            email,
            cpf,
            senha,
            telefone,
            alterar_senha,
            emp_id,
            nivel_acesso,
            data_vinculo,
            observacoes
        } = request.body;

        const usu_status = 1;
        const usu_emp_status = 1;

        // 1. Validação de campos obrigatórios
        if (
            !nome ||
            !email ||
            !cpf ||
            !senha ||
            !telefone ||
            emp_id === undefined ||
            nivel_acesso === undefined ||
            !data_vinculo
        ) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Campos obrigatórios incompletos ou inválidos.',
                dados: null
            });
        }

        // 2. Validação de dados numéricos
        if (isNaN(emp_id) || isNaN(nivel_acesso)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'ID da empresa e nível de acesso devem ser numéricos.',
                dados: null
            });
        }

        // 3. Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Email inválido.',
                dados: null
            });
        }

        // 4. Validação de CPF
        const cpfLimpo = cpf.replace(/\D/g, '');
        const cpfRegex = /^\d{11}$/;

        if (!cpfRegex.test(cpfLimpo)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'CPF inválido. Informe 11 números.',
                dados: null
            });
        }

        // 5. Validação de telefone
        const telefoneLimpo = telefone.replace(/\D/g, '');

        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Telefone inválido.',
                dados: null
            });
        }

        // 6. Validação de data de vínculo
        const dataRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (!dataRegex.test(data_vinculo)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Data de vínculo deve estar no formato YYYY-MM-DD.',
                dados: null
            });
        }

        // Consulta empresa
        const sqlEmpresa = `
            SELECT emp_id
            FROM EMPRESAS
            WHERE emp_id = ?
        `;

        const [empresaResult] = await db.query(sqlEmpresa, [emp_id]);

        // 7. Validação de existência da empresa
        if (empresaResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Empresa não encontrada.',
                dados: null
            });
        }

        // Consulta email existente
        const sqlEmail = `
            SELECT usu_id
            FROM USUARIOS
            WHERE usu_email = ?
        `;

        const [emailExistente] = await db.query(sqlEmail, [email]);

        // 8. Validação de email duplicado
        if (emailExistente.length > 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Email já cadastrado.',
                dados: null
            });
        }

        // Consulta CPF existente
        const sqlCpf = `
            SELECT usu_id
            FROM USUARIOS
            WHERE usu_cpf = ?
        `;

        const [cpfExistente] = await db.query(sqlCpf, [cpfLimpo]);

        // 9. Validação de CPF duplicado
        if (cpfExistente.length > 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'CPF já cadastrado.',
                dados: null
            });
        }

        // Cadastro do usuário
        const sqlUsuario = `
            INSERT INTO USUARIOS
                (
                    usu_nome,
                    usu_email,
                    usu_cpf,
                    usu_senha_hash,
                    usu_telefone,
                    usu_status,
                    usu_alterar_senha
                )
            VALUES
                (?, ?, ?, ?, ?, ?, ?)
        `;

        const valuesUsuario = [
            nome,
            email,
            cpfLimpo,
            senha,
            telefoneLimpo,
            usu_status,
            alterar_senha ?? 0
        ];

        const [resultUsuario] = await db.query(sqlUsuario, valuesUsuario);

        // Cadastro do vínculo usuário x empresa
        const sqlVinculo = `
            INSERT INTO USUARIO_EMPRESAS
                (
                    usu_id,
                    emp_id,
                    usu_emp_nivel_acesso,
                    usu_emp_data_vinculo,
                    usu_emp_status,
                    usu_emp_observacoes
                )
            VALUES
                (?, ?, ?, ?, ?, ?)
        `;

        const valuesVinculo = [
            resultUsuario.insertId,
            emp_id,
            nivel_acesso,
            data_vinculo,
            usu_emp_status,
            observacoes ?? null
        ];

        await db.query(sqlVinculo, valuesVinculo);

        const dados = {
            id: resultUsuario.insertId,
            nome,
            email,
            cpf: cpfLimpo,
            telefone: telefoneLimpo,
            status: usu_status,
            alterar_senha: alterar_senha ?? 0,
            empresa: {
                emp_id,
                nivel_acesso,
                data_vinculo,
                observacoes: observacoes ?? null
            }
        };

        return response.status(201).json({
            sucesso: true,
            mensagem: 'Usuário cadastrado e vinculado à empresa com sucesso.',
            dados
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar usuário.',
            dados: error.message
        });
    }
},
    async editarUsuarios(request, response) {
    try {
        const { nome, email, cpf, senha, telefone, status, alterar_senha } = request.body;

        const { id } = request.params;

        // 1. Validação de ID
        if (!id || isNaN(id)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'ID do usuário inválido.',
                dados: null
            });
        }

        // 2. Validação de campos obrigatórios
        if (
            !nome ||
            !email ||
            !cpf ||
            !senha ||
            !telefone ||
            status === undefined ||
            alterar_senha === undefined
        ) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Campos obrigatórios incompletos ou inválidos.',
                dados: null
            });
        }

        // 3. Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Email inválido.',
                dados: null
            });
        }

        // 4. Validação de CPF
        const cpfLimpo = cpf.replace(/\D/g, '');
        const cpfRegex = /^\d{11}$/;

        if (!cpfRegex.test(cpfLimpo)) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'CPF inválido. Informe 11 números.',
                dados: null
            });
        }

        // 5. Validação de telefone
        const telefoneLimpo = telefone.replace(/\D/g, '');

        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Telefone inválido.',
                dados: null
            });
        }

        // Consulta usuário
        const sqlUsuario = `
            SELECT usu_id
            FROM USUARIOS
            WHERE usu_id = ?
        `;

        const [usuarioResult] = await db.query(sqlUsuario, [id]);

        // 6. Validação de existência do usuário
        if (usuarioResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado.',
                dados: null
            });
        }

        // Consulta email existente em outro usuário
        const sqlEmail = `
            SELECT usu_id
            FROM USUARIOS
            WHERE usu_email = ?
            AND usu_id <> ?
        `;

        const [emailExistente] = await db.query(sqlEmail, [email, id]);

        // 7. Validação de email duplicado
        if (emailExistente.length > 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Email já cadastrado para outro usuário.',
                dados: null
            });
        }

        // Consulta CPF existente em outro usuário
        const sqlCpf = `
            SELECT usu_id
            FROM USUARIOS
            WHERE usu_cpf = ?
            AND usu_id <> ?
        `;

        const [cpfExistente] = await db.query(sqlCpf, [cpfLimpo, id]);

        // 8. Validação de CPF duplicado
        if (cpfExistente.length > 0) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'CPF já cadastrado para outro usuário.',
                dados: null
            });
        }

        // Atualização do usuário
        const sql = `
            UPDATE USUARIOS
            SET
                usu_nome = ?,
                usu_email = ?,
                usu_cpf = ?,
                usu_senha_hash = ?,
                usu_telefone = ?,
                usu_status = ?,
                usu_alterar_senha = ?
            WHERE usu_id = ?
        `;

        const values = [
            nome,
            email,
            cpfLimpo,
            senha,
            telefoneLimpo,
            status,
            alterar_senha,
            id
        ];

        const [result] = await db.query(sql, values);

        if (result.affectedRows === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado.',
                dados: null
            });
        }

        const dados = {
            id,
            nome,
            email,
            cpf: cpfLimpo,
            telefone: telefoneLimpo,
            status,
            alterar_senha
        };

        return response.status(200).json({
            sucesso: true,
            mensagem: `Usuário ${id} atualizado com sucesso.`,
            dados
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao editar usuário.',
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
            if (rows[0].usu_status === 0) {
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
}