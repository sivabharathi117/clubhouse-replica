const express = require('express');
const router = express.Router();
const loginController = require('./../controllers/loginController');
const roomsController = require('./../controllers/roomsController');
const userController = require('./../controllers/userController');
const auth = require('./../middleware/auth');


router.get("/", (req, res) => {
    res.send("App Works");
});

//login
router.post('/login', loginController.login);
router.post('/verifyOtp', loginController.verifyOtp);

//rooms
router.post('/createRoom', auth, roomsController.createRoom);
router.put('/updateRoom', auth, roomsController.updateRoom);
router.post('/checkValidRoom', auth, roomsController.checkValidRoom);
router.get('/roomsList', auth, roomsController.getRoomsList);

//users
router.put('/user/:id', auth, userController.editUser);
router.get('/user/:id', auth, userController.getUser);
router.get('/getPersonalDetails', auth, userController.getPersonalDetails);

module.exports = router;