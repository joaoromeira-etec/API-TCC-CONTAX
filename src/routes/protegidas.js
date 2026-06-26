const express = require('express');
const multer = require('multer');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Importar middleware de autenticação
const { autenticar, validarPermissao } = require('../middlewares/auth');

// Importar controllers
const dashboardController = require('../controllers/dashboard');
const documentosController = require('../controllers/documentos');

/**
 * ROTAS PROTEGIDAS - Todas requerem autenticação
 * Header obrigatório: Authorization: '{"usuarioId": 1, "empresaId": 5}'
 */

// ============== DASHBOARD ==============
router.get('/dashboard/abas', autenticar, dashboardController.obterAbas);
router.get('/dashboard/resumo', autenticar, dashboardController.obterResumoDashboard);

// ============== IMPOSTOS ==============
router.get('/dashboard/impostos', autenticar, dashboardController.obterImpostos);

// ============== FATURAMENTO / NOTAS EMITIDAS ==============
router.get('/dashboard/faturamento', autenticar, dashboardController.obterFaturamento);

// ============== CAIXA (apenas ME) ==============
router.get('/dashboard/caixa', autenticar, dashboardController.obterCaixa);

// ============== PRAZOS / CONTROLE MENSAL ==============
router.get('/dashboard/prazos', autenticar, dashboardController.obterPrazos);

// ============== DOCUMENTOS COM CONTROLE DE ACESSO ==============
// Listar documentos - todos podem acessar (após autenticação)
router.get('/documentos/autenticados', autenticar, documentosController.listarDocumentos);

// Upload de documentos - apenas ADM (nível 2)
router.post('/documentos/autenticados',
    autenticar,
    upload.single('arquivo'),
    documentosController.cadastrarDocumentos
);

module.exports = router;
