/**
 * @fileoverview Rotas para Regime, Prazos e Auditoria
 * Define endpoints para gerenciar regimes tributários, prazos fiscais e auditoria
 */

const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middlewares/auth');

// Importar controllers
const regimeController = require('../controllers/regime');
const prazosController = require('../controllers/prazos');
const auditoriaController = require('../controllers/auditoria');

/**
 * ROTAS DE REGIME
 * Gerencia tipos de regimes tributários
 */
router.get('/regime', regimeController.listarRegime);
router.post('/regime', regimeController.cadastrarRegime);
router.patch('/regime/:id', regimeController.editarRegime);
router.delete('/regime/:id', regimeController.apagarRegime); // Hard delete (não recomendado)
router.delete('/regime/del/:id', regimeController.ocultarRegime); // Soft delete (recomendado)

/**
 * ROTAS DE PRAZOS
 * Gerencia prazos fiscais e comerciais
 */
router.get('/prazos', prazosController.listarPrazos);
router.get('/prazos/resumo', prazosController.resumoPrazos);
router.post('/prazos', prazosController.cadastrarPrazos);
router.patch('/prazos/:id', prazosController.editarPrazos);
router.delete('/prazos/:id', prazosController.apagarPrazos); // Hard delete (não recomendado)
router.delete('/prazos/del/:id', prazosController.ocultarPrazos); // Soft delete (recomendado)

/**
 * ROTAS DE AUDITORIA
 * Gerencia registros de auditoria e rastreamento de ações
 * Acesso: Gerente (nível 1) e Administrador (nível 2)
 */
router.get('/auditoria', autenticar, autorizar([1, 2]), auditoriaController.listarAuditoria);
router.post('/auditoria', autenticar, autorizar([2]), auditoriaController.cadastrarAuditoria);
router.patch('/auditoria/:id', autenticar, autorizar([2]), auditoriaController.editarAuditoria);
router.delete('/auditoria/:id', autenticar, autorizar([2]), auditoriaController.apagarAuditoria); // Hard delete (não recomendado)
router.delete('/auditoria/del/:id', autenticar, autorizar([1, 2]), auditoriaController.ocultarAuditoria); // Soft delete (recomendado)

module.exports = router;