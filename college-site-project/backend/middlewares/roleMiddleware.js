const roleMiddleware = function(allowedRoles) {
  return function(req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'нет доступа' });
    }

    // проверка
    var hasRole = false;
    for (var i=0; i<allowedRoles.length; i++) {
      if (allowedRoles[i] == req.user.role) {
        hasRole = true;
      }
    }

    if (!hasRole) {
      return res.status(403).json({ error: 'запрещено' });
    }

    next();
  };
};

module.exports = roleMiddleware;
