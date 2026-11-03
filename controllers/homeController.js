function renderHome(req, res) {
  res.render('home', {
    title: 'Inicio',
  });
}

module.exports = {
  renderHome,
};
