const db = require('../dataBase/connection');

module.exports = {

async listarAuditoria(request, response) {
  try {

    const { page = 1, limit = 5 } = request.query;

    const pagina = parseInt(page);
    const limite = parseInt(limit);
    const offset = (pagina - 1) * limite;

    const [total] = await db.query(`
      SELECT COUNT(*) as total
      FROM AUDITORIA
    `);

    const totalRegistros = total[0].total;
    const totalPaginas = Math.ceil(totalRegistros / limite);

    const sql = `
      SELECT
        aud_id,
        usu_id,
        aud_acao,
        aud_tabela_afetada,
        aud_registro_afetado,
        aud_data_acao
      FROM AUDITORIA
      LIMIT ?, ?
    `;

    const [auditorias] = await db.query(sql, [offset, limite]);

    return response.status(200).json({
      sucesso: true,
      mensagem: "Lista de auditorias obtida com sucesso",
      paginacao: {
        pagina,
        limite,
        total_registros: totalRegistros,
        total_paginas: totalPaginas
      },
      itens: auditorias.length,
      dados: auditorias
    });

  } catch (error) {
    return response.status(500).json({
      sucesso: false,
      mensagem: `Erro ao obter lista de auditorias: ${error.message}`,
      dados: null
    });
  }
},

async cadastrarAuditoria(request, response) {
  try {

    const {
      usu_id,
      aud_acao,
      aud_tabela_afetada,
      aud_registro_afetado,
      aud_data_acao
    } = request.body;

    const sql = `
      INSERT INTO AUDITORIA
      (usu_id, aud_acao, aud_tabela_afetada, aud_registro_afetado, aud_data_acao)
      VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      usu_id,
      aud_acao,
      aud_tabela_afetada,
      aud_registro_afetado,
      aud_data_acao
    ];

    const [result] = await db.query(sql, values);

    return response.status(200).json({
      sucesso: true,
      mensagem: "Auditoria cadastrada com sucesso",
      dados: {
        id: result.insertId,
        usu_id,
        aud_acao,
        aud_tabela_afetada,
        aud_registro_afetado,
        aud_data_acao
      }
    });

  } catch (error) {
    return response.status(500).json({
      sucesso: false,
      mensagem: `Erro ao cadastrar auditoria: ${error.message}`,
      dados: null
    });
  }
},

async editarAuditoria(request, response) {
  try {

    const {
      usu_id,
      aud_acao,
      aud_tabela_afetada,
      aud_registro_afetado,
      aud_data_acao
    } = request.body;

    const { id } = request.params;

    const sql = `
      UPDATE AUDITORIA
      SET
        usu_id = ?,
        aud_acao = ?,
        aud_tabela_afetada = ?,
        aud_registro_afetado = ?,
        aud_data_acao = ?
      WHERE aud_id = ?
    `;

    const values = [
      usu_id,
      aud_acao,
      aud_tabela_afetada,
      aud_registro_afetado,
      aud_data_acao,
      id
    ];

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return response.status(404).json({
        sucesso: false,
        mensagem: "Auditoria não encontrada",
        dados: null
      });
    }

    return response.status(200).json({
      sucesso: true,
      mensagem: "Auditoria atualizada com sucesso",
      dados: {
        id,
        usu_id,
        aud_acao,
        aud_tabela_afetada,
        aud_registro_afetado,
        aud_data_acao
      }
    });

  } catch (error) {
    return response.status(500).json({
      sucesso: false,
      mensagem: `Erro ao atualizar auditoria: ${error.message}`,
      dados: null
    });
  }
},

async apagarAuditoria(request, response) {
  try {

    const { id } = request.params;

    const sql = `
      DELETE FROM AUDITORIA
      WHERE aud_id = ?
    `;

    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return response.status(404).json({
        sucesso: false,
        mensagem: `Auditoria ${id} não encontrada`,
        dados: null
      });
    }

    return response.status(200).json({
      sucesso: true,
      mensagem: `Auditoria ${id} excluída com sucesso`
    });

  } catch (error) {
    return response.status(500).json({
      sucesso: false,
      mensagem: `Erro ao excluir auditoria: ${error.message}`
    });
  }
},

async ocultarAuditoria(request, response) {
  try {

    const { id } = request.params;

    const sql = `
      UPDATE AUDITORIA
      SET aud_acao = 2
      WHERE aud_id = ?
    `;

    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return response.status(404).json({
        sucesso: false,
        mensagem: `Auditoria ${id} não encontrada`,
        dados: null
      });
    }

    return response.status(200).json({
      sucesso: true,
      mensagem: `Auditoria ${id} marcada como excluída`
    });

  } catch (error) {
    return response.status(500).json({
      sucesso: false,
      mensagem: `Erro ao ocultar auditoria: ${error.message}`
    });
  }
}

};