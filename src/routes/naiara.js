const express = require('express');
const router = express.Router();

const usuariosController = require('../controllers/usuarios');
const empresasController = require('../controllers/empresas');
const usuarioEmpresaController = require('../controllers/usuarioEmpresa');

router.get('/usuarios', usuariosController.listarUsuarios);
router.get('/usuarios/listarUsus', usuariosController.listarUsus);
router.post('/usuarios', usuariosController.cadastrarUsuarios);
router.patch('/usuarios/:id', usuariosController.editarUsuarios);
router.delete('/usuarios/:id', usuariosController.apagarUsuarios);
router.delete('/usuarios/del/:id', usuariosController.ocultarUsuarios);
router.get('/usuarios/login', usuariosController.loginUsuarios);

router.get('/empresas', empresasController.listarEmpresas);
router.get('/empresas/listarEmps', empresasController.listarEmps);
router.post('/empresas', empresasController.cadastrarEmpresas);
router.patch('/empresas/:id', empresasController.editarEmpresas);
router.delete('/empresas/:id', empresasController.apagarEmpresas);
router.delete('/empresas/del/:id', empresasController.ocultarEmpresas);
router.get('/empresas/login', empresasController.loginEmpresas);

router.get('/usuario_empresas', usuarioEmpresaController.listarUsuarioEmpresa);
router.post('/usuario_empresas', usuarioEmpresaController.cadastrarUsuarioEmpresa);
router.patch('/usuario_empresas/:id', usuarioEmpresaController.editarUsuarioEmpresa);
router.delete('/usuario_empresas/:id', usuarioEmpresaController.apagarUsuarioEmpresa);
router.delete('/usuario_empresas/del/:id', usuarioEmpresaController.ocultarUsuarioEmpresa);

module.exports = router;