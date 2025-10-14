/** @type {import('tailwindcss').Config}*/
const config = {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}",
  ],

  theme: {
    extend: {
      colors: {
        primary: { "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd", "400": "#60a5fa", "500": "#3b82f6", "600": "#1E88E5", "700": "#4972A5", "800": "#1e40af", "900": "#1e3a8a" }
      }
    },
  },

  plugins: [
    require('flowbite/plugin')
  ],
  darkMode: 'selector',
};

module.exports = config;
