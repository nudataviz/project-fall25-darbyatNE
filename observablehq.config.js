// Observable Framework configuration
// See https://observablehq.com/framework/config

export default {
  title: "PJM LMP Visualization",
  head: '<link rel="icon" href="/lib/favicon_lmp_32.png" type="image/png">',
  
  // 1. Define Pages to control Sidebar Names
  pages: [
    {
      name: "Build A Filter", 
      path: "/picker"
    }
  ],

  // 2. Proxy API requests to backend
  proxy: {
    "/api": {
      target: process.env.BACKEND_URL || "http://127.0.0.1:8000",
      changeOrigin: true
    }
  }
};
