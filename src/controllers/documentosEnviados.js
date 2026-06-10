const db = require('../dataBase/connection');

/*
--------------------------------------------------------------------------
    Controller: DocumentosEnviados

    Tabelas:
    - DOCUMENTOS_ENVIADOS
    - FINANCEIRO
    - TIPO_DOCUMENTOS

    Responsável por registrar documentos enviados e criar o lançamento
    financeiro relacionado ao documento.

    Regras:
    - O documento precisa possuir arquivo enviado.
    - O tipo de documento deve existir.
    - O financeiro deve usar uma categoria válida:
      Faturamento, Imposto ou Despesa.
--------------------------------------------------------------------------
*/

module.exports = {
    async processarDocumentosEnviados(request, response) {
        try {
            const {
                tpd_id,
                valor,
                categoria,
                data_emissao
            } = request.body;

            // 1. Validação de arquivo
            if (!request.file) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Arquivo não enviado.',
                    dados: null
                });
            }

            const { path, originalname } = request.file;

            // 2. Validação de campos obrigatórios
            if (!tpd_id || !valor || !categoria) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Tipo do documento, valor e categoria são obrigatórios.',
                    dados: null
                });
            }

            // 3. Validação de tipo numérico
            if (isNaN(tpd_id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Tipo do documento deve ser numérico.',
                    dados: null
                });
            }

            // 4. Validação de categoria
            const categoriasPermitidas = [
                'Faturamento',
                'Imposto',
                'Despesa'
            ];

            if (!categoriasPermitidas.includes(categoria)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Categoria inválida. Use Faturamento, Imposto ou Despesa.',
                    dados: null
                });
            }

            // 5. Validação de existência do tipo
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

            const valorFormatado = String(valor).replace(',', '.');

            if (isNaN(valorFormatado)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Valor financeiro inválido.',
                    dados: null
                });
            }

            const sqlDocumento = `
                INSERT INTO DOCUMENTOS_ENVIADOS
                    (
                        doc_caminho_arquivo,
                        doc_nome_original,
                        tpd_id
                    )
                VALUES
                    (?, ?, ?)
            `;

            const [doc] = await db.query(sqlDocumento, [
                path,
                originalname,
                tpd_id
            ]);

            const sqlFinanceiro = `
                INSERT INTO FINANCEIRO
                    (
                        doc_id,
                        fin_valor_total,
                        fin_categoria,
                        fin_data_emissao
                    )
                VALUES
                    (?, ?, ?, ?)
            `;

            await db.query(sqlFinanceiro, [
                doc.insertId,
                Number(valorFormatado),
                categoria,
                data_emissao || new Date()
            ]);

            return response.status(201).json({
                sucesso: true,
                mensagem: 'Documento processado com sucesso.',
                dados: {
                    doc_id: doc.insertId,
                    nome_original: originalname,
                    caminho_arquivo: path,
                    tpd_id: Number(tpd_id),
                    valor: Number(valorFormatado),
                    categoria,
                    data_emissao: data_emissao || new Date()
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao processar documento enviado.',
                dados: error.message
            });
        }
    }
};