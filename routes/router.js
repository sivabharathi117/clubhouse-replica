const express = require('express');
const router = express.Router();
const loginController = require('./../controllers/loginController');
const roomsController = require('./../controllers/roomsController');
const auth = require('./../middleware/auth');


router.get("/", (req, res) => {
    res.send("App Workes");
});

router.post('/login', loginController.login);
router.post('/verifyOtp', loginController.verifyOtp);
router.post('/createRoom', auth, roomsController.createRoom);
router.get('/checkValidRoom', auth, roomsController.checkValidRoom);
router.get('/roomsList', auth, roomsController.getRoomsList);

module.exports = router;