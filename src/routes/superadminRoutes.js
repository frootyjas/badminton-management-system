const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('config');
const roleChecker = require('../middleware/roleChecker');
const verifyToken = require('../middleware/authJwt');
const serveFile = require('../utils/fileUtils');
const {
  getSuperadminDashboard,
  handleCourtApproval,
  getAllUsers,
  getCourtOwners,
  getCourtById
} = require('../controllers/superadminController');

let routes = (app) => {
  router.get('/dashboard', verifyToken, roleChecker(['superadmin']), getSuperadminDashboard);

  router.patch('/court/:action/:courtId', verifyToken, roleChecker(['superadmin']), handleCourtApproval);

  router.get('/users', verifyToken, roleChecker(['superadmin']), getAllUsers);

  router.get('/courts', verifyToken, roleChecker(['superadmin']), getCourtOwners);

  router.get('/court-details/:courtId', verifyToken, roleChecker(['superadmin']), getCourtById);

  app.use('/superadmin', router);
};

module.exports = routes;
