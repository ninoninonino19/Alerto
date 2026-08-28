import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/*
  The rule set that would have caught this project's own bugs.

  Two of the defects fixed here were silent. A Tailwind class renamed in v4
  generated no CSS at all, and the search results were options wrapped in plain
  divs, which is not a listbox. Neither produced an error anywhere; both were
  found by reading. Lint is here for that class of failure, not for style —
  Prettier owns style, and the two do not overlap.

  eslint-config-next ships flat config arrays directly, so they are spread
  rather than routed through FlatCompat, which cannot serialise them.
*/
const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "*.cjs", "rm.tmp"] },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    rules: {
      // ARIA correctness. The grouped listbox is exactly the shape these catch
      // when it goes wrong.
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/no-redundant-roles": "error",

      // A control the pointer can reach and the keyboard cannot is the failure
      // an entire pass of this session went into removing.
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/click-events-have-key-events": "error",

      // Unused code is drift. The underscore escape hatch keeps intent visible.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
