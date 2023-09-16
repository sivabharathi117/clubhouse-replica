const util = require('./../utils/commonUtils');

module.exports = (req, res, next) => {
    try {
        const jwtToken = req.headers.authorization.split(" ")[1];
        let verifyToken = util.verifyJwt(jwtToken);
        if (verifyToken) {
            next();
        } else {
            res.status(401).send("Malformed User");
        }
    } catch (err) {
        res.status(401).json({
            error: 'Invalid request!'
        });
    }
};

