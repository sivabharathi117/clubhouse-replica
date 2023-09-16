const jwt = require('jsonwebtoken');

function verifyJwt(token) {
    if (token) {
        return jwt.verify(token, process.env.jwtSecretKey, (err, decoded) => {
            if (err) {
                return false;
            } else {
                return true;
            }
        });
    }
    return false;
}

module.exports = { verifyJwt };