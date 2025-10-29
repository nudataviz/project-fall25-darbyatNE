// src/data/loader.js

export function load() {
  // This message will appear in your VS Code TERMINAL if the file runs.
  console.log("--- SERVER LOG: loader.js is being executed! ---");
  
  return {
    message: "Success! Data from loader.js has been loaded.",
    timestamp: new Date()
  };
}
