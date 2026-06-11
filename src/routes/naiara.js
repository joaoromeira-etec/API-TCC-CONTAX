const express = require('express');
const router = express.Router();

const usuariosController = require('../controllers/usuarios');
const empresasController = require('../controllers/empresas');
const usuarioEmpresaController = require('../controllers/usuarioEmpresa');
const financeiroController = require('../controllers/financeiro');
const { route } = require('./joaoPedro');

router.get('/usuarios', usuariosController.listarUsuarios);
router.get('/usuarios/login', usuariosController.loginUsuarios);
router.get('/usuarios/:id', usuariosController.listarEmpresasDoUsuario);
router.post('/usuarios', usuariosController.cadastrarUsuarios);
router.patch('/usuarios/:id', usuariosController.editarUsuarios);
router.delete('/usuarios/:id', usuariosController.apagarUsuarios);
router.delete('/usuarios/del/:id', usuariosController.ocultarUsuarios);


router.get('/empresas', empresasController.listarEmpresas);
router.get('/empresas/login', empresasController.loginEmpresas);
router.post('/empresas', empresasController.cadastrarEmpresas);
router.post('/empresas/enderecos:id', empresasController.cadastrarEmpresaEnderecos);
router.patch('/empresas/:id', empresasController.editarEmpresas);
router.delete('/empresas/:id', empresasController.apagarEmpresas);
router.delete('/empresas/del/:id', empresasController.ocultarEmpresas);

router.get('/financeiro', financeiroController.listarFinanceiro);


router.get('/usuario_empresas', usuarioEmpresaController.listarUsuarioEmpresa);
router.post('/usuario_empresas', usuarioEmpresaController.cadastrarUsuarioEmpresa);
router.patch('/usuario_empresas/:id', usuarioEmpresaController.editarUsuarioEmpresa);
router.delete('/usuario_empresas/:id', usuarioEmpresaController.apagarUsuarioEmpresa);
router.delete('/usuario_empresas/del/:id', usuarioEmpresaController.ocultarUsuarioEmpresa);

module.exports = router;