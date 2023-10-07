const jwt = require('jsonwebtoken');

function verifyJwt(token) {
    if (token) {
        return jwt.verify(token, process.env.jwtSecretKey, (err, decoded) => {
            if (err) {
                return false;
            } else {
                return decoded;
            }
        });
    }
    return false;
}

function handleErrorResponse(res, code, error) {
    const errorData = {
        status: "failure",
        code,
        error
    }
    res.status(code).send(errorData);
}

function handleSuccessResponse(res, code, data = {}, message = "Success") {
    const successData = {
        status: "success",
        code,
        message,
        data
    }
    res.status(code).send(successData);
}

module.exports = { verifyJwt, handleErrorResponse, handleSuccessResponse };