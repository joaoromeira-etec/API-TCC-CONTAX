const express = require('express');
const router = express.Router();

// Importe dos controllers
const regimeController = require('../controllers/regime');
const prazosController = require('../controllers/prazos');
const auditoriaController = require('../controllers/auditoria');

// Rotas para Regime
router.get('/regime', regimeController.listarRegime);
router.post('/regime', regimeController.cadastrarRegime);   
router.patch('/regime/:id', regimeController.editarRegime);
router.delete('/regime/:id', regimeController.apagarRegime); //Não-Recomendado.
router.delete('/regime/del/:id', regimeController.ocultarRegime); //Recomendado.


// Rotas para Prazos
router.get('/prazos', prazosController.listarPrazos);
router.get('/prazos/resumo', prazosController.resumoPrazos);
router.post('/prazos', prazosController.cadastrarPrazos);
router.patch('/prazos/:id', prazosController.editarPrazos);
router.delete('/prazos/:id', prazosController.apagarPrazos); //Não-Recomendado.
router.delete('/prazos/del/:id', prazosController.ocultarPrazos); //Recomendado.


// Rotas para Auditoria
router.get('/auditoria',auditoriaController.listarAuditoria);
router.post('/auditoria',auditoriaController.cadastrarAuditoria);
router.patch('/auditoria/:id',auditoriaController.editarAuditoria);
router.delete('/auditoria/:id',auditoriaController.apagarAuditoria);  //Não-Recomendado.
router.delete('/auditoria/del/:id',auditoriaController.ocultarAuditoria); //Recomendado.

module.exports = router;