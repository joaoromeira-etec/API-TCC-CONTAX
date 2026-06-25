const db = require('../dataBase/connection');
const { gerarURL } = require('../../uploads/gerarURL');
const pathMod = require('path'); // Alterado o nome para evitar conflito de escopo com o 'path' do arquivo
const fse = require('fs-extra');
const fs = require('fs');

module.exports = {
    async listarDocumentos(request, response) {
        try {
            console.log(request.empresa);
            console.log(request.nivelAcesso);
            console.log(request.user);

            const empresaId = request.query.emp_id
                ? parseInt(request.query.emp_id)
                : null;

            const {
                id,
                nome,
                tpd_id,
                categoria,
                status,
                page = 1,
                limit = 5
            } = request.query;

            const idMin = request.query.idMin
                ? parseInt(request.query.idMin)
                : undefined;

            const idMax = request.query.idMax
                ? parseInt(request.query.idMax)
                : undefined;

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const [[{ id_min, id_max }]] = await db.query(`
                SELECT
                    MIN(doc_id) AS id_min,
                    MAX(doc_id) AS id_max
                FROM DOCUMENTOS
            `);

            const idMinLimite = idMin ?? id_min ?? 0;
            const idMaxLimite = idMax ?? id_max ?? 999999;

            const nomeFiltro = nome ? `%${nome}%` : `%`;
            const statusFiltro = status !== undefined && status !== '' ? parseInt(status) : 1;

            // Ajustado para garantir que a montagem da string SQL coincida exatamente com as validações de valores
            let sqlWhere = `
                WHERE 1=1
                AND (? IS NULL OR d.emp_id = ?)
                AND d.doc_status = ?
                AND d.doc_nome_original LIKE ?
            `;

            const values = [
                empresaId,
                empresaId,
                statusFiltro,
                nomeFiltro
            ];

            if (id) {
                sqlWhere += ' AND d.doc_id = ?';
                values.push(parseInt(id));
            } else {
                sqlWhere += ' AND d.doc_id BETWEEN ? AND ?';
                values.push(idMinLimite, idMaxLimite);
            }

            if (tpd_id !== undefined && tpd_id !== '') {
                sqlWhere += ' AND d.tpd_id = ?';
                values.push(parseInt(tpd_id));
            }

            if (categoria) {
                sqlWhere += ' AND f.fin_categoria = ?';
                values.push(categoria);
            }

            const sql = `
                SELECT
                    d.doc_id,
                    d.emp_id,
                    e.emp_nome_fantasia,
                    e.emp_cnpj,
                    d.tpd_id,
                    t.tpd_descricao,
                    d.doc_caminho_arquivo,
                    d.doc_nome_original,
                    d.doc_data_upload,
                    CAST(d.doc_status AS UNSIGNED) AS doc_status,
                    f.fin_id,
                    f.fin_valor_total,
                    f.fin_categoria,
                    f.fin_data_emissao
                FROM DOCUMENTOS d
                LEFT JOIN EMPRESAS e
                    ON e.emp_id = d.emp_id
                LEFT JOIN TIPO_DOCUMENTOS t
                    ON t.tpd_id = d.tpd_id
                LEFT JOIN FINANCEIRO f
                    ON f.doc_id = d.doc_id
                ${sqlWhere}
                ORDER BY d.doc_id DESC
                LIMIT ?, ?
            `;

            // Clona o array de valores base para adicionar os parâmetros de paginação no final da listagem
            const listValues = [...values, offset, parseInt(limit)];

            const [rows] = await db.query(sql, listValues);
            const nItens = rows.length;

            const dados = rows.map((documento) => ({
                ...documento,
                doc_url: gerarURL(
                    documento.doc_caminho_arquivo,
                    'documentos',
                    'sem.jpg'
                )
            }));

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM DOCUMENTOS d
                LEFT JOIN FINANCEIRO f
                    ON f.doc_id = d.doc_id
                ${sqlWhere}
            `;

            const [[{ total }]] = await db.query(countQuery, values);

            response.setHeader('X-Total-Count', total);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Lista de documentos.',
                nItens,
                dados
            });

        } catch (error) {
            
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao listar documentos.',
                dados: error.message
            });
        }
    },

async cadastrarDocumentos(request, response) {
    try {
        // 1. Captura o usuário (Admin) logado injetado pelo middleware auth.js
        const usuarioId = request.user?.id || request.usuario?.id || null;

        // 2. Verifica se o Multer recebeu o arquivo físico da Nota Fiscal
        if (!request.file) {
            return response.status(400).json({
                sucesso: false,
                mensagem: 'Nenhum arquivo enviado. Certifique-se de preencher o campo "img".',
                dados: null
            });
        }

        // Renomeado para 'arquivoPath' para evitar conflito com o pacote global 'path'
        const { path: arquivoPath, originalname } = request.file;

        // 3. Captura os dados textuais do formulário (vinda do request.body)
        const { tpd_id, emp_id, doc_observacao, doc_data_vencimento } = request.body;

        // 4. Validações estritas da Empresa Cliente Destino
        if (!emp_id) {
            return response.status(400).json({ sucesso: false, mensagem: 'ID da empresa cliente destino é obrigatório.', dados: null });
        }
        if (isNaN(emp_id)) {
            return response.status(400).json({ sucesso: false, mensagem: 'ID da empresa deve ser um valor numérico.', dados: null });
        }

        // 5. Validações do Tipo de Documento
        if (!tpd_id) {
            return response.status(400).json({ sucesso: false, mensagem: 'Tipo do documento é obrigatório.', dados: null });
        }
        if (isNaN(tpd_id)) {
            return response.status(400).json({ sucesso: false, mensagem: 'Tipo do documento deve ser um valor numérico.', dados: null });
        }

        // 6. Verifica se o tipo de documento informado existe e está ativo no banco
        const sqlTipo = `
            SELECT tpd_id
            FROM TIPO_DOCUMENTOS
            WHERE tpd_id = ?
            AND tpd_status = 1
        `;
        const [tipoResult] = await db.query(sqlTipo, [tpd_id]);

        if (tipoResult.length === 0) {
            return response.status(404).json({
                sucesso: false,
                mensagem: 'Tipo de documento não encontrado ou inativo no sistema.',
                dados: null
            });
        }

        // 7. Query que cria o registro e vincula diretamente à empresa cliente (emp_id)
        const sql = `
            INSERT INTO DOCUMENTOS (
                emp_id, 
                tpd_id, 
                doc_caminho_arquivo, 
                doc_nome_original, 
                doc_observacao, 
                doc_data_vencimento, 
                doc_status
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `;

        const values = [
            parseInt(emp_id),
            parseInt(tpd_id),
            arquivoPath,
            originalname,
            doc_observacao || null,
            doc_data_vencimento || null
        ];

        const [result] = await db.query(sql, values);

        // 8. Monta o objeto com os dados exatos salvos para retornar à aplicação
        const dados = {
            doc_id: result.insertId, // ID da Nota recém-gerada (Chave para a extração do financeiro)
            emp_id: parseInt(emp_id),
            tpd_id: parseInt(tpd_id),
            doc_caminho_arquivo: arquivoPath,
            doc_nome_original: originalname,
            doc_observacao: doc_observacao || null,
            doc_data_vencimento: doc_data_vencimento || null,
            doc_status: 1
        };

        return response.status(201).json({
            sucesso: true,
            mensagem: 'Documento lançado e vinculado à empresa com sucesso.',
            dados
        });

    } catch (error) {
        console.log("ERRO DOCUMENTOS: ", error);
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno ao cadastrar o documento no servidor.',
            dados: error.message
        });
    }
},
    async editarDocumentos(request, response) {
        try {
            const { id } = request.params;

            const {
                emp_id,
                tpd_id,
                status
            } = request.body;

            if (!id || isNaN(id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do documento inválido.',
                    dados: null
                });
            }

            if (
                !emp_id ||
                !tpd_id ||
                status === undefined
            ) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Campos obrigatórios incompletos ou inválidos.',
                    dados: null
                });
            }

            if (
                isNaN(emp_id) ||
                isNaN(tpd_id) ||
                isNaN(status)
            ) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Usuário, empresa, tipo do documento e status devem ser numéricos.',
                    dados: null
                });
            }

            const sqlBusca = `
                SELECT doc_id
                FROM DOCUMENTOS
                WHERE doc_id = ?
            `;

            const [documentoResult] = await db.query(sqlBusca, [id]);

            if (documentoResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Documento não encontrado.',
                    dados: null
                });
            }

            const sqlEmpresa = `
                SELECT emp_id
                FROM EMPRESAS
                WHERE emp_id = ?
                AND emp_status = 1
            `;

            const [empresaResult] = await db.query(sqlEmpresa, [emp_id]);

            if (empresaResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Empresa não encontrada ou inativa.',
                    dados: null
                });
            }

            const sqlTipo = `
                SELECT tpd_id
                FROM TIPO_DOCUMENTOS
                WHERE tpd_id = ?
                AND tpd_status = 1
            `;

            const [tipoResult] = await db.query(sqlTipo, [tpd_id]);

            if (tipoResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Tipo de documento não encontrado ou inativo.',
                    dados: null
                });
            }

            let sql = `
                UPDATE DOCUMENTOS
                SET
                    emp_id = ?,
                    tpd_id = ?,
                    doc_status = ?
            `;

            const values = [
                parseInt(emp_id),
                parseInt(tpd_id),
                parseInt(status)
            ];

            if (request.file) {
                sql += `,
                    doc_caminho_arquivo = ?,
                    doc_nome_original = ?
                `;

                values.push(
                    request.file.path,
                    request.file.originalname
                );
            }

            sql += `
                WHERE doc_id = ?
            `;

            values.push(id);

            const [result] = await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Documento não encontrado para atualização.',
                    dados: null
                });
            }

            const dados = {
                doc_id: parseInt(id),
                emp_id: parseInt(emp_id),
                tpd_id: parseInt(tpd_id),
                doc_status: parseInt(status),
                arquivo_atualizado: request.file ? true : false
            };

            if (request.file) {
                dados.doc_caminho_arquivo = request.file.path;
                dados.doc_nome_original = request.file.originalname;
            }

            return response.status(200).json({
                sucesso: true,
                mensagem: `Documento ${id} atualizado com sucesso.`,
                dados
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao editar documento.',
                dados: error.message
            });
        }
    },

    async downloadDocumento(request, response) {
        try {
            const { id } = request.params;

            if (!id || isNaN(id)) {
                return response.status(400).json({ sucesso: false, message: 'ID inválido.', dados: null });
            }

            const sql = `
                SELECT doc_caminho_arquivo, doc_nome_original
                FROM DOCUMENTOS
                WHERE doc_id = ?
            `;

            const [rows] = await db.query(sql, [id]);

            if (rows.length === 0) {
                return response.status(404).json({ sucesso: false, mensagem: 'Documento não encontrado.', dados: null });
            }

            const { doc_caminho_arquivo, doc_nome_original } = rows[0];

            // Utilizando 'pathMod' para evitar conflito com escopos locais
            const arquivoPath = pathMod.isAbsolute(doc_caminho_arquivo)
                ? doc_caminho_arquivo
                : pathMod.join(process.cwd(), doc_caminho_arquivo);

            if (!fse.existsSync(arquivoPath)) {
                return response.status(404).json({ sucesso: false, mensagem: 'Arquivo físico não encontrado.', dados: null });
            }

            return response.download(arquivoPath, doc_nome_original);

        } catch (error) {
            return response.status(500).json({ sucesso: false, mensagem: 'Erro ao baixar documento.', dados: error.message });
        }
    },

    async previewDocumento(request, response) {
        try {
            const { id } = request.params;

            if (!id || isNaN(id)) {
                return response.status(400).json({ sucesso: false, mensagem: 'ID inválido.', dados: null });
            }

            const sql = `
                SELECT doc_caminho_arquivo, doc_nome_original
                FROM DOCUMENTOS
                WHERE doc_id = ?
            `;

            const [rows] = await db.query(sql, [id]);

            if (rows.length === 0) {
                return response.status(404).json({ sucesso: false, mensagem: 'Documento não encontrado.', dados: null });
            }

            const { doc_caminho_arquivo, doc_nome_original } = rows[0];

            // Utilizando 'pathMod' para evitar conflito com escopos locais
            const arquivoPath = pathMod.isAbsolute(doc_caminho_arquivo)
                ? doc_caminho_arquivo
                : pathMod.join(process.cwd(), doc_caminho_arquivo);

            if (!fse.existsSync(arquivoPath)) {
                return response.status(404).json({ sucesso: false, mensagem: 'Arquivo físico não encontrado.', dados: null });
            }

            const stat = fs.statSync(arquivoPath);
            const fileSize = stat.size;
            const range = request.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

                if (start >= fileSize) {
                    return response.status(416).set('Content-Range', `bytes */${fileSize}`).send('Requested range not satisfiable');
                }

                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(arquivoPath, { start, end });
                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'application/pdf'
                };

                response.writeHead(206, head);
                file.pipe(response);
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="${doc_nome_original}"`
                };
                response.writeHead(200, head);
                fs.createReadStream(arquivoPath).pipe(response);
            }

        } catch (error) {
            return response.status(500).json({ sucesso: false, mensagem: 'Erro ao pré-visualizar documento.', dados: error.message });
        }
    },

    async apagarDocumentos(request, response) {
        try {
            const { id } = request.params;

            if (!id || isNaN(id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do documento inválido.',
                    dados: null
                });
            }

            const sqlBusca = `
                SELECT doc_id
                FROM DOCUMENTOS
                WHERE doc_id = ?
            `;

            const [documentoResult] = await db.query(sqlBusca, [id]);

            if (documentoResult.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Documento não encontrado.',
                    dados: null
                });
            }

            const sql = `
                DELETE FROM DOCUMENTOS
                WHERE doc_id = ?
            `;

            await db.query(sql, [id]);

            return response.status(200).json({
                sucesso: true,
                mensagem: `Documento ${id} excluído permanentemente com sucesso.`,
                dados: null
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao excluir documento.',
                dados: error.message
            });
        }
    },

    async ocultarDocumentos(request, response) {
        try {
            const { id } = request.params;

            if (!id || isNaN(id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do documento inválido.',
                    dados: null
                });
            }

            const sqlBusca = `
                SELECT
                    doc_id,
                    CAST(doc_status AS UNSIGNED) AS doc_status
                FROM DOCUMENTOS
                WHERE doc_id = ?
            `;

            const [rows] = await db.query(sqlBusca, [id]);

            if (rows.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Documento não encontrado.',
                    dados: null
                });
            }

            if (Number(rows[0].doc_status) === 0) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Documento já está oculto.',
                    dados: null
                });
            }

            const sqlOcultar = `
                UPDATE DOCUMENTOS
                SET doc_status = 0
                WHERE doc_id = ?
            `;

            await db.query(sqlOcultar, [id]);

            return response.status(200).json({
                sucesso: true,
                mensagem: `Documento ${id} ocultado com sucesso.`,
                dados: null
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao ocultar documento.',
                dados: error.message
            });
        }
    },
};