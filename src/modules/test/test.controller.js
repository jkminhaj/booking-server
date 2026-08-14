class TestController {
    testServer(req,res) {
        res.status(200).json({
            success:true,
            message:"Booking server is runing"
        })
    }
}

module.exports = new TestController();