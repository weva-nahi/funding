import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

export default tseslint.config({
  languageOptions: { globals: globals.browser },
  extends: [
    ...tseslint.configs.recommended,
    pluginReactConfig,
  ],
  rules: {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-require-imports": "off",
    "react/no-unescaped-entities": "off"
  }
});
