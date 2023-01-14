# dedent: removes indentation of template string literal

... and nothing extra!

```javascript
const mdDoc = dedent`
  ## Hello!

  - Plants
    - Apples
    - Oranges
  - Animals
    - Dogs
    - Cats
`;
```

## Features

- Removes indentation of a template literal.
- Removes the first empty line, if any.
- Has consistent behavior for escapes and substitutions.
- Supports transforming tagged template literals too.
- Supports TypeScript.
- Supports Node.js ES Modules.
- Has opt-in static transformation via Babel and SWC (to be implemented).

## Installation

To be released
