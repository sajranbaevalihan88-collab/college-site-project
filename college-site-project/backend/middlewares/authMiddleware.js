const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  var authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'нет токена' });
  }

  var token = authHeader.split(' ')[1];

  try {
    var decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // console.log("bad token", error);
    return res.status(401).json({ error: 'плохой токен' });
  }
};

module.exports = authMiddleware;
