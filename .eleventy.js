const markdownIt = require('markdown-it');
const md = markdownIt({ html: true, linkify: true, typographer: true });
const striptags = require('striptags');

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/llms.txt");
  eleventyConfig.addPassthroughCopy("src/assets/images");

  // Markdown filter — 渲染後修正內文圖片路徑，補上 pathPrefix
  eleventyConfig.addFilter('markdown', content => {
    if (!content) return '';
    const rendered = md.render(content);
    const prefix = (process.env.SITE_BASE_PATH || '/').replace(/\/$/, '');
    if (!prefix) return rendered;
    return rendered.replace(/src="\/assets\//g, `src="${prefix}/assets/`);
  });

  // striptags filter — 清除 HTML 標籤
  eleventyConfig.addFilter('striptags', content => content ? striptags(content) : '');

  // truncate filter — 截斷文字並加上省略號
  eleventyConfig.addFilter('truncate', (content, length = 150) => {
    if (!content) return '';
    const str = String(content);
    return str.length > length ? str.slice(0, length) + '...' : str;
  });

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
