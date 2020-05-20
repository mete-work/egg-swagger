const Paths = require('./parser/paths');

module.exports = routes => {
  let out = {};
  const paths = new Paths();
  const pathData = paths.build(routes);

  out = { ...out, ...pathData };

  return out;
};
