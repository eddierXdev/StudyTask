'use strict';

function renderDashboard(req, res) {
  return res.render('dashboard', {
    title: 'Panel',
    currentUser: req.user.toJSON(),
  });
}

module.exports = {
  renderDashboard,
};
