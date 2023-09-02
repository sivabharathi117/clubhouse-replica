var express = require('express');
var router = express.Router();
var loginController = require('./../controllers/loginController')

router.get("/", (req, res) => {
    res.send("App Workes");
});

router.post('/login', loginController.login);
router.post('/verifyOtp', loginController.verifyOtp);

module.exports = router;