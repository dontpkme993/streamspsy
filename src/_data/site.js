module.exports = {
  url: (process.env.SITE_URL || 'http://localhost:8080').replace(/\/$/, ''),
  buildDate: new Date().toISOString().split('T')[0],
};
