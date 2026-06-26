const db = require('../dataBase/connection');

module.exports = {
    async cadastrarNota(request, response) {
        console.log("Body:", request.body);
        console.log("File:", request.file);
        try {
        // 1. Validações Iniciais do Arquivo
        if (!request.file) {
            return response.status(400).json({ sucesso: false, mensagem: 'O arquivo PDF da nota é obrigatório.' });
        }
        const { path: arquivoPath, originalname } = request.file;

        // 2. Captura os dados combinados (Documento + Financeiro) vindos do formulário do MenuAdm
        const { 
            emp_id,          // Empresa cliente destino
            tpd_id,          // Tipo de documento (Nota Fiscal, Recibo, etc.)
            usu_id,          
            fin_valor,       // <--- DADO FINANCEIRO: Valor da nota
            fin_categoria    // <--- DADO FINANCEIRO: Categoria (Imposto, Serviço, etc.)
        } = request.body;

        

        // Validação básica dos IDs cruciais
        if (!emp_id || !tpd_id || !fin_valor || !usu_id) {
            return response.status(400).json({ sucesso: false, mensagem: 'Empresa, Tipo de documento, Valor e Usuário são obrigatórios.' });
        }

        // ==========================================================
        // PASSO 1: Inserir na tabela DOCUMENTOS (A tua parte)
        // ==========================================================
        const sqlDoc = `
            INSERT INTO DOCUMENTOS (usu_id, emp_id, tpd_id, doc_caminho_arquivo, doc_nome_original, doc_status)
            VALUES (?, ?, ?, ?, ?, 1)
        `;
        const [docResult] = await db.query(sqlDoc, [
            parseInt(emp_id), 
            parseInt(tpd_id), 
            parseInt(usu_id),
            arquivoPath, 
            originalname,  
        ]);

        const novoDocId = docResult.insertId; // ID do documento gerado

        // ==========================================================
        // PASSO 2: Inserir na tabela FINANCEIRO (A parte da Naiara)
        // ==========================================================
        // Criamos o registro financeiro já atrelado ao documento que acabou de nascer
        const sqlFin = `
            INSERT INTO FINANCEIRO (
                doc_id,
                fin_valor_total,
                fin_categoria,
                fin_data_emissao,
                fin_status
            )
            VALUES (?, ?, ?, ?, 1)
        `;

        await db.query(sqlFin, [
            novoDocId,
            parseFloat(fin_valor),
            fin_categoria || 'Faturamento',
            new Date()
        ]);

        // 3. Retorno de sucesso absoluto para o Frontend
        return response.status(201).json({
            sucesso: true,
            mensagem: 'Nota lançada com sucesso! Documento salvo e financeiro gerado.',
            dados: {
                doc_id: novoDocId,
                emp_id: parseInt(emp_id),
                valor_lançado: parseFloat(fin_valor)
            }
        });

    } catch (error) {
        return response.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao processar o lançamento combinado da nota.',
            dados: error.message
        });
    }
  },
}
