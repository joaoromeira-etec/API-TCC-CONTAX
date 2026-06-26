const express = require('express');
const router = express.Router();
const multer = require('multer');

const { autenticar } = require('../middlewares/auth');

const upload = multer({
    dest: 'uploads/'
});

// Importe dos controllers
const TipoDocumentosController = require('../controllers/tipoDocumentos');
const DocumentosController = require('../controllers/documentos');
const NotasController = require('../controllers/notas');
const RegimeEmpresaController = require('../controllers/regimeEmpresa');
const AdminController = require('../controllers/admin');
const dashboardController = require('../controllers/dashboard')
//const uploadImage = require('../controllers/uploadHelper');
//const uploadDocumentos = uploadImage('documentos');


// Rotas para Tipo de Documentos
router.get('/tipoDocumentos', TipoDocumentosController.listarTipoDocumentos);
router.post('/tipoDocumentos', TipoDocumentosController.cadastrarTipoDocumentos);
router.patch('/tipoDocumentos/:id', TipoDocumentosController.editarTipoDocumentos); // Params.
router.delete('/tipoDocumentos/:id', TipoDocumentosController.apagarTipoDocumentos); // Params, Não-Recomendado.
router.delete('/tipoDocumentos/del/:id', TipoDocumentosController.ocultarTipoDocumentos); // Params, Recomendado.

// Rotas para Documentos
router.get('/documentos', DocumentosController.listarDocumentos);
router.get('/documentos/download/:id', DocumentosController.downloadDocumento);
router.get('/documentos/preview/:id', DocumentosController.previewDocumento);
// Upload de nota fiscal com arquivo multipart
router.post('/documentos', upload.any(), NotasController.cadastrarNota);
router.patch('/documentos/:id', upload.single('arquivo'), DocumentosController.editarDocumentos);
router.delete('/documentos/:id', DocumentosController.apagarDocumentos); //Não-Recomendado.
router.delete('/documentos/del/:id', DocumentosController.ocultarDocumentos); //Recomendado.

// Rotas para Regime da Empresa
router.get('/regimeEmpresa', RegimeEmpresaController.listarRegimeEmpresa);
router.post('/regimeEmpresa', RegimeEmpresaController.cadastrarRegimeEmpresa);
router.patch('/regimeEmpresa/:id', RegimeEmpresaController.editarRegimeEmpresa);
router.delete('/regimeEmpresa/:id', RegimeEmpresaController.apagarRegimeEmpresa);
router.delete('/regimeEmpresa/del/:id', RegimeEmpresaController.ocultarRegimeEmpresa);

// Rotas para o Administrador
router.get('/admin/resumo', AdminController.listarResumoAdmin);
router.get('/admin/empresas-risco', AdminController.listarEmpresasRisco);
router.get('/admin/ultimos-documentos', AdminController.listarUltimosDocumentos);
router.get('/admin/prazos-pendentes', AdminController.listarPrazosPendentes);
router.get('/admin/auditoria-recente', AdminController.listarAuditoriaRecente);
router.get('/admin/financeiro-mensal', AdminController.listarFinanceiroMensal);

// Rotas para o Dashboard (Protegidas)
router.get('/dashboard/abas', dashboardController.obterAbas);
router.get('/dashboard/resumo', dashboardController.obterResumoDashboard);
router.get('/dashboard/impostos', dashboardController.obterImpostos);
router.get('/dashboard/faturamento', dashboardController.obterFaturamento);
router.get('/dashboard/caixa', dashboardController.obterCaixa);
router.get('/dashboard/prazos', dashboardController.obterPrazos);

// Rotas para o Dashboard (Protegidas)
//router.get('/dashboard/abas', autenticar, dashboardController.obterAbas);
//router.get('/dashboard/resumo', autenticar, dashboardController.obterResumoDashboard);
//router.get('/dashboard/impostos', autenticar, dashboardController.obterImpostos);
//router.get('/dashboard/faturamento', autenticar, dashboardController.obterFaturamento);
//router.get('/dashboard/caixa', autenticar, dashboardController.obterCaixa);
//router.get('/dashboard/prazos', autenticar, dashboardController.obterPrazos);

module.exports = router