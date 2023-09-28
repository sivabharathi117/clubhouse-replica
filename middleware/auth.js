const util = require('./../utils/commonUtils');

module.exports = (req, res, next) => {
    try {
        const jwtToken = req.headers.authorization.split(" ")[1];
        let decodedData = util.verifyJwt(jwtToken);
        if (decodedData && decodedData.data) {
            req.userDetails = {
                ...decodedData.data
            }
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

