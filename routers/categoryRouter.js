const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryCRUD');

router.post("/",categoryController.createCategory);
router.get("/",categoryController.getCategory);
router.delete("/:id",categoryController.deleteCategory);

module.exports = router ;