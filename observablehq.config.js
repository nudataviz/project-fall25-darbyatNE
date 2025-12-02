// See https://observablehq.com/framework/config
// Observable Framework configuration

export default {
  title: "PJM LMP Visualization",
  head: `
        <link rel="icon" href="/img/favicon_lmp_32.png" type="image/png">
        <meta property="og:image" content="/img/observable.png">
        `,
        
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
