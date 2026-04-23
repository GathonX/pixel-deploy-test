// react-frontend/eslint.config.js - VERSION FLEXIBLE POUR DÉVELOPPEMENT
// ✅ PHASE 5.2 : Configuration assouplie pour éliminer les warnings ESLint gênants

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      
      // ✅ RÈGLES ASSOUPLIES POUR LE DÉVELOPPEMENT
      "@typescript-eslint/no-unused-vars": "warn", // Warning au lieu d'erreur
      "@typescript-eslint/prefer-as-const": "warn",
      "@typescript-eslint/no-explicit-any": "warn", // Permet 'any' avec warning
      
      // ✅ RÈGLES REACT FLEXIBLES
      "react-hooks/exhaustive-deps": "warn", // Warning au lieu d'erreur
      
      // ✅ RÈGLES GÉNÉRALES PERMISSIVES
      "no-console": "off", // Permet console.log sans warning
      "prefer-const": "warn",
      "no-var": "warn",
      
      // ✅ RULES SPÉCIFIQUES POUR NOS BESOINS
      "@typescript-eslint/no-empty-function": "off", // Permet les fonctions vides
      "@typescript-eslint/ban-ts-comment": "warn", // Permet @ts-ignore avec warning
      "react-hooks/rules-of-hooks": "error", // Garde cette règle importante
    },
  }
);