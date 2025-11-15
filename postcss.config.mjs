const config = {
  plugins: [
    [
      "@tailwindcss/postcss",
      {
        // Suppress warnings for new TailwindCSS 4 at-rules
        unknownAtRules: "ignore",
      },
    ],
  ],
};

export default config;
