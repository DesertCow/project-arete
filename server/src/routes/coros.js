const express = require('express');

const { authenticate } = require('../middleware/auth');
const { getDashboardData } = require('../services/dashboardService');

const router = express.Router();
router.use(authenticate);

router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await getDashboardData(req.user.id);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
