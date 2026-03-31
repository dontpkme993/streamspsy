const markdownIt = require('markdown-it');
const md = markdownIt({ html: true, linkify: true, typographer: true });

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/llms.txt");
  eleventyConfig.addPassthroughCopy("src/assets/images");

  // Markdown filter
  eleventyConfig.addFilter('markdown', content => content ? md.render(content) : '');

  // Date filter
  eleventyConfig.addFilter("dateDisplay", (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  });

  return {
    pathPrefix: process.env.SITE_BASE_PATH || '/',
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
