// const app = require("./app");
import app from "./app.js"
const port = 3000 ;
import prisma from "./src/config/prisma.js";

async function testDatabase(params) {
    const users = await prisma.user.findMany();
    console.log(users)
}
testDatabase()
app.listen(port,()=>{
    console.log(`Example app listening on port ${port}`);
});