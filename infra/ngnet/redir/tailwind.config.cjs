/** @type {import('tailwindcss').Config}*/
const defaultTheme = require('tailwindcss/defaultTheme')
const config = {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}",
    "./node_modules/@nng-org/ui-common/src/**/*.{html,js,svelte,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd", "400": "#60a5fa", "500": "#3b82f6", "600": "#1E88E5", "700": "#4972A5", "800": "#1e40af", "900": "#1e3a8a" }
      },
    },
    screens: {
      'xxs': '400px',
      'xs': '500px',
      ...defaultTheme.screens,
      
      'tall': { 'raw': '(min-height: 450px)' },
      'tall-xxs': { 'raw': '(min-height: 360px)' },
      'tall-xs': { 'raw': '(min-height: 480px)' },
      'tall-sm': { 'raw': '(min-height: 640px)' },
      'tall-md': { 'raw': '(min-height: 800px)' },
      'tall-l': { 'raw': '(min-height: 1000px)' },
      'tall-xl': { 'raw': '(min-height: 1200px)' },
      'tall-xxl': { 'raw': '(min-height: 1400px)' },
    },
  },

  plugins: [
    require('flowbite/plugin'),
    require('@tailwindcss/typography')
  ],
  darkMode: 'selector',
};

module.exports = config;
