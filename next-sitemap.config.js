/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://musa-security-app.windsurf.build',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/sw.js', '/workbox-*.js', '/worker-*.js', '/fallback-*.js'],
      },
    ],
    additionalSitemaps: [
      'https://musa-security-app.windsurf.build/server-sitemap.xml',
    ],
  },
  exclude: ['/server-sitemap.xml'],
  generateIndexSitemap: true,
  outDir: 'public',
  changefreq: 'daily',
  priority: 0.7,
  autoLastmod: true,
  sourceDir: '.next',
  transform: async (config, path) => {
    // Customize priority and changefreq based on path
    if (path === '/') {
      return { loc: path, changefreq: 'daily', priority: 1.0, lastmod: new Date().toISOString() };
    }
    if (path.startsWith('/dashboard') || path.startsWith('/scan')) {
      return { loc: path, changefreq: 'daily', priority: 0.9, lastmod: new Date().toISOString() };
    }
    if (path.startsWith('/profile') || path.startsWith('/household')) {
      return { loc: path, changefreq: 'weekly', priority: 0.7, lastmod: new Date().toISOString() };
    }
    if (path.startsWith('/login') || path.startsWith('/register')) {
      return { loc: path, changefreq: 'monthly', priority: 0.8, lastmod: new Date().toISOString() };
    }
    return { loc: path, changefreq: 'weekly', priority: 0.5, lastmod: new Date().toISOString() };
  },
  additionalPaths: async (config) => [
    await config.transform(config, '/additional-page'),
  ],
};
