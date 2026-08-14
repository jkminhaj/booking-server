const express = require("express");
const testController = require("./test.controller");

const router = express.Router();

router.get("/",testController.testServer);

module.exports = router;