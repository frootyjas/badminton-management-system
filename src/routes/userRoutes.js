const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('config');
const roleChecker = require('../middleware/roleChecker');
const verifyToken = require('../middleware/authJwt');
const {
  getCurrentUser,
  getUserById,
  updateUserInfo,
  serveData,
  getAllCourts,
  getCourtById,
  createReservation,
  getAvailability,
  handleCourtReservation,
  getReservations,
  cancelReservation,
  getAdminReservations,
  postAdminAnnouncement,
  removeAnnouncement,
  postAdminEvent,
  removeEvent,
  getAdminPosts,
  getAllPosts,
  postAdminTournament,
  joinEvent,
  getAllEventParticipants,
  getOngoingEvents,
  checkIfUserJoined,
  confirmEventPayment,
  getEventById,
  postAdminMembership,
  checkPaymentStatus,
  createPost,
  retrieveAllPosts,
  removePost,
  addLike,
  removeLike,
  addComment,
  removeComment,
  getPopularHashtags,
  getPostsByHashtag,
  fetchComments,
  createProduct,
  getAllProducts,
  getProductById,
  removeProductById,
  updateProduct,
  updateBillStatus,
  createMembership,
  subscribeMembership,
  revokeSubscription,
  getMembership,
  addToCart,
  getCartByUser,
  removeAllCartItems,
  updateCartQuantity,
  removeProductFromCart,
  serveCheckoutPage,
  createOrder,
  confirmOrderPayment,
  getOrderStatus,
  getPaidOrders,
  getOrdersForOwner,
  getMembershipsForCourtOwner,
  deleteMembership,
  updateMembership,
  getAllMembershipCards,
  subscribeToMembership,
  confirmMembershipPayment,
  getUserSubscriptions,
  cancelSubscription,
  revokeUserSubscription,
  removeUserSubscription,
  getSubscribersForMembership,
  submitFeedback,
  getUserNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
  clearNotifications,
  testWebsocketNotif
} = require('../controllers/userController');
const serveFile = require('../utils/fileUtils');
const {
  validateUserId,
  validateUserInfo,
  validateAnnouncementPost,
  validateEventPost,
  validateTournamentPost
} = require('../middleware/validator');
const validateUpdateFields = require('../middleware/validateUpdateField');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { checkFilePermissions } = require('../middleware/checkFilePermission');
const checkCourtId = require('../middleware/checkCourtId');

const limiter = createRateLimiter(15 * 60 * 1000, 100);

let routes = (app, io) => {
  router.get('/me', verifyToken, getCurrentUser);

  router.get('/get-user/:id', verifyToken, validateUserId, getUserById);

  // route to serve files from R2
  router.get('/data/:filename', verifyToken, checkFilePermissions, serveData);

  router.put(
    '/update',
    verifyToken,
    roleChecker(['player', 'coach']),
    validateUpdateFields,
    validateUserInfo,
    updateUserInfo
  );

  router.get('/courts', verifyToken, getAllCourts);

  router.get('/court/:id', verifyToken, getCourtById);

  router.get('/admin/dashboard', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/admindash.html');
    serveFile(filePath, res, next);
  });

  router.get('/admin/events-and-tournaments', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/vieweventtournalist.html');
    serveFile(filePath, res, next);
  });

  router.get('/admin/view-event', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/viewevent.html');
    serveFile(filePath, res, next);
  });

  router.get('/admin/get-event/:id', verifyToken, roleChecker(['admin']), getEventById);

  router.get('/court-reservation', verifyToken, checkCourtId, roleChecker(['player', 'coach']), (req, res, next) => {
    handleCourtReservation(req, res, next, io);
  });

  router.delete('/admin/announcement/:announcementId', verifyToken, roleChecker(['admin']), (req, res, next) => {
    removeAnnouncement(req, res, io);
  });

  router.post(
    '/admin/announcement',
    verifyToken,
    validateAnnouncementPost,
    roleChecker(['admin']),
    (req, res, next) => {
      postAdminAnnouncement(req, res, io);
    }
  );

  router.delete('/admin/event/:eventId', verifyToken, roleChecker(['admin']), (req, res, next) => {
    removeEvent(req, res, io);
  });

  router.post('/admin/event', validateEventPost, verifyToken, roleChecker(['admin']), (req, res, next) => {
    postAdminEvent(req, res, io);
  });

  router.get('/event/check-joined/:eventId', verifyToken, roleChecker(['player', 'coach']), checkIfUserJoined);

  router.post('/event/join', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    joinEvent(req, res, io);
  });
  router.get('/events/ongoing', verifyToken, getOngoingEvents);

  router.get('/admin/events/participants', verifyToken, roleChecker(['admin']), (req, res, next) => {
    getAllEventParticipants(req, res, io);
  });

  router.post('/admin/tournament', verifyToken, roleChecker(['admin']), (req, res, next) => {
    postAdminTournament(req, res, io);
  });

  router.post('/admin/membership', verifyToken, roleChecker(['admin']), postAdminMembership);

  router.get('/posts', verifyToken, roleChecker(['player', 'coach']), getAllPosts);

  router.get('/admin/posts', verifyToken, roleChecker(['admin']), getAdminPosts);

  router.get('/announcements', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const tab = req.query.tab;
    let filePath;

    switch (tab) {
      case 'schedule-reservation':
        filePath = path.resolve(__dirname, '../../build/userschedulereservation.html');
        break;
      case 'view-tournaments':
        filePath = path.resolve(__dirname, '../../build/userviewtournaments.html');
        break;
      default:
        filePath = path.resolve(__dirname, '../../build/userviewannouncement.html');

        break;
    }

    serveFile(filePath, res, next);
  });

  router.get('/confirm-event-payment', verifyToken, roleChecker(['player', 'coach']), confirmEventPayment);

  router.get('/admin/view-post', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const tab = req.query.tab;
    let filePath;

    switch (tab) {
      case 'announcements':
        break;
      case 'events':
        break;
      case 'tournaments':
        break;
      default:
        filePath = path.resolve(__dirname, '../../build/viewadminpost.html');
        break;
    }

    serveFile(filePath, res, next);
  });

  router.get('/admin/user-payments', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const tab = req.query.tab; // get the page from the query parameter
    let filePath;

    switch (tab) {
      case 'event-and-tournaments':
        filePath = path.resolve(__dirname, '../../build/adminviewuserpaymentet.html');
        break;
      case 'product-reservation':
        // specify the file path for product reservation here
        filePath = path.resolve(__dirname, '../../build/adminviewuserpaymentproduct.html');
        break;
      default:
        // default to court reservations
        filePath = path.resolve(__dirname, '../../build/adminviewuserpayment.html');
        break;
    }

    serveFile(filePath, res, next);
  });

  router.get('/admin/schedule', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const tab = req.query.tab; // get the page from the query parameter
    let filePath;

    switch (tab) {
      case 'event-and-tournaments':
        filePath = path.resolve(__dirname, '../../build/eventtournaments.html');
        break;
      case 'training-sessions':
        // specify the file path for training sessions here
        filePath = path.resolve(__dirname, '../../build/trainingsessions.html');
        break;
      case 'product-pickup':
        // specify the file path for product pickup here
        filePath = path.resolve(__dirname, '../../build/productpickup.html');
        break;
      default:
        // default to court reservations
        filePath = path.resolve(__dirname, '../../build/adminschedulereservation.html');
        break;
    }

    serveFile(filePath, res, next);
  });
  router.get('/reserve/:type', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const { type } = req.params;
    let filePath;

    switch (type) {
      case 'court-list':
        filePath = path.resolve(__dirname, '../../build/usercourtlist.html');
        break;
      case 'map-view':
        filePath = path.resolve(__dirname, '../../build/usercourtviewing.html');
        break;
    }

    serveFile(filePath, res, next);
  });

  router.post('/reserve', verifyToken, roleChecker(['player', 'coach']), (req, res) => {
    createReservation(req, res, io);
  });

  router.get('/reservations', verifyToken, roleChecker(['player', 'coach']), getReservations);

  router.get('/admin/reservations', verifyToken, roleChecker(['admin']), getAdminReservations);

  router.post('/reservations/cancel', verifyToken, roleChecker(['player', 'coach']), cancelReservation);

  router.get('/availability', verifyToken, roleChecker(['player', 'coach']), getAvailability);

  router.get('/dashboard', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/userdash.html');
    serveFile(filePath, res, next);
  });

  router.get('/view-schedule', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/viewusercourtreservationsched.html');
    serveFile(filePath, res, next);
  });

  router.get('/edit-profile', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/userprofile.html');
    serveFile(filePath, res, next);
  });

  router.get('/admin/profile', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const tab = req.query.tab; // get the page from the query parameter
    let filePath;

    switch (tab) {
      case 'owner-profile':
        filePath = path.resolve(__dirname, '../../build/ownerprofile.html');
        break;
      case 'business-profile':
        filePath = path.resolve(__dirname, '../../build/businessprofile.html');
        break;
      case 'pinpoint-profile':
        filePath = path.resolve(__dirname, '../../build/pinpointprofile.html');
        break;
    }

    serveFile(filePath, res, next);
  });

  router.get('/admin/settings', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/adminsettings.html');
    serveFile(filePath, res, next);
  });

  router.get('/admin/products', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/adminviewproduct.html');
    serveFile(filePath, res, next);
  });

  router.get('/products', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/userviewproducts.html');
    serveFile(filePath, res, next);
  });

  router.get('/check-payment-status', verifyToken, roleChecker(['player', 'coach']), checkPaymentStatus);

  router.get('/community', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/community.html');
    serveFile(filePath, res, next);
  });

  router.post('/community/post', verifyToken, roleChecker(['player', 'coach']), (req, res) => {
    createPost(req, res, io);
  });

  router.get('/community/posts', verifyToken, roleChecker(['player', 'coach']), retrieveAllPosts);

  router.delete('/community/posts/:postId', verifyToken, roleChecker(['player', 'coach']), removePost);

  router.post('/community/posts/:postId/like', verifyToken, roleChecker(['player', 'coach']), (req, res) => {
    addLike(req, res, io);
  });

  router.delete('/community/posts/:postId/like', verifyToken, roleChecker(['player', 'coach']), (req, res) => {
    removeLike(req, res, io);
  });

  router.post('/community/posts/:postId/comment', verifyToken, roleChecker(['player', 'coach']), addComment);

  router.delete(
    '/community/posts/:postId/:commentId/comment',
    verifyToken,
    roleChecker(['player', 'coach']),
    removeComment
  );

  router.get('/community/posts/:postId/comments', verifyToken, roleChecker(['player', 'coach']), fetchComments);

  router.get('/community/posts/popular', verifyToken, roleChecker(['player', 'coach']), getPopularHashtags);

  router.get('/community/posts/:hashtag', verifyToken, roleChecker(['player', 'coach']), getPostsByHashtag);

  router.get('/admin/adminviewmembership', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/adminviewmembership.html');
    serveFile(filePath, res, next);
  });

  router.get('/memberships', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/userviewmembership.html');
    serveFile(filePath, res, next);
  });

  router.get('/admin/products', verifyToken, roleChecker(['admin']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/adminviewproduct.html');
    serveFile(filePath, res, next);
  });

  router.get('/admin/products/get-orders', verifyToken, roleChecker(['admin']), getOrdersForOwner);

  router.get('/products', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/userviewproducts.html');
    serveFile(filePath, res, next);
  });

  // router.get('/admin/products', verifyToken, roleChecker(['admin']), (req, res, next) => {
  //   const filePath = path.resolve(__dirname, '../../build/viewproduct.html');
  //   serveFile(filePath, res, next);
  // });
  router.post('/products', verifyToken, roleChecker(['admin']), createProduct);

  router.put('/products/:id', verifyToken, roleChecker(['admin']), updateProduct);

  router.delete('/products/:id', verifyToken, roleChecker(['admin']), removeProductById);

  router.get('/get-products', verifyToken, roleChecker(['admin', 'player', 'coach']), getAllProducts);

  router.get('/get-products/:id', verifyToken, roleChecker(['admin']), getProductById);

  router.get('/cart', verifyToken, getCartByUser);

  router.post('/cart/add', verifyToken, roleChecker(['player', 'coach']), addToCart);

  router.patch('/cart/update-quantity', verifyToken, updateCartQuantity);

  router.delete('/cart/remove/:productId', verifyToken, removeProductFromCart);

  router.delete('/cart/clear', verifyToken, removeAllCartItems);

  router.get('/products/checkout', verifyToken, roleChecker(['player', 'coach']), serveCheckoutPage);

  router.post('/products/orders/create', verifyToken, roleChecker(['player', 'coach']), createOrder);

  router.get('/products/orders/confirm', verifyToken, roleChecker(['player', 'coach']), confirmOrderPayment);

  router.get('/products/orders/status', verifyToken, roleChecker(['player', 'coach']), getOrderStatus);

  router.get('/products/orders/paid', verifyToken, roleChecker(['player', 'coach']), getPaidOrders);

  router.get('/help', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/help.html');
    serveFile(filePath, res, next);
  });

  router.patch('/admin/reservations/:id/bill-status', verifyToken, roleChecker(['admin']), updateBillStatus);

  router.get('/products/order-list', verifyToken, roleChecker(['player', 'coach']), (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/userorderlist.html');
    serveFile(filePath, res, next);
  });

  router.post('/admin/membership/create', verifyToken, roleChecker(['admin']), createMembership);

  router.get('/admin/membership/get-memberships', verifyToken, roleChecker(['admin']), getMembershipsForCourtOwner);

  router.delete('/admin/membership/:membershipId', verifyToken, roleChecker(['admin']), deleteMembership);

  router.put('/admin/membership/:membershipId', verifyToken, roleChecker(['admin']), updateMembership);

  router.get(
    '/admin/membership/:subscriptionId/subscribers',
    verifyToken,
    roleChecker(['admin']),
    getSubscribersForMembership
  );

  router.delete(
    '/admin/membership/:subscriptionId/remove/:userId',
    verifyToken,
    roleChecker(['admin']),
    removeUserSubscription
  );

  router.get('/membership/get-memberships', verifyToken, roleChecker(['player', 'coach']), getAllMembershipCards);

  router.get('/membership/confirm', verifyToken, roleChecker(['player', 'coach']), confirmMembershipPayment);

  router.get('/membership/get-subscriptions', verifyToken, roleChecker(['player', 'coach']), getUserSubscriptions);

  router.post(
    '/membership/subscribe/:membershipId',
    verifyToken,
    roleChecker(['player', 'coach']),
    subscribeToMembership
  );
  router.post('/membership/cancel/:membershipId', verifyToken, roleChecker(['player', 'coach']), cancelSubscription);

  router.post('/feedback/submit', verifyToken, roleChecker(['player', 'coach']), submitFeedback);

  router.get('/notifications', verifyToken, roleChecker(['player', 'coach']), getUserNotifications);

  router.patch(
    '/notification/mark-read/:notificationId',
    verifyToken,
    roleChecker(['player', 'coach']),
    markNotificationAsRead
  );

  router.patch('/notifications/mark-read', verifyToken, roleChecker(['player', 'coach']), markNotificationsAsRead);

  router.delete('/notifications/clear', verifyToken, roleChecker(['player', 'coach']), clearNotifications);

  router.post('/notifications/test', verifyToken, roleChecker(['player', 'coach']), testWebsocketNotif);

  app.use('/user', router);
};

module.exports = routes;
