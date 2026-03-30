module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/llms.txt");

  // Date filter
  eleventyConfig.addFilter("dateDisplay", (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  });

  return {
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
