exports.processarDocumentosEnviados = (request, response) => {
    try {
        const {tpd_id} = request.body;
        const {path,originalname} = request.file;

        const [doc] = await db.query
            ("INSERT INTO documentos_enviados (doc_caminho_arquivo, doc_nome_arquivo, tpd_id) VALUES (?, ?, ?)",
            [path, originalname, tpd_id]);

        const valorExtraido = "1250,50"; // Simulação de valor extraído do documento
        const valorFormatado = valorExtraido.replace(",", ".").replace('.',''); 

        await db.query
            ("INSERT INTO financeiro (doc_id, fin_valor_total, fin_categoria) VALUES (?, ?, ?)", [doc.insertId, valorFormatado, "Categoria 1"]);
        [doc.insertId, valorFormatado, "Faturamento"];

        response.status(200).send("Documento processado com sucesso!");
        } catch (error) {
            response.status(500).send(error.message);
    }
};