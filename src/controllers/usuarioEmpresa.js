const db = require('../dataBase/connection');

/*
--------------------------------------------------------------------------
    Controller: UsuarioEmpresa

    Tabela:
    - USUARIO_EMPRESAS

    Responsável por gerenciar os vínculos entre usuários e empresas.

    Funcionalidades:
    - Listar vínculos
    - Cadastrar vínculos
    - Editar vínculos
    - Ocultar vínculos
    - Excluir vínculos

    Regras:
    - Um usuário pode estar vinculado a várias empresas.
    - Uma empresa pode possuir vários usuários.
    - Empresa e usuário devem existir antes do vínculo.
    - Não permite vínculos ativos duplicados.
    - O vínculo pode ser ativo ou inativo.
    - Cada vínculo possui um nível de acesso:
        0 - Visualizador
        1 - Gerente
        2 - Administrador
--------------------------------------------------------------------------
*/

module.exports = {
    async listarUsuarioEmpresa(request, response) {
        try {
            const {
                id,
                emp_id,
                usu_id,
                nivel,
                page = 1,
                limit = 5
            } = request.query;

            const idMin = request.query.idMin ? parseInt(request.query.idMin) : undefined;
            const idMax = request.query.idMax ? parseInt(request.query.idMax) : undefined;

            const pagina = parseInt(page);
            const limite = parseInt(limit);
            const offset = (pagina - 1) * limite;

            const [[{ id_min, id_max }]] = await db.query(`
                SELECT 
                    MIN(usu_emp_id) AS id_min, 
                    MAX(usu_emp_id) AS id_max 
                FROM USUARIO_EMPRESAS
            `);

            const idMinLimite = idMin ?? id_min ?? 0;
            const idMaxLimite = idMax ?? id_max ?? 999999;

            const { ano, mes, dia } = request.query;

            let filtroData = '';
            let valoresData = [];

            if (ano) {
                filtroData += ' AND YEAR(ue.usu_emp_data_vinculo) = ?';
                valoresData.push(parseInt(ano));
            }

            if (mes) {
                filtroData += ' AND MONTH(ue.usu_emp_data_vinculo) = ?';
                valoresData.push(parseInt(mes));
            }

            if (dia) {
                filtroData += ' AND DAY(ue.usu_emp_data_vinculo) = ?';
                valoresData.push(parseInt(dia));
            }

            const sql = `
                SELECT
                    ue.usu_emp_id,
                    ue.emp_id,
                    e.emp_nome_fantasia,
                    ue.usu_id,
                    u.usu_nome,
                    ue.usu_emp_nivel_acesso,
                    ue.usu_emp_data_vinculo,
                    ue.usu_emp_observacoes
                FROM USUARIO_EMPRESAS ue
                INNER JOIN EMPRESAS e
                    ON e.emp_id = ue.emp_id
                INNER JOIN USUARIOS u
                    ON u.usu_id = ue.usu_id
                WHERE ue.usu_emp_status = 1
                ${emp_id ? 'AND ue.emp_id = ?' : ''}
                ${usu_id ? 'AND ue.usu_id = ?' : ''}
                ${nivel ? 'AND ue.usu_emp_nivel_acesso = ?' : ''}
                ${filtroData}
                ${id ? 'AND ue.usu_emp_id = ?' : 'AND ue.usu_emp_id BETWEEN ? AND ?'}
                LIMIT ?, ?
            `;

            const values = [
                ...(emp_id ? [parseInt(emp_id)] : []),
                ...(usu_id ? [parseInt(usu_id)] : []),
                ...(nivel ? [parseInt(nivel)] : []),
                ...valoresData,
                ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite]),
                offset,
                limite
            ];

            const [rows] = await db.query(sql, values);

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM USUARIO_EMPRESAS ue
                WHERE ue.usu_emp_status = 1
                ${emp_id ? 'AND ue.emp_id = ?' : ''}
                ${usu_id ? 'AND ue.usu_id = ?' : ''}
                ${nivel ? 'AND ue.usu_emp_nivel_acesso = ?' : ''}
                ${filtroData}
                ${id ? 'AND ue.usu_emp_id = ?' : 'AND ue.usu_emp_id BETWEEN ? AND ?'}
            `;

            const countValues = [
                ...(emp_id ? [parseInt(emp_id)] : []),
                ...(usu_id ? [parseInt(usu_id)] : []),
                ...(nivel ? [parseInt(nivel)] : []),
                ...valoresData,
                ...(id ? [parseInt(id)] : [idMinLimite, idMaxLimite])
            ];

            const [[{ total }]] = await db.query(countQuery, countValues);

            response.setHeader('X-Total-Count', total);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Lista de usuários vinculados às empresas.',
                nItens: rows.length,
                dados: rows
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao listar usuários vinculados às empresas: ${error.message}`,
                dados: null
            });
        }
    },

    async cadastrarUsuarioEmpresa(request, response) {
        try {
            const {
                emp_id,
                usu_id,
                nivel_acesso,
                data_vinculo,
                observacoes
            } = request.body;

            const usu_emp_status = 1;

            // 1. Validação de campos obrigatórios.
            if (
                emp_id === undefined ||
                usu_id === undefined ||
                nivel_acesso === undefined ||
                !data_vinculo
            ) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Campos obrigatórios incompletos ou inválidos.',
                    dados: null
                });
            }

            // 2. Validação de tipos numéricos.
            if (isNaN(emp_id) || isNaN(usu_id) || isNaN(nivel_acesso)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID da empresa, ID do usuário e nível de acesso devem ser numéricos.',
                    dados: null
                });
            }

            const sqlEmpresa = `
                SELECT emp_id
                FROM EMPRESAS
                WHERE emp_id = ?
            `;

            const [empresaResult] = await db.query(sqlEmpresa, [emp_id]);

            // 3. Validação de existência da empresa.
            if (empresaResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Empresa não encontrada.',
                    dados: null
                });
            }

            const sqlUsuario = `
                SELECT usu_id
                FROM USUARIOS
                WHERE usu_id = ?
            `;

            const [usuarioResult] = await db.query(sqlUsuario, [usu_id]);

            // 4. Validação de existência do usuário
            if (usuarioResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Usuário não encontrado.',
                    dados: null
                });
            }

            const sqlVerificar = `
                SELECT usu_emp_id
                FROM USUARIO_EMPRESAS
                WHERE emp_id = ?
                AND usu_id = ?
                AND usu_emp_status = 1
            `;

            const [verificarResult] = await db.query(sqlVerificar, [emp_id, usu_id]);

            // 5. Validação de vínculo duplicado
            if (verificarResult.length > 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Este usuário já está vinculado a esta empresa.',
                    dados: null
                });
            }

            const sql = `
                INSERT INTO USUARIO_EMPRESAS
                    (
                        emp_id,
                        usu_id,
                        usu_emp_nivel_acesso,
                        usu_emp_data_vinculo,
                        usu_emp_status,
                        usu_emp_observacoes
                    )
                VALUES
                    (?, ?, ?, ?, ?, ?)
            `;

            const values = [
                emp_id,
                usu_id,
                nivel_acesso,
                data_vinculo,
                usu_emp_status,
                observacoes ?? null
            ];

            const [result] = await db.query(sql, values);

            const dados = {
                id: result.insertId,
                emp_id,
                usu_id,
                nivel_acesso,
                data_vinculo,
                status: usu_emp_status,
                observacoes: observacoes ?? null
            };

            return response.status(201).json({
                sucesso: true,
                mensagem: 'Usuário vinculado à empresa com sucesso.',
                dados
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao cadastrar vínculo entre usuário e empresa.',
                dados: error.message
            });
        }
    },

    async editarUsuarioEmpresa(request, response) {
        try {
            const {
                emp_id,
                usu_id,
                nivel_acesso,
                data_vinculo,
                status,
                observacoes
            } = request.body;

            const { id } = request.params;

            if (!id) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do vínculo não informado.',
                    dados: null
                });
            }

            const sql = `
                UPDATE USUARIO_EMPRESAS
                SET 
                    emp_id = ?,
                    usu_id = ?,
                    usu_emp_nivel_acesso = ?,
                    usu_emp_data_vinculo = ?,
                    usu_emp_status = ?,
                    usu_emp_observacoes = ?
                WHERE usu_emp_id = ?
            `;

            const values = [
                emp_id,
                usu_id,
                nivel_acesso,
                data_vinculo,
                status,
                observacoes ?? null,
                id
            ];

            const [result] = await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Vínculo entre usuário e empresa não encontrado.',
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
                observacoes: observacoes ?? null
            };

            return response.status(200).json({
                sucesso: true,
                mensagem: `Vínculo ${id} atualizado com sucesso.`,
                dados
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao editar vínculo entre usuário e empresa.',
                dados: error.message
            });
        }
    },

    async apagarUsuarioEmpresa(request, response) {
        try {
            const { id } = request.params;

            const sql = `
                UPDATE USUARIO_EMPRESAS
                SET usu_emp_status = 0
                WHERE usu_emp_id = ?
            `;

            const [result] = await db.query(sql, [id]);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Vínculo entre usuário e empresa não encontrado.',
                    dados: null
                });
            }

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Vínculo entre usuário e empresa desativado com sucesso.',
                dados: null
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: `Erro ao desativar vínculo entre usuário e empresa: ${error.message}`,
                dados: null
            });
        }
    },

    async ocultarUsuarioEmpresa(request, response) {
        try {
            const { id } = request.params;

            const sqlBusca = `
                SELECT usu_emp_id, usu_emp_status
                FROM USUARIO_EMPRESAS
                WHERE usu_emp_id = ?
            `;

            const [rows] = await db.query(sqlBusca, [id]);

            if (rows.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Vínculo entre usuário e empresa não encontrado.',
                    dados: null
                });
            }

            if (rows[0].usu_emp_status === 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Vínculo entre usuário e empresa já está inativo.',
                    dados: null
                });
            }

            const sqlOcultar = `
                UPDATE USUARIO_EMPRESAS
                SET usu_emp_status = 0
                WHERE usu_emp_id = ?
            `;

            const [result] = await db.query(sqlOcultar, [id]);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Não foi possível ocultar o vínculo entre usuário e empresa.',
                    dados: null
                });
            }

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Vínculo entre usuário e empresa ocultado com sucesso.',
                dados: null
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao ocultar vínculo entre usuário e empresa.',
                dados: error.message
            });
        }
    }
};