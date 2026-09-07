const express = require('express');
const router = express.Router();
const productController = require('../controllers/productCRUD');
const upload = require('../middleware/upload');

router.post('/',upload.array('images',5), productController.createProduct);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.put('/:id',upload.array('images',5), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
