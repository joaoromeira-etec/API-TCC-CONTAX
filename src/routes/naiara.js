const express = require('express');
const router = express.Router();

const usuariosController = require('../controllers/usuarios');
const empresasController = require('../controllers/empresas');
const usuario_empresasController = require('../controllers/usuario_empresas');

router.get('/usuarios', usuariosController.listarUsuarios);
router.post('/usuarios', usuariosController.cadastrarUsuarios);
router.patch('/usuarios/:id', usuariosController.editarUsuarios);
router.delete('/usuarios/:id', usuariosController.apagarUsuarios);
//router.delete('/usuarios/del/:id', usuariosController.ocultarUsuarios);

router.get('/empresas', empresasController.listarEmpresas);
router.post('/empresas', empresasController.cadastrarEmpresas);
router.patch('/empresas/:id', empresasController.editarEmpresas);
router.delete('/empresas/:id', empresasController.apagarEmpresas);
//router.delete('/empresas/del/:id', usuariosController.ocultarEmpresas);

router.get('/usuario_empresas', usuario_empresasController.listarUsuarioEmpresa);
router.post('/usuario_empresas', usuario_empresasController.cadastrarUsuarioEmpresa);
router.patch('/usuario_empresas/:id', usuario_empresasController.editarUsuarioEmpresa);
router.delete('/usuario_empresas/:id', usuario_empresasController.apagarUsuarioEmpresa);
//router.delete('/usuario_empresas/del/:id', usuario_empresasController.ocultarUsuarioEmpresa);

module.exports = router;