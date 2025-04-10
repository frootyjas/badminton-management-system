const createError = require('http-errors');

const roleChecker = (roles) => {
  return (req, res, next) => {
    try {
      const user = req.user; // access user object from the request
      const { role } = user; // extract the user role

      if (!roles.includes(role)) {
        return next(createError(403, 'Forbidden: You do not have access to this resource.'));
      }

      next(); // proceed to the next middleware or route handler
    } catch (err) {
      console.error('Error occurred in role checker:', err);
      return next(createError(500, 'Internal Server Error'));
    }
  };
};

module.exports = roleChecker;
