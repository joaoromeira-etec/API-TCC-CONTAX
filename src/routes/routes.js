const express = require('express');
const router = express.Router();

// Import dos arquivos de rotas
const joaoPedro = require('./joaoPedro');
const naiara = require('./naiara');
const rian = require('./rian');
const protegidas = require('./protegidas');

router.use('/', joaoPedro);
router.use('/', naiara);
router.use('/', rian);
router.use('/api', protegidas);

module.exports = router;