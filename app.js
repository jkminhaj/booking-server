const express = require('express');
const testRouter = require("./src/modules/test/test.route");
const app = express();

app.use("/api/test",testRouter);

module.exports = app ;