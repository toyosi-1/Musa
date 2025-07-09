/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://musa-security-app.windsurf.build',
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  exclude: ['/server-sitemap.xml'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
}
